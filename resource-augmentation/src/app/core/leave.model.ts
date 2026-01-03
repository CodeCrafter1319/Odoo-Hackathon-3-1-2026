export interface LeaveApplication {
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  reason: string;
  leaveDays: LeaveDay[];
  halfDay?: boolean;
  allowUnpaidLeaves?: boolean;
}

export interface LeaveDay {
  date: string;
  isHalfDay: boolean;
  halfDayType?: 'MORNING' | 'AFTERNOON' | null;
  isPaid?: boolean;
  payStatus?: 'PAID' | 'UNPAID';
}

export interface LeaveBalance {
  leaveTypeId: number;
  leaveTypeName: string;
  totalAllocated: number;
  usedDays: number;
  availableDays: number;
  carriedForward: number;
  year: number;
  unPaidDaysTaken?: number;
}

export interface LeaveType {
  Id: number;
  Name: string;
  Code: string;
  MaxDaysPerYear: number;
  MinDays: number;
  MaxDays: number;
  ApplicableGenders?: string[];
}
export interface LeaveApplicationResponse {
  success: boolean;
  data: {
    applicationId: number;
    message: string;
    paymentDetails?: {
      requestedDays: number;
      paidDays: number;
      unpaidDays: number;
      availableBalance: number;
      isPartiallyUnpaid: boolean;
    };
  };
}
