// services/leave-calendar-data.service.ts
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { LeaveService } from './leave.service';
import { CalendarEvent } from 'angular-calendar';
import { EventColor } from 'calendar-utils';
import { addDays } from 'date-fns';

export interface LeaveApplication {
  Id: number;
  UserId: number;
  FirstName: string;
  LastName: string;
  LeaveTypeName: string;
  Status: string;
  FromDate: string;
  ToDate: string;
  Reason?: string;
  AppliedAt?: string;
  CalculatedDays?: number;
  TotalDays?: number;
  Department?: string;
}

export interface FilterOptions {
  leaveTypes: string[];
  employees: { id: number; name: string }[];
  departments?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class LeaveCalendarDataService {
  private leaveService = inject(LeaveService);

  // Private subjects for state management
  private _allApplications = new BehaviorSubject<LeaveApplication[]>([]);
  private _filteredApplications = new BehaviorSubject<LeaveApplication[]>([]);
  private _calendarEvents = new BehaviorSubject<CalendarEvent[]>([]);
  private _filterOptions = new BehaviorSubject<FilterOptions>({ leaveTypes: [], employees: [] });
  private _loading = new BehaviorSubject<boolean>(false);
  private _error = new BehaviorSubject<string>('');

  // Public observables
  allApplications$ = this._allApplications.asObservable();
  filteredApplications$ = this._filteredApplications.asObservable();
  calendarEvents$ = this._calendarEvents.asObservable();
  filterOptions$ = this._filterOptions.asObservable();
  loading$ = this._loading.asObservable();
  error$ = this._error.asObservable();

  // Color configuration
  private readonly colors: Record<string, EventColor> = {
    approved: { primary: '#28a745', secondary: '#d4edda' },
    pending: { primary: '#ffc107', secondary: '#fff3cd' },
    rejected: { primary: '#dc3545', secondary: '#f8d7da' },
    annual: { primary: '#007bff', secondary: '#d1ecf1' },
    sick: { primary: '#fd7e14', secondary: '#ffeaa7' },
    emergency: { primary: '#e83e8c', secondary: '#f8d7da' },
  };

  /**
   * Load all leave applications from the API
   */
  loadLeaveApplications(): void {
    console.log('LeaveCalendarDataService: Loading leave applications...');
    this._loading.next(true);
    this._error.next('');

    this.leaveService.getAllLeaveApplications().pipe(
      tap(response => {
        console.log('LeaveCalendarDataService: API response received', response);
        if (response.success) {
          this._allApplications.next(response.data);
          this._filteredApplications.next(response.data);
          this.extractFilterOptions(response.data);
          this.generateCalendarEvents(response.data);
        } else {
          this._error.next(response.message || 'Failed to load leave applications');
        }
        this._loading.next(false);
      }),
      catchError(error => {
        console.error('LeaveCalendarDataService: Error loading applications', error);
        this._error.next('Failed to load leave applications');
        this._loading.next(false);
        return throwError(error);
      })
    ).subscribe();
  }

  /**
   * Filter applications based on criteria
   */
  filterApplications(
    leaveType: string = 'ALL',
    status: string = 'ALL',
    employeeId: string = 'ALL',
    department: string = 'ALL'
  ): void {
    console.log('LeaveCalendarDataService: Applying filters', {
      leaveType, status, employeeId, department
    });

    const allApplications = this._allApplications.value;
    let filtered = [...allApplications];

    if (leaveType !== 'ALL') {
      filtered = filtered.filter(app => app.LeaveTypeName === leaveType);
    }

    if (status !== 'ALL') {
      filtered = filtered.filter(app => app.Status === status);
    }

    if (employeeId !== 'ALL') {
      filtered = filtered.filter(app => app.UserId === parseInt(employeeId));
    }

    if (department !== 'ALL') {
      filtered = filtered.filter(app => (app.Department || 'General') === department);
    }

    this._filteredApplications.next(filtered);
    this.generateCalendarEvents(filtered);
  }

  /**
   * Clear all filters and show all applications
   */
  clearAllFilters(): void {
    console.log('LeaveCalendarDataService: Clearing all filters');
    const allApplications = this._allApplications.value;
    this._filteredApplications.next(allApplications);
    this.generateCalendarEvents(allApplications);
  }

  /**
   * Refresh data from API
   */
  refreshData(): void {
    console.log('LeaveCalendarDataService: Refreshing data');
    this.loadLeaveApplications();
  }

  /**
   * Extract unique filter options from applications
   */
  private extractFilterOptions(applications: LeaveApplication[]): void {
    console.log('LeaveCalendarDataService: Extracting filter options');

    // Extract unique leave types
    const leaveTypes = [...new Set(applications.map(app => app.LeaveTypeName))].sort();

    // Extract unique employees
    const employeeMap = new Map<number, { id: number; name: string }>();
    applications.forEach(app => {
      if (!employeeMap.has(app.UserId)) {
        employeeMap.set(app.UserId, {
          id: app.UserId,
          name: `${app.FirstName} ${app.LastName}`
        });
      }
    });
    const employees = Array.from(employeeMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    // Extract unique departments (if available)
    const departments = [...new Set(applications.map(app => app.Department || 'General'))].sort();

    const filterOptions: FilterOptions = {
      leaveTypes,
      employees,
      departments
    };

    this._filterOptions.next(filterOptions);
  }

  /**
   * Generate calendar events from leave applications
   */
  private generateCalendarEvents(applications: LeaveApplication[]): void {
    console.log('LeaveCalendarDataService: Generating calendar events', applications.length);

    const events: CalendarEvent[] = applications.map(app => this.mapApplicationToCalendarEvent(app));
    this._calendarEvents.next(events);
  }

  /**
   * Map a leave application to a calendar event
   */
  private mapApplicationToCalendarEvent(application: LeaveApplication): CalendarEvent {
    const employeeName = `${application.FirstName} ${application.LastName}`;
    const leaveType = application.LeaveTypeName;
    const status = application.Status.toLowerCase();

    // Determine event color based on status and leave type
    let eventColor = this.colors['pending'];

    if (status === 'approved') {
      eventColor = this.colors['approved'];

      // Use specific colors for different leave types when approved
      if (leaveType.toLowerCase().includes('annual')) {
        eventColor = this.colors['annual'];
      } else if (leaveType.toLowerCase().includes('sick')) {
        eventColor = this.colors['sick'];
      } else if (leaveType.toLowerCase().includes('emergency')) {
        eventColor = this.colors['emergency'];
      }
    } else if (status === 'rejected') {
      eventColor = this.colors['rejected'];
    }

    return {
      id: application.Id,
      start: new Date(application.FromDate),
      end: application.ToDate 
      ? new Date(application.ToDate)  // Use exact end date
      : new Date(application.FromDate),
      title: `${employeeName} - ${leaveType} (${status.toUpperCase()})`,
      color: eventColor,
      allDay: true,
      meta: {
        application: application,
        employee: employeeName,
        leaveType: leaveType,
        status: status,
      },
    };
  }

  /**
   * Get statistics from current applications
   */
  getStatistics(): Observable<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    return this.filteredApplications$.pipe(
      // Transform the applications array into a statistics object
      map(applications => {
        const stats = {
          total: applications.length,
          pending: applications.filter(app => app.Status === 'PENDING').length,
          approved: applications.filter(app => app.Status === 'APPROVED').length,
          rejected: applications.filter(app => app.Status === 'REJECTED').length,
        };
        console.log('LeaveCalendarDataService: Statistics calculated', stats);
        return stats;
      })
    );
  }

  /**
   * Format date for display
   */
  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Get CSS class for status badge
   */
  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'badge-success';
      case 'pending':
        return 'badge-warning';
      case 'rejected':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  /**
   * Get current filter options values
   */
  getCurrentFilterOptions(): FilterOptions {
    return this._filterOptions.value;
  }

  /**
   * Get current applications
   */
  getCurrentApplications(): LeaveApplication[] {
    return this._filteredApplications.value;
  }

  /**
   * Get current calendar events
   */
  getCurrentCalendarEvents(): CalendarEvent[] {
    return this._calendarEvents.value;
  }
}
