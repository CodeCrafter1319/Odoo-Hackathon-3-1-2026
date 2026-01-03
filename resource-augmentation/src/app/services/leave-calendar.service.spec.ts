import { TestBed } from '@angular/core/testing';

import { LeaveCalendarService } from './leave-calendar.service';

describe('LeaveCalendarService', () => {
  let service: LeaveCalendarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LeaveCalendarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
