// HR & Location Management Types

export interface Country {
  id: number;
  name: string;
  code: string;
  phoneCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Region {
  id: number;
  countryId: number;
  countryName?: string;
  name: string;
  code?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface City {
  id: number;
  regionId: number;
  regionName?: string;
  countryId: number;
  countryName?: string;
  name: string;
  code?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Shift {
  id: number;
  title: string;
  startTime: string;
  lateStartTime: string;
  earlyGoTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Designation {
  id: number;
  name: string;
  code?: string;
  departmentId?: number;
  departmentName?: string;
  level: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Department {
  id: number;
  name: string;
  code?: string;
  description?: string;
  headUserId?: number;
  headUserName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Employee {
  id: number;
  userId: number;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  designationId?: number;
  designationName?: string;
  departmentId?: number;
  departmentName?: string;
  reportingManagerId?: number;
  reportingManagerName?: string;
  countryId?: number;
  countryName?: string;
  regionId?: number;
  regionName?: string;
  cityId?: number;
  cityName?: string;
  shiftId?: number;
  shiftTitle?: string;
  joinDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeName?: string;
  employeeCode?: string;
  departmentId?: number;
  departmentName?: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  workingHours?: number;
  breakHours?: number;
  status: 'Present' | 'Late' | 'Absent' | 'HalfDay' | 'OnLeave' | 'Holiday';
  isLate: boolean;
  lateMinutes?: number;
  isMissingCheckIn: boolean;
  isMissingCheckOut: boolean;
  remarks?: string;
  selfieUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AttendanceConfig {
  id: number;
  officeStartTime: string;
  officeEndTime: string;
  gracePeriodMinutes: number;
  lateThresholdMinutes: number;
  minimumWorkingHours: number;
  halfDayHours: number;
  isFlexibleTiming: boolean;
  workingDays: number[]; // 0=Sunday, 1=Monday, etc.
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalHierarchy {
  id: number;
  name: string;
  description?: string;
  departmentId?: number;
  departmentName?: string;
  level: number;
  approverDesignationId?: number;
  approverDesignationName?: string;
  approverUserId?: number;
  approverUserName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ApprovalRequest {
  id: number;
  requestId: string;
  requestType: 'Leave' | 'AttendanceRegularization' | 'Expense' | 'HR' | 'Other';
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  departmentId?: number;
  departmentName?: string;
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  currentLevel: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Escalated' | 'Cancelled';
  approvedBy?: number;
  approvedByName?: string;
  approvalRemarks?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ApprovalHistory {
  id: number;
  requestId: number;
  level: number;
  approverId: number;
  approverName: string;
  approverDesignation?: string;
  action: 'Approved' | 'Rejected' | 'Escalated';
  remarks?: string;
  createdAt: string;
}

export interface LocationHierarchy {
  countryId: number;
  countryName: string;
  regions: {
    regionId: number;
    regionName: string;
    cities: {
      cityId: number;
      cityName: string;
    }[];
  }[];
}

export interface AttendanceSummary {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  departmentName?: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  halfDayDays: number;
  attendancePercentage: number;
  totalWorkingHours: number;
  averageWorkingHours: number;
}

export interface DailyAttendanceStats {
  date: string;
  totalEmployees: number;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  halfDay: number;
  attendancePercentage: number;
}
