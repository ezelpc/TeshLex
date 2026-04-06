// src/shared/types/index.ts

export interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPERADMIN';
}

export interface CourseDTO {
  id: string;
  languageId?: string;
  language?: { name: string; code: string };
  level: string;
  price: number | string;
  enrollmentFee: number | string;
  materialFee?: number | string;
  scheduleDescription: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  classroom?: string;
  meetingLink?: string;
  teacher?: { user: UserDTO };
}

export interface EnrollmentDocument {
  id: string;
  type: 'IDENTIFICATION' | 'ACADEMIC_HISTORY' | 'GRADE_REPORT' | 'OTHER';
  status: 'PENDING' | 'REJECTED' | 'APPROVED' | 'RELEASED';
  fileUrl: string;
}

export interface AcademicCycle {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  enrollmentStart?: string;
  enrollmentEnd?: string;
  isActive: boolean;
}

export interface EnrollmentDTO {
  id: string;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'EXPELLED';
  course: CourseDTO;
  grades?: any[];
  finalGrade?: number;
  documents?: EnrollmentDocument[];
  updatedAt: string;
}

export interface PaymentDTO {
  id: string;
  amount: string | number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  createdAt: string;
  description: string;
  enrollment?: EnrollmentDTO;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  lastPage: number;
}
