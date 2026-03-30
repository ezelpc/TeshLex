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
  language?: { name: string; code: string };
  level: string;
  price: number | string;
  enrollmentFee: number | string;
  scheduleDescription: string;
  startTime: string;
  endTime: string;
  classroom?: string;
  meetingLink?: string;
  teacher?: { user: UserDTO };
}

export interface EnrollmentDTO {
  id: string;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'COMPLETED' | 'DROPPED';
  course: CourseDTO;
  grades?: any[];
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
