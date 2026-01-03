// services/storage.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private isStorageAvailable(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // Get token
  getToken(): string | null {
    const token = this.getItem('auth_token');
    console.log(
      'StorageService.getToken():',
      token ? 'Token exists' : 'No token'
    );
    return token;
  }

  // Set token
  setToken(token: string): void {
    console.log(
      'StorageService.setToken():',
      token ? 'Setting token' : 'Empty token'
    );
    this.setItem('auth_token', token);
  }

  // Remove token
  removeToken(): void {
    console.log('StorageService.removeToken()');
    this.removeItem('auth_token');
  }

  // Basic storage methods
  getItem(key: string): string | null {
    if (!this.isStorageAvailable()) {
      return null;
    }
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage getItem failed:', error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (!this.isStorageAvailable()) {
      console.warn('localStorage not available');
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('localStorage setItem failed:', error);
    }
  }

  removeItem(key: string): void {
    if (!this.isStorageAvailable()) {
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('localStorage removeItem failed:', error);
    }
  }
  decodeToken(token: string): any | null {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (error) {
      console.warn('Failed to decode token:', error);
      return null;
    }
  }
  clear(): void {
    if (!this.isStorageAvailable()) {
      return;
    }
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('localStorage clear failed:', error);
    }
  }

  // Object methods
  setObject(key: string, value: any): void {
    try {
      const jsonValue = JSON.stringify(value);
      this.setItem(key, jsonValue);
    } catch (error) {
      console.warn('Failed to stringify object:', error);
    }
  }

  getObject<T>(key: string): T | null {
    const item = this.getItem(key);
    if (!item) {
      return null;
    }
    try {
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn('Failed to parse JSON:', error);
      return null;
    }
  }

  // User methods
  getCurrentUser(): any | null {
    return this.getObject('currentUser');
  }

  setCurrentUser(user: any): void {
    this.setObject('currentUser', user);
  }

  removeCurrentUser(): void {
    this.removeItem('currentUser');
  }

  getUserRole(): string | null {
    let role: string | null = null;
    const user = this.getCurrentUser();
    if (user) {
      role = user.role || user.Role || null;
    }
    if (!role) {
      const token = this.getToken();
      if (token) {
        const payload = this.decodeToken(token);
        role = payload?.role || payload?.Role || null;
      }
    }
    return role;
  }

  getUserId(): number | null {
    const user = this.getCurrentUser();
    return user?.id || null;
  }

  // Session management
  clearSession(): void {
    this.removeToken();
    this.removeCurrentUser();
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  hasKey(key: string): boolean {
    return this.getItem(key) !== null;
  }

  getAllKeys(): string[] {
    if (!this.isStorageAvailable()) {
      return [];
    }
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.warn('Failed to get localStorage keys:', error);
      return [];
    }
  }
}
