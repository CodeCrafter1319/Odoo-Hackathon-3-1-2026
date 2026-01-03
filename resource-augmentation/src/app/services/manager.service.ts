import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, of, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ManagerService {
  private readonly API_URL = `${environment.apiUrl}/manager`;
  private refreshNeeded = new Subject<void>();
  refreshNeeded$ = this.refreshNeeded.asObservable();
  constructor(private http: HttpClient) {}
  getManagerDashboardStats(): Observable<any> {
    return this.http.get(`${this.API_URL}/dashboard-stats`).pipe(
      catchError((error) => {
        console.error('Get manager dashboard stats error:', error);
        return of({
          success: false,
          message: 'Failed to load dashboard stats',
          data: {},
        });
      })
    );
  }

  getTeamMembers(): Observable<any> {
    return this.http.get(`${this.API_URL}/team-members`).pipe(
      catchError((error) => {
        console.error('Get team members error:', error);
        return of({
          success: false,
          message: 'Failed to load team members',
          data: [],
        });
      })
    );
  }
}
