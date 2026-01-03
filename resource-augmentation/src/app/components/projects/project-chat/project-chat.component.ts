// src/app/components/shared/project-chat/project-chat.component.ts

import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  ChatMessage,
  WebsocketService,
} from '../../../services/websocket.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../../services/storage.service';

@Component({
  selector: 'app-project-chat',
  standalone: true,
  templateUrl: './project-chat.component.html',
  styleUrls: ['./project-chat.component.css'],
  imports: [CommonModule, FormsModule],
})
export class ProjectChatComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  @Input() projectId!: number;
  @Input() projectMembers: any[] = [];
  @Output() closeChat = new EventEmitter<void>();

  @ViewChild('chatMessages') chatMessagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = '';
  mentionedUsers: number[] = [];
  showMentionDropdown = false;
  filteredMembers: any[] = [];
  typingUsers: string[] = [];
  currentUserId: number | null = null;
  currentUserName: string = '';
  loading = true;
  connected = false;

  private typingTimeout: any;
  private subscriptions: Subscription[] = [];
  private shouldScrollToBottom = false;
  private loadingTimeout: any;

  constructor(
    public wsService: WebsocketService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.storageService.getUserId();

    // Get current user name
    const firstName = this.storageService.getItem('firstName') || '';
    const lastName = this.storageService.getItem('lastName') || '';
    this.currentUserName = `${firstName} ${lastName}`.trim() || 'You';

    console.log('💬 Chat component initialized for project:', this.projectId);
    console.log(
      '👤 Current user:',
      this.currentUserName,
      'ID:',
      this.currentUserId
    );

    // Set timeout to stop loading after 5 seconds if no response
    this.loadingTimeout = setTimeout(() => {
      if (this.loading) {
        console.log('⏱️ Loading timeout - assuming empty chat');
        this.loading = false;
      }
    }, 5000);

    // Initialize all subscriptions
    this.setupConnectionListener();
    this.setupChatHistoryListener();
    this.setupNewMessageListener();
    this.setupTypingIndicator();
    this.setupErrorHandler();
  }

  /**
   * Setup connection status listener and join project when connected
   */
  private setupConnectionListener(): void {
    this.subscriptions.push(
      this.wsService.isConnected$.subscribe((connected) => {
        this.connected = connected;
        console.log('🔌 WebSocket connection status:', connected);

        if (connected && this.projectId) {
          // Join project room immediately when connected
          console.log('🔗 Joining project room:', this.projectId);
          this.wsService.joinProject(this.projectId);
        }
      })
    );
  }

  /**
   * Setup chat history listener to load existing messages
   */
  private setupChatHistoryListener(): void {
    this.subscriptions.push(
      // ✅ Use the new project-specific method
      this.wsService
        .getChatHistoryForProject(this.projectId)
        .subscribe((history) => {
          console.log(
            '📜 Chat history received:',
            history.length,
            'messages for project',
            this.projectId
          );

          // Clear loading timeout
          if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
          }

          // Messages are already filtered by project
          this.messages = history;
          console.log(
            `✅ Loaded ${this.messages.length} messages for project ${this.projectId}`
          );

          this.loading = false;
          this.shouldScrollToBottom = true;

          if (this.messages.length === 0) {
            console.log('💬 No messages found for this project');
          }
        })
    );
  }

  /**
   * Setup new message listener for real-time updates
   */
  private setupNewMessageListener(): void {
    this.subscriptions.push(
      this.wsService.newMessage.subscribe((message) => {
        console.log('💬 New message received:', message);

        // Convert both to numbers for comparison
        const messageProjectId = Number(message.projectId);
        const currentProjectId = Number(this.projectId);

        // Only add messages for this project
        if (message && messageProjectId === currentProjectId) {
          // Avoid duplicates
          const exists = this.messages.find((m) => m.id === message.id);
          if (!exists) {
            console.log('➕ Adding new message to UI');
            this.messages.push(message);
            this.shouldScrollToBottom = true;
          } else {
            console.log('⚠️ Duplicate message detected, skipping');
          }
        } else {
          console.log(
            `⚠️ Message for different project (${messageProjectId} vs ${currentProjectId}), ignoring`
          );
        }
      })
    );
  }

  /**
   * Setup typing indicator listener
   */
  private setupTypingIndicator(): void {
    this.subscriptions.push(
      this.wsService.userTyping.subscribe((data) => {
        if (data && Number(data.projectId) === Number(this.projectId)) {
          if (!this.typingUsers.includes(data.userName)) {
            this.typingUsers.push(data.userName);

            // Auto-remove after 3 seconds
            setTimeout(() => {
              this.typingUsers = this.typingUsers.filter(
                (u) => u !== data.userName
              );
            }, 3000);
          }
        }
      })
    );

    this.subscriptions.push(
      this.wsService.userStopTyping.subscribe((data) => {
        if (data && Number(data.projectId) === Number(this.projectId)) {
          if (this.typingUsers.length > 0) {
            this.typingUsers = [];
          }
        }
      })
    );
  }

  /**
   * Setup error handler
   */
  private setupErrorHandler(): void {
    this.subscriptions.push(
      this.wsService.error.subscribe((error) => {
        console.error('❌ Chat error:', error.message);
        this.loading = false;
      })
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  onClose(): void {
    this.closeChat.emit();
  }

  onMessageInput(): void {
    // Handle @ mentions
    const lastAtIndex = this.newMessage.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const searchTerm = this.newMessage
        .substring(lastAtIndex + 1)
        .toLowerCase();
      this.filteredMembers = this.projectMembers.filter(
        (m) => m.name && m.name.toLowerCase().includes(searchTerm)
      );
      this.showMentionDropdown = this.filteredMembers.length > 0;
    } else {
      this.showMentionDropdown = false;
    }

    // Typing indicator
    this.wsService.startTyping(this.projectId);
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.wsService.stopTyping(this.projectId);
    }, 1000);
  }

  selectMention(member: any): void {
    const lastAtIndex = this.newMessage.lastIndexOf('@');
    this.newMessage =
      this.newMessage.substring(0, lastAtIndex) + `@${member.name} `;
    if (!this.mentionedUsers.includes(member.id)) {
      this.mentionedUsers.push(member.id);
    }
    this.showMentionDropdown = false;
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) {
      console.log('⚠️ Message is empty, not sending');
      return;
    }

    if (!this.connected) {
      console.error('❌ Not connected to chat server');
      alert('Not connected to chat server. Please refresh the page.');
      return;
    }

    console.log('📤 Sending message:', {
      projectId: this.projectId,
      message: this.newMessage,
      mentions: this.mentionedUsers,
    });

    // Send message via WebSocket
    this.wsService.sendMessage(
      this.projectId,
      this.newMessage,
      this.mentionedUsers
    );

    // Clear input
    this.newMessage = '';
    this.mentionedUsers = [];
    this.wsService.stopTyping(this.projectId);

    console.log('✅ Message sent, input cleared');
  }

  formatMessage(message: string): string {
    if (!message) return '';
    // You can add additional formatting here (e.g., markdown, links)
    return message.replace(/@([\w\s]+)/g, '<span class="mention">@$1</span>');
  }

  replyToMessage(message: ChatMessage): void {
    if (!message.userName) return;
    this.newMessage = `@${message.userName} `;
    if (message.userId && !this.mentionedUsers.includes(message.userId)) {
      this.mentionedUsers.push(message.userId);
    }

    // Focus textarea after a short delay
    setTimeout(() => {
      const textarea = document.querySelector(
        '.input-wrapper textarea'
      ) as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  }

  isMyMessage(message: ChatMessage): boolean {
    return message.userId === this.currentUserId;
  }

  formatTime(timestamp: Date | string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.chatMessagesContainer) {
        const element = this.chatMessagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }

  ngOnDestroy(): void {
    console.log(
      '🔌 Chat component destroyed, leaving project:',
      this.projectId
    );

    // Leave project room
    this.wsService.leaveProject(this.projectId);

    // Unsubscribe from all subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());

    // Clear timeouts
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }
  }
}
