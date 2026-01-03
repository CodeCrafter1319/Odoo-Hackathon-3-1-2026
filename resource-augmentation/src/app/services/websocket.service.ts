// src/app/services/websocket.service.ts

import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  map,
  Observable,
  of,
  Subject,
} from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { StorageService } from './storage.service';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { profileEnd } from 'console';
import { response } from 'express';

export interface ChatMessage {
  id: number;
  projectId: number;
  userId: number;
  userName: string;
  userRole: string;
  message: string;
  mentionedUsers: number[];
  timestamp: Date;
  isEdited: boolean;
}
export interface UnreadCountResponse {
  success: boolean;
  projectId: number;
  unreadCount: number;
  message?: string;
}
@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private socket!: Socket;
  private connected$ = new BehaviorSubject<boolean>(false);

  // Chat subjects - store per project
  private newMessage$ = new Subject<ChatMessage>();
  private chatHistoryByProject$ = new Map<
    number,
    BehaviorSubject<ChatMessage[]>
  >();
  private unreadCountByProject$ = new Map<number, BehaviorSubject<number>>();
  private userTyping$ = new Subject<{
    userId: number;
    userName: string;
    projectId: number;
  }>();

  private userStopTyping$ = new Subject<{
    userId: number;
    projectId: number;
  }>();

  private onlineUsers$ = new BehaviorSubject<any[]>([]);
  private userJoined$ = new Subject<{
    userId: number;
    userName: string;
    userRole: string;
  }>();

  private userLeft$ = new Subject<{ userId: number; userName: string }>();
  private error$ = new Subject<{ message: string }>();
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';
  constructor(
    private storageService: StorageService,
    private http: HttpClient
  ) {
    this.connect();
  }

  connect(): void {
    const token = this.storageService.getToken();
    if (!token) {
      console.error('❌ No authentication token found');
      return;
    }

    this.socket = io(environment.socketUrl || 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.connected$.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      this.connected$.next(false);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ WebSocket connection error:', error);
      if (error.message === 'Authentication error') {
        this.disconnect();
      }
    });

    this.socket.on('chat:history', (history: any[]) => {
      console.log('📜 Received chat history:', history.length, 'messages');

      const normalizedHistory = history.map((msg) =>
        this.normalizeMessage(msg)
      );
      const messagesByProject = new Map<number, ChatMessage[]>();

      normalizedHistory.forEach((msg) => {
        if (msg.projectId !== undefined && msg.projectId !== null) {
          const projectId = Number(msg.projectId);
          if (!messagesByProject.has(projectId)) {
            messagesByProject.set(projectId, []);
          }
          messagesByProject.get(projectId)!.push(msg);
        }
      });

      messagesByProject.forEach((messages, projectId) => {
        console.log(
          `📦 Storing ${messages.length} messages for project ${projectId}`
        );
        this.getOrCreateProjectHistory(projectId).next(messages);
      });
    });

    this.socket.on('chat:new_message', (message: any) => {
      const normalizedMessage = this.normalizeMessage(message);
      console.log('💬 New message normalized:', normalizedMessage);

      if (
        normalizedMessage.projectId === undefined ||
        normalizedMessage.projectId === null
      ) {
        console.error('❌ Message without projectId:', normalizedMessage);
        return;
      }

      this.newMessage$.next(normalizedMessage);

      const projectId = Number(normalizedMessage.projectId);
      const currentHistory = this.getOrCreateProjectHistory(projectId).value;
      const exists = currentHistory.find((m) => m.id === normalizedMessage.id);

      if (!exists) {
        this.getOrCreateProjectHistory(projectId).next([
          ...currentHistory,
          normalizedMessage,
        ]);
        this.getUnreadCountForProject(projectId);
      }
    });

    this.socket.on('chat:user_typing', (data: any) => {
      this.userTyping$.next(data);
    });

    this.socket.on('chat:user_stop_typing', (data: any) => {
      this.userStopTyping$.next(data);
    });

    this.socket.on('project:user_joined', (data: any) => {
      console.log('👋 User joined:', data.userName);
      this.userJoined$.next(data);
    });

    this.socket.on('project:user_left', (data: any) => {
      console.log('👋 User left:', data.userName);
      this.userLeft$.next(data);
    });

    this.socket.on('project:online_users', (users: any[]) => {
      console.log('👥 Online users:', users.length);
      this.onlineUsers$.next(users);
    });

    this.socket.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
      this.error$.next(error);
    });

    this.socket.on('notification:mention', (data: any) => {
      console.log('📢 You were mentioned:', data);
    });
  }

  /**
   * Normalize message from server format (PascalCase) to client format (camelCase)
   */
  private normalizeMessage(serverMessage: any): ChatMessage {
    return {
      id: serverMessage.MessageId || serverMessage.id,
      projectId: serverMessage.ProjectId || serverMessage.projectId,
      userId: serverMessage.UserId || serverMessage.userId,
      userName:
        serverMessage.userName ||
        `${serverMessage.FirstName || ''} ${
          serverMessage.LastName || ''
        }`.trim() ||
        'Unknown User',
      userRole: serverMessage.Role || serverMessage.userRole || 'USER',
      message: serverMessage.Message || serverMessage.message || '',
      mentionedUsers: this.parseMentionedUsers(
        serverMessage.MentionedUsers || serverMessage.mentionedUsers
      ),
      timestamp: new Date(
        serverMessage.CreatedAt || serverMessage.timestamp || Date.now()
      ),
      isEdited: Boolean(serverMessage.IsEdited || serverMessage.isEdited),
    };
  }

  private parseMentionedUsers(mentionedUsers: any): number[] {
    if (!mentionedUsers) return [];
    if (Array.isArray(mentionedUsers)) return mentionedUsers;

    if (typeof mentionedUsers === 'string') {
      try {
        const parsed = JSON.parse(mentionedUsers);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }

    return [];
  }

  private getOrCreateProjectHistory(
    projectId: number
  ): BehaviorSubject<ChatMessage[]> {
    if (!this.chatHistoryByProject$.has(projectId)) {
      this.chatHistoryByProject$.set(
        projectId,
        new BehaviorSubject<ChatMessage[]>([])
      );
    }
    return this.chatHistoryByProject$.get(projectId)!;
  }

  getChatHistoryForProject(projectId: number): Observable<ChatMessage[]> {
    return this.getOrCreateProjectHistory(projectId).asObservable();
  }

  joinProject(projectId: number): void {
    if (!this.socket) {
      console.error('❌ Socket not connected');
      return;
    }
    console.log('🔗 Joining project:', projectId);
    this.socket.emit('project:join', projectId);
  }

  leaveProject(projectId: number): void {
    if (!this.socket) return;
    console.log('🔌 Leaving project:', projectId);
    this.socket.emit('project:leave', projectId);
  }

  sendMessage(
    projectId: number,
    message: string,
    mentions: number[] = []
  ): void {
    if (!this.socket) {
      console.error('❌ Socket not connected');
      return;
    }
    console.log('📤 Sending message:', { projectId, message, mentions });
    this.socket.emit('chat:send_message', { projectId, message, mentions });
  }

  startTyping(projectId: number): void {
    if (!this.socket) return;
    this.socket.emit('chat:typing', { projectId });
  }

  stopTyping(projectId: number): void {
    if (!this.socket) return;
    this.socket.emit('chat:stop_typing', { projectId });
  }
  private getOrCreateUnreadCount(projectId: number): BehaviorSubject<number> {
    if (!this.unreadCountByProject$.has(projectId)) {
      this.unreadCountByProject$.set(projectId, new BehaviorSubject<number>(0));
    }
    return this.unreadCountByProject$.get(projectId)!;
  }
  getUnreadCountForProject(projectId: number): Observable<number> {
    return this.getOrCreateUnreadCount(projectId).asObservable();
  }
 fetchUnreadCount(projectId: number): Observable<UnreadCountResponse> {
  const token = this.storageService.getToken();
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const url = `${this.apiUrl}/chat/projects/${projectId}/unread-count`;

  return this.http.get<UnreadCountResponse>(url, { 
    headers,
    responseType: 'json'
  }).pipe(
    map((response: UnreadCountResponse) => {
      if (response && response.success) {
        this.getOrCreateUnreadCount(projectId).next(response.unreadCount || 0);
      }
      
      return response;
    }),
    catchError((error) => {
      console.error('❌ Error fetching unread count:', error);
      this.getOrCreateUnreadCount(projectId).next(0);
      
      return of({
        success: false,
        projectId: projectId,
        unreadCount: 0,
        message: error.message || 'Failed to fetch unread count'
      });
    })
  );
}
  incrementUnreadCount(projectId: number): void {
    const currentCount = this.getOrCreateUnreadCount(projectId).value;
    this.getOrCreateUnreadCount(projectId).next(currentCount + 1);
  }
  resetUnreadCount(projectId: number): void {
    this.getOrCreateUnreadCount(projectId).next(0);
  }
  markChatAsRead(projectId: number): Observable<any> {
    const token = this.storageService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    const url = `${this.apiUrl}/chat/projects/${projectId}/mark-as-read`;

    return this.http.post(url, {}, { headers }).pipe(
      map((response: any) => {
        console.log('✅ Mark as read response:', response);
        return response;
      }),
      catchError((error) => {
        console.error('❌ Error marking as read:', error);
        return of({ success: false, message: 'Failed to mark as read' });
      })
    );
  }
  get isConnected$(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  get newMessage(): Observable<ChatMessage> {
    return this.newMessage$.asObservable();
  }

  get userTyping(): Observable<{
    userId: number;
    userName: string;
    projectId: number;
  }> {
    return this.userTyping$.asObservable();
  }

  get userStopTyping(): Observable<{ userId: number; projectId: number }> {
    return this.userStopTyping$.asObservable();
  }

  get onlineUsers(): Observable<any[]> {
    return this.onlineUsers$.asObservable();
  }

  get userJoined(): Observable<{
    userId: number;
    userName: string;
    userRole: string;
  }> {
    return this.userJoined$.asObservable();
  }

  get userLeft(): Observable<{ userId: number; userName: string }> {
    return this.userLeft$.asObservable();
  }

  get error(): Observable<{ message: string }> {
    return this.error$.asObservable();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.connected$.next(false);
    }
  }
}
