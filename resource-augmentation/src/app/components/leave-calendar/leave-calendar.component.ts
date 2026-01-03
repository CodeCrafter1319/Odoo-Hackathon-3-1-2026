// components/leave-calendar/leave-calendar.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import {
  CalendarEvent,
  CalendarEventTimesChangedEvent,
  CalendarView,
  CalendarModule,
  DateAdapter,
  CalendarDateFormatter,
  CalendarEventTitleFormatter,
  CalendarUtils,
  CalendarA11y,
} from 'angular-calendar';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  FlatpickrDirective,
  provideFlatpickrDefaults,
} from 'angularx-flatpickr';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { isSameDay, isSameMonth } from 'date-fns';
import { FilterOptions, LeaveCalendarDataService } from '../../services/leave-calendar.service';

@Component({
  selector: 'app-leave-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CalendarModule,
  ],
  providers: [
    provideFlatpickrDefaults(),
    {
      provide: DateAdapter,
      useFactory: adapterFactory,
    },
    CalendarDateFormatter,
    CalendarEventTitleFormatter,
    CalendarUtils,
    CalendarA11y,
  ],
  templateUrl: './leave-calendar.component.html',
  styleUrls: ['./leave-calendar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveCalendarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private dataService = inject(LeaveCalendarDataService);

  // Calendar properties
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  viewDate: Date = new Date();
  refresh = new Subject<void>();
  activeDayIsOpen: boolean = false;

  // Data from service
  events: CalendarEvent[] = [];
  isLoading = false;
  errorMessage = '';

  // Filter options
  selectedLeaveType = 'ALL';
  selectedStatus = 'ALL';
  selectedEmployee = 'ALL';
  
  filterOptions: FilterOptions = { leaveTypes: [], employees: [] };

  ngOnInit(): void {
    console.log('LeaveCalendarComponent: Initializing...');
    this.subscribeToDataService();
    this.dataService.loadLeaveApplications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Subscribe to data service observables
   */
  private subscribeToDataService(): void {
    // Subscribe to calendar events
    this.dataService.calendarEvents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(events => {
        console.log('LeaveCalendarComponent: Received calendar events', events.length);
        this.events = events;
        this.refresh.next();
        this.cdr.detectChanges();
      });

    // Subscribe to loading state
    this.dataService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
        this.cdr.detectChanges();
      });

    // Subscribe to error state
    this.dataService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.errorMessage = error;
        this.cdr.detectChanges();
      });

    // Subscribe to filter options
    this.dataService.filterOptions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => {
        this.filterOptions = options;
        this.cdr.detectChanges();
      });
  }

  // Calendar event handlers
  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
    if (isSameMonth(date, this.viewDate)) {
      if (
        (isSameDay(this.viewDate, date) && this.activeDayIsOpen === true) ||
        events.length === 0
      ) {
        this.activeDayIsOpen = false;
      } else {
        this.activeDayIsOpen = true;
      }
      this.viewDate = date;
    }
  }

  handleEvent(action: string, event: CalendarEvent): void {
    console.log('Event clicked:', event.title);
    // You can add custom logic here for handling event clicks
  }

  eventTimesChanged({
    event,
    newStart,
    newEnd,
  }: CalendarEventTimesChangedEvent): void {
    this.events = this.events.map((iEvent) => {
      if (iEvent === event) {
        return {
          ...event,
          start: newStart,
          end: newEnd,
        };
      }
      return iEvent;
    });
    this.refresh.next();
  }

  setView(view: CalendarView): void {
    this.view = view;
    this.cdr.detectChanges();
  }

  closeOpenMonthViewDay(): void {
    this.activeDayIsOpen = false;
  }

  // Filter methods - delegate to service
  onFilterChange(): void {
    console.log('LeaveCalendarComponent: Filter changed');
    this.dataService.filterApplications(
      this.selectedLeaveType,
      this.selectedStatus,
      this.selectedEmployee
    );
  }

  clearFilters(): void {
    console.log('LeaveCalendarComponent: Clearing filters');
    this.selectedLeaveType = 'ALL';
    this.selectedStatus = 'ALL';
    this.selectedEmployee = 'ALL';
    this.dataService.clearAllFilters();
  }

  refreshData(): void {
    console.log('LeaveCalendarComponent: Refreshing data');
    this.dataService.refreshData();
  }

  // Utility methods - delegate to service
  formatDate(date: string): string {
    return this.dataService.formatDate(date);
  }

  getStatusBadgeClass(status: string): string {
    return this.dataService.getStatusBadgeClass(status);
  }
}
