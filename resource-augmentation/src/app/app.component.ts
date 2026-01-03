import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { WebsocketService } from './services/websocket.service';
import { AuthService } from './services/auth.service';
import { StorageService } from './services/storage.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'resource-augmentation';
  constructor(
    private wsService: WebsocketService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    // Connect to WebSocket if user is authenticated
    if (this.storageService.getToken()) {
      this.wsService.connect();
    }
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
  }
}
