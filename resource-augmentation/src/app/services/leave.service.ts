import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LeaveApplication } from '../core/leave.model';
import { Observable, Subject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LeaveService {
  private readonly API_URL = `${environment.apiUrl}/leave`;

  private refreshNeeded = new Subject<void>();
  refreshNeeded$ = this.refreshNeeded.asObservable()
  constructor(private http: HttpClient) {}

 applyLeave(leaveData: LeaveApplication): Observable<any> {
  console.log('Sending leave data:', leaveData); // Debug log
  
  return this.http.post(`${this.API_URL}/apply`, leaveData, {
    headers: {
      'Content-Type': 'application/json'
    }
  }).pipe(
    tap((response:any) => {
      if(response.data?.emailSent !==undefined){
        console.log(`Email sent status: ${response.data.emailSent ? 'Sent' : 'Not Sent'}`); // Log email sent status
      }
      this.refreshNeeded.next();
    }),
    catchError(error => {
      console.error('Apply leave error:', error);
      console.error('Error response:', error.error); // Log actual response
      return of({ success: false, message: error.error?.message || 'Failed to apply for leave' });
    })
  );
}


  getMyApplications(): Observable<any> {
    return this.http.get(`${this.API_URL}/my-applications`).pipe(
      catchError(error => {
        console.error('Get my applications error:', error);
        return of({ success: false, message: 'Failed to load applications', data: [] });
      })
    );
  }

  getLeaveBalance(): Observable<any> {
    return this.http.get(`${this.API_URL}/balance`).pipe(
      catchError(error => {
        console.error('Get leave balance error:', error);
        return of({ success: false, message: 'Failed to load balance', data: [] });
      })
    );
  }

  getLeaveTypes(): Observable<any> {
    return this.http.get(`${this.API_URL}/types`).pipe(
      catchError(error => {
        console.error('Get leave types error:', error);
        return of({ success: false, message: 'Failed to load leave types', data: [] });
      })
    );
  }

  getPendingApprovals(): Observable<any> {
    return this.http.get(`${this.API_URL}/pending-approvals`).pipe(
      catchError(error => {
        console.error('Get pending approvals error:', error);
        return of({ success: false, message: 'Failed to load pending approvals', data: [] });
      })
    );
  }

  getAllLeaveApplications(): Observable<any> {
    return this.http.get(`${this.API_URL}/all-applications`).pipe(
      catchError(error => {
        console.error('Get all applications error:', error);
        return of({ success: false, message: 'Failed to load applications', data: [] });
      })
    );
  }

 processLeaveAction(applicationId: number, action: string, comments?: string): Observable<any> {
    return this.http.post(`${this.API_URL}/process-action`, {
      applicationId,
      action,
      comments,
    }).pipe(
      tap((response:any) => {
        // Trigger refresh after approval/rejection
        console.log(`Leave application ${applicationId} ${action}ed.`, response);
        if(response.data?.emailSent !==undefined){
          console.log(`Email sent status: ${response.data.emailSent ? 'Sent' : 'Not Sent'}`); // Log email sent status
        }
        this.refreshNeeded.next();
      }),
      catchError(error => {
        console.error('Process leave action error:', error);
        return of({ success: false, message: error.error?.message || 'Failed to process leave action' });
      })
    );
  }
}
