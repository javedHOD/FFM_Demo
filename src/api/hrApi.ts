import apiClient from './client';
import type {
  Shift,
  Designation,
  Department,
  Employee,
  AttendanceRecord,
  AttendanceConfig,
  ApprovalHierarchy,
  ApprovalRequest,
  AttendanceSummary,
  DailyAttendanceStats,
} from '../types/hr';

export interface HrManagementPageData {
  employees: Employee[];
  designations: Designation[];
  departments: Department[];
  shifts: Shift[];
  attendanceRecords: AttendanceRecord[];
  approvalRequests: ApprovalRequest[];
}

export const hrApi = {
  getHrManagementPage: async (): Promise<HrManagementPageData> => {
    const { data } = await apiClient.get('/hr/hr-management-page');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Shifts
  getShifts: async (): Promise<Shift[]> => {
    const { data } = await apiClient.get('/hr/shifts');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  createShift: async (payload: Partial<Shift>): Promise<Shift> => {
    const { data } = await apiClient.post('/hr/shifts', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create shift');
    return data.data;
  },

  updateShift: async (id: number, payload: Partial<Shift>): Promise<Shift> => {
    const { data } = await apiClient.put(`/hr/shifts/${id}`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to update shift');
    return data.data;
  },

  deleteShift: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/hr/shifts/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to delete shift');
  },

  // Designations
  getDesignations: async (departmentId?: number): Promise<Designation[]> => {
    const url = departmentId ? `/hr/designations?departmentId=${departmentId}` : '/hr/designations';
    const { data } = await apiClient.get(url);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  createDesignation: async (payload: Partial<Designation>): Promise<Designation> => {
    const { data } = await apiClient.post('/hr/designations', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create designation');
    return data.data;
  },

  updateDesignation: async (id: number, payload: Partial<Designation>): Promise<Designation> => {
    const { data } = await apiClient.put(`/hr/designations/${id}`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to update designation');
    return data.data;
  },

  deleteDesignation: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/hr/designations/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to delete designation');
  },

  // Departments
  getDepartments: async (): Promise<Department[]> => {
    const { data } = await apiClient.get('/hr/departments');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  createDepartment: async (payload: Partial<Department>): Promise<Department> => {
    const { data } = await apiClient.post('/hr/departments', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create department');
    return data.data;
  },

  updateDepartment: async (id: number, payload: Partial<Department>): Promise<Department> => {
    const { data } = await apiClient.put(`/hr/departments/${id}`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to update department');
    return data.data;
  },

  deleteDepartment: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/hr/departments/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to delete department');
  },

  // Employees
  getEmployees: async (departmentId?: number, designationId?: number): Promise<Employee[]> => {
    const params = new URLSearchParams();
    if (departmentId) params.append('departmentId', String(departmentId));
    if (designationId) params.append('designationId', String(designationId));
    const url = `/hr/employees${params.toString() ? '?' + params.toString() : ''}`;
    const { data } = await apiClient.get(url);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getNextEmployeeCode: async (): Promise<string> => {
    const { data } = await apiClient.get('/hr/employees/next-code');
    if (!data.success) throw new Error(data.message);
    return data.data.code;
  },

  createEmployee: async (payload: Partial<Employee>): Promise<Employee> => {
    const { data } = await apiClient.post('/hr/employees', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create employee');
    return data.data;
  },

  updateEmployee: async (id: number, payload: Partial<Employee>): Promise<Employee> => {
    const { data } = await apiClient.put(`/hr/employees/${id}`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to update employee');
    return data.data;
  },

  deleteEmployee: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/hr/employees/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to delete employee');
  },

  // Attendance
  getAttendanceRecords: async (employeeId?: number, dateFrom?: string, dateTo?: string): Promise<AttendanceRecord[]> => {
    const params = new URLSearchParams();
    if (employeeId) params.append('employeeId', String(employeeId));
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const url = `/hr/attendance${params.toString() ? '?' + params.toString() : ''}`;
    const { data } = await apiClient.get(url);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  checkIn: async (payload: { employeeId: number; latitude?: number; longitude?: number; selfieUrl?: string }): Promise<AttendanceRecord> => {
    const { data } = await apiClient.post('/hr/attendance/check-in', payload);
    if (!data.success) throw new Error(data.message || 'Check-in failed');
    return data.data;
  },

  checkOut: async (payload: { attendanceId: number; latitude?: number; longitude?: number }): Promise<AttendanceRecord> => {
    const { data } = await apiClient.post('/hr/attendance/check-out', payload);
    if (!data.success) throw new Error(data.message || 'Check-out failed');
    return data.data;
  },

  getAttendanceConfig: async (): Promise<AttendanceConfig> => {
    const { data } = await apiClient.get('/hr/attendance-config');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  updateAttendanceConfig: async (payload: Partial<AttendanceConfig>): Promise<AttendanceConfig> => {
    const { data } = await apiClient.put('/hr/attendance-config', payload);
    if (!data.success) throw new Error(data.message || 'Failed to update config');
    return data.data;
  },

  // Attendance Reports
  getAttendanceSummary: async (employeeId?: number, _month?: number, _year?: number): Promise<AttendanceSummary[]> => {
    const params = new URLSearchParams();
    if (employeeId) params.append('employeeId', String(employeeId));
    const url = `/hr/attendance-summary${params.toString() ? '?' + params.toString() : ''}`;
    try {
      const { data } = await apiClient.get(url);
      if (!data.success) return [];
      return data.data;
    } catch {
      return [];
    }
  },

  getDailyAttendanceStats: async (date?: string): Promise<DailyAttendanceStats> => {
    const url = date ? `/hr/attendance-stats?date=${date}` : '/hr/attendance-stats';
    try {
      const { data } = await apiClient.get(url);
      if (!data.success) return { date: date || new Date().toISOString().split('T')[0], totalEmployees: 0, present: 0, absent: 0, late: 0, onLeave: 0, halfDay: 0, attendancePercentage: 0 };
      return data.data;
    } catch {
      return { date: date || new Date().toISOString().split('T')[0], totalEmployees: 0, present: 0, absent: 0, late: 0, onLeave: 0, halfDay: 0, attendancePercentage: 0 };
    }
  },

  // Approval Hierarchy
  getApprovalHierarchies: async (departmentId?: number): Promise<ApprovalHierarchy[]> => {
    const url = departmentId ? `/hr/approval-hierarchies?departmentId=${departmentId}` : '/hr/approval-hierarchies';
    const { data } = await apiClient.get(url);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  createApprovalHierarchy: async (payload: Partial<ApprovalHierarchy>): Promise<ApprovalHierarchy> => {
    const { data } = await apiClient.post('/hr/approval-hierarchies', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create hierarchy');
    return data.data;
  },

  updateApprovalHierarchy: async (id: number, payload: Partial<ApprovalHierarchy>): Promise<ApprovalHierarchy> => {
    const { data } = await apiClient.put(`/hr/approval-hierarchies/${id}`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to update hierarchy');
    return data.data;
  },

  deleteApprovalHierarchy: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/hr/approval-hierarchies/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to delete hierarchy');
  },

  // Approval Requests
  getApprovalRequests: async (status?: string, requestType?: string): Promise<ApprovalRequest[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (requestType) params.append('requestType', requestType);
    const url = `/hr/approval-requests${params.toString() ? '?' + params.toString() : ''}`;
    const { data } = await apiClient.get(url);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  createApprovalRequest: async (payload: Partial<ApprovalRequest>): Promise<ApprovalRequest> => {
    const { data } = await apiClient.post('/hr/approval-requests', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create request');
    return data.data;
  },

  approveRequest: async (id: number, approvedBy: number, approvedByName: string, remarks?: string): Promise<ApprovalRequest> => {
    const { data } = await apiClient.put(`/hr/approval-requests/${id}/approve`, { approvedBy, approvedByName, remarks });
    if (!data.success) throw new Error(data.message || 'Failed to approve request');
    return data.data;
  },

  rejectRequest: async (id: number, rejectedBy: number, rejectedByName: string, remarks?: string): Promise<ApprovalRequest> => {
    const { data } = await apiClient.put(`/hr/approval-requests/${id}/reject`, { rejectedBy, rejectedByName, remarks });
    if (!data.success) throw new Error(data.message || 'Failed to reject request');
    return data.data;
  },
};
