// notification-bell.component.ts
import { Component, OnInit } from '@angular/core';
import { WebsocketService } from '../../services/websocket.service';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-notification-bell',
  imports: [CommonModule, DatePipe],
  template: `
    <div class="notification-bell" (click)="toggleDropdown()">
      <i class="fas fa-bell"></i>
      <span *ngIf="unreadCount > 0" class="badge">{{ unreadCount }}</span>

      <div *ngIf="showDropdown" class="notification-dropdown">
        <div
          *ngFor="let notification of notifications"
          class="notification-item"
        >
          <p>{{ notification.message }}</p>
          <small>{{ notification.timestamp | date : 'short' }}</small>
        </div>
      </div>
    </div>
  `,
})
export class NotificationBellComponent {
  notifications: any[] = [];
  unreadCount = 0;
  showDropdown = false;

  constructor(private wsService: WebsocketService) {}

  // ngOnInit(): void {
  //   this.wsService.notifications.subscribe(notification => {
  //     this.notifications.unshift(notification);
  //     this.unreadCount++;

  //     // Play notification sound
  //     this.playNotificationSound();
  //   });
  // }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      this.unreadCount = 0;
    }
  }

  private playNotificationSound(): void {
    const audio = new Audio('/assets/notification.mp3');
    audio.play().catch((e) => console.log('Audio play failed:', e));
  }
}
