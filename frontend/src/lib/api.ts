// src/lib/api.ts
import type { UserDTO, CourseDTO, EnrollmentDTO, PaymentDTO, PaginatedResponse } from '../shared/types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export class ApiError extends Error {
  public status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

// ─── Base Fetch ───────────────────────────────
let isRefreshing = false
let refreshWaiters: ((token: string) => void)[] = []

async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const { skipAuth, ...customOptions } = options
  
  const headers = new Headers(customOptions.headers ?? {})
  headers.set('Content-Type', 'application/json')

  const fetchOptions = {
    ...customOptions,
    headers,
    credentials: 'include' as RequestCredentials,
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    let res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, signal: controller.signal })
    clearTimeout(timeoutId)

    // Auto-refresh on 401
    if (res.status === 401 && !skipAuth && !path.includes('/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, { 
            method: 'POST', 
            credentials: 'include',
            signal: AbortSignal.timeout(5000)
          })
          if (!refreshRes.ok) throw new Error('Refresh failed')
          
          isRefreshing = false
          const waiters = [...refreshWaiters]
          refreshWaiters = []
          waiters.forEach(cb => cb('OK'))
        } catch (refreshErr) {
          isRefreshing = false
          const waiters = [...refreshWaiters]
          refreshWaiters = []
          waiters.forEach(cb => cb('FAIL'))
          
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          throw new ApiError(401, 'Sesión expirada')

        }
      } else {
        // Wait for ongoing refresh
        await new Promise<void>((resolve, reject) => {
          refreshWaiters.push((status) => {
            if (status === 'OK') resolve()
            else reject(new ApiError(401, 'Session failed'))
          })
        })
      }
      
      // Retry with signal
      const retryRes = await fetch(`${API_BASE}${path}`, { ...fetchOptions, signal: controller.signal })
      const retryJson = await retryRes.json().catch(() => ({}))
      if (!retryRes.ok) throw new ApiError(retryRes.status, retryJson?.message ?? 'Error')
      return (retryJson.data ?? retryJson) as T
    }

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = Array.isArray(json?.message) ? json.message.join(', ') : (json?.message ?? res.statusText)
      throw new ApiError(res.status, msg)
    }
    return (json.data ?? json) as T
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error(`[API] Timeout en ${path}`)
      throw new ApiError(408, 'Servidor no responde (Timeout)')
    }
    if (err instanceof ApiError) throw err
    console.error(`[API] Error fatal en ${path}:`, err)
    throw new ApiError(0, 'Error de conexión.')
  }
}

// ─── API Namespaces ───────────────────────────
export const api = {

  // ── Auth ──────────────────────────────────
  auth: {
    async login(email: string, password: string): Promise<{ user: UserDTO }> {
      return apiFetch<{ user: UserDTO }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      })
    },
    async refresh() {
      return apiFetch<{ message: string }>('/auth/refresh', {
        method: 'POST',
        skipAuth: true,
      })
    },
    async logout() {
      return apiFetch('/auth/logout', { method: 'POST' })
    },
    async me(): Promise<UserDTO> {
      return apiFetch<UserDTO>('/auth/me')
    },
    async changePassword(currentPassword: string, newPassword: string) {
      return apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
    },
  },

  // ── Users ─────────────────────────────────
  users: {
    async registerStudent(dto: {
      firstName:  string
      lastName:   string
      email:      string
      password:   string
      matricula:  string
      career:     string
      semester:   number
      curp?:      string
      phone?:     string
      birthDate?: string
    }) {
      return apiFetch<{ user: UserDTO }>('/users/register', {
        method: 'POST',
        body: JSON.stringify(dto),
        skipAuth: true,
      })
    },
    async registerTeacher(dto: {
      firstName:   string
      lastName:    string
      email:       string
      password:    string
      specialties: string[]
      bio?:        string
    }) {
      return apiFetch('/users/teachers', {
        method: 'POST',
        body: JSON.stringify(dto),
      })
    },
  },

  // ── Courses ───────────────────────────────
  courses: {
    async getAll(filters?: { status?: string; languageId?: string; teacherId?: string }): Promise<CourseDTO[]> {
      const q = new URLSearchParams()
      if (filters?.status)     q.set('status',     filters.status)
      if (filters?.languageId) q.set('languageId', filters.languageId)
      if (filters?.teacherId)  q.set('teacherId',  filters.teacherId)
      const qs = q.toString() ? `?${q.toString()}` : ''
      return apiFetch<CourseDTO[]>(`/courses${qs}`)
    },
    async getLanguages() {
      return apiFetch<any[]>('/courses/languages/list')
    },
    async getOne(id: string): Promise<CourseDTO> {
      return apiFetch<CourseDTO>(`/courses/${id}`)
    },
    async createLanguage(dto: { name: string; code: string }) {
      return apiFetch('/courses/languages', {
        method: 'POST',
        body: JSON.stringify(dto),
      })
    },
    async getCycles() {
      return apiFetch<any[]>('/courses/cycles/list')
    },
    async getActiveCycle() {
      return apiFetch<any>('/courses/cycles/active')
    },
    async activateCycle(id: string) {
      return apiFetch(`/courses/cycles/${id}/activate`, { method: 'PATCH' })
    },
    async updateCycle(id: string, dto: any) {
      return apiFetch(`/courses/cycles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      })
    },
  },


  // ── Enrollments ───────────────────────────
  enrollments: {
    async getMy(): Promise<EnrollmentDTO[]> {
      return apiFetch<EnrollmentDTO[]>('/enrollments/my')
    },
    async getMyHistory(): Promise<EnrollmentDTO[]> {
      return apiFetch<EnrollmentDTO[]>('/enrollments/my/history')
    },
    async getAll(filters?: { courseId?: string; status?: string }): Promise<EnrollmentDTO[]> {
      const q = new URLSearchParams()
      if (filters?.courseId) q.set('courseId', filters.courseId)
      if (filters?.status)   q.set('status',   filters.status)
      const qs = q.toString() ? `?${q.toString()}` : ''
      return apiFetch<EnrollmentDTO[]>(`/enrollments${qs}`)
    },
    async preEnroll(courseId: string): Promise<EnrollmentDTO> {
      return apiFetch<EnrollmentDTO>('/enrollments/pre-enroll', {
        method: 'POST',
        body: JSON.stringify({ courseId }),
      })
    },
    async drop(id: string, reason: string) {
      return apiFetch(`/enrollments/${id}/drop`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      })
    },
    async saveGrades(id: string, dto: any) {
      return apiFetch(`/enrollments/${id}/grades`, {
        method: 'POST',
        body: JSON.stringify(dto),
      })
    },
    async recordBulkAttendance(courseId: string, date: string, records: any[]) {
      return apiFetch('/enrollments/bulk-attendance', {
        method: 'POST',
        body: JSON.stringify({ courseId, date, records }),
      })
    },
  },

  // ── Payments ──────────────────────────────
  payments: {
    async createPreference(enrollmentId: string) {
      return apiFetch<{ preferenceId: string; initPoint?: string }>('/payments/create-preference', {
        method: 'POST',
        body: JSON.stringify({ enrollmentId }),
      })
    },
    async getMy(page = 1, limit = 50): Promise<PaginatedResponse<PaymentDTO>> {
      // NOTE: Using fallback parsing until Paginated endpoints are fully hooked everywhere
      const raw = await apiFetch<any>(`/payments/my?page=${page}&limit=${limit}`)
      if (Array.isArray(raw)) return { data: raw, total: raw.length, page: 1, lastPage: 1 }
      return raw as PaginatedResponse<PaymentDTO>
    },
    async getStats() {
      return apiFetch<{ totalRevenue: number; totalApproved: number; totalPending: number; totalRejected: number }>('/payments/stats')
    },
    async getAll(filters?: { studentId?: string; status?: string }): Promise<PaymentDTO[]> {
      const q = new URLSearchParams()
      if (filters?.studentId) q.set('studentId', filters.studentId)
      if (filters?.status)    q.set('status',    filters.status)
      const qs = q.toString() ? `?${q.toString()}` : ''
      return apiFetch<PaymentDTO[]>(`/payments${qs}`)
    },
  },

  // ── Reports ───────────────────────────────
  reports: {
    async getDashboard() {
      return apiFetch<{
        totalStudents:         number
        totalTeachers:         number
        activeEnrollments:     number
        dropsThisMonth:        number
        pendingDocuments:      number
        revenueThisMonth:      number
        revenueLastMonth:      number
        enrollmentsByLevel:    { level: string; count: number }[]
        enrollmentsByLanguage: { language: string; count: number }[]
      }>('/reports/dashboard')
    },
    async getPendingDocuments() {
      return apiFetch<any[]>('/reports/documents/pending')
    },
    async releaseDocument(id: string) {
      return apiFetch(`/reports/documents/${id}/release`, { method: 'PATCH' })
    },

    async getTeacherComments(unreadOnly = false) {
      const path = unreadOnly ? '/reports/comments?unread=true' : '/reports/comments'
      return apiFetch<any[]>(path)
    },
    async markCommentRead(id: string) {
      return apiFetch(`/reports/comments/${id}/read`, { method: 'PATCH' })
    },
    async getPaymentsSummary(from?: string, to?: string) {
      const q = new URLSearchParams()
      if (from) q.set('from', from)
      if (to)   q.set('to',   to)
      const qs = q.toString() ? `?${q.toString()}` : ''
      return apiFetch<any>(`/reports/payments/summary${qs}`)
    },
  },

  // ── Users comments (teacher) ──────────────
  teacher: {
    async sendComment(message: string) {
      return apiFetch('/users/teachers/comments', {
        method: 'POST',
        body: JSON.stringify({ message }),
      })
    },
  },
}

