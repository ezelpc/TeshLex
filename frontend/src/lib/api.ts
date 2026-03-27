// src/lib/api.ts
// ─────────────────────────────────────────────
// HTTP client for TeshLex backend
// Auto-injects JWT, handles 401 → refresh → retry
// ─────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

// ─── Token Store ──────────────────────────────
export interface SessionUser {
  id:               string
  email:            string
  role:             'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPERADMIN'
  firstName:        string
  lastName:         string
  studentProfileId?: string
  teacherProfileId?: string
}

interface TokenData {
  accessToken:  string
  refreshToken: string
  user:         SessionUser
}

export const tokenStore = {
  get(): TokenData | null {
    try {
      const raw = localStorage.getItem('teshlex_session')
      return raw ? (JSON.parse(raw) as TokenData) : null
    } catch {
      return null
    }
  },
  set(data: TokenData) {
    localStorage.setItem('teshlex_session', JSON.stringify(data))
  },
  getSession(): SessionUser | null {
    return this.get()?.user ?? null
  },
  getAccessToken(): string | null {
    return this.get()?.accessToken ?? null
  },
  getRefreshToken(): string | null {
    return this.get()?.refreshToken ?? null
  },
  clear() {
    localStorage.removeItem('teshlex_session')
  },
}

// ─── Base Fetch ───────────────────────────────
let isRefreshing = false
let refreshWaiters: ((token: string) => void)[] = []

async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options
  const headers = new Headers(fetchOptions.headers ?? {})
  headers.set('Content-Type', 'application/json')

  if (!skipAuth) {
    const token = tokenStore.getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers })

  // Auto-refresh on 401
  if (res.status === 401 && !skipAuth && !path.includes('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true
      try {
        const refreshToken = tokenStore.getRefreshToken()
        if (!refreshToken) throw new Error('No refresh token')
        const refreshed = await api.auth.refresh(refreshToken)
        const current   = tokenStore.get()!
        tokenStore.set({ ...current, accessToken: refreshed.accessToken })
        isRefreshing = false
        refreshWaiters.forEach(cb => cb(refreshed.accessToken))
        refreshWaiters = []
      } catch {
        isRefreshing = false
        tokenStore.clear()
        window.location.href = '/login'
        throw new Error('Session expired')
      }
    }

    // Wait for ongoing refresh
    const newToken = await new Promise<string>(resolve => {
      refreshWaiters.push(resolve)
    })
    headers.set('Authorization', `Bearer ${newToken}`)
    const retryRes = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers })
    const retryJson = await retryRes.json()
    if (!retryRes.ok) throw new ApiError(retryRes.status, retryJson?.message ?? 'Error')
    return retryJson.data ?? retryJson
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message.join(', ') : (json?.message ?? res.statusText)
    throw new ApiError(res.status, msg)
  }
  return (json.data ?? json) as T
}

export class ApiError extends Error {
  public status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

// ─── API Namespaces ───────────────────────────
export const api = {

  // ── Auth ──────────────────────────────────
  auth: {
    async login(email: string, password: string): Promise<TokenData> {
      const data = await apiFetch<TokenData>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      })
      tokenStore.set(data)
      return data
    },
    async refresh(refreshToken: string) {
      return apiFetch<{ accessToken: string }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        skipAuth: true,
      })
    },
    async logout() {
      try {
        await apiFetch('/auth/logout', { method: 'POST' })
      } finally {
        tokenStore.clear()
      }
    },
    async me(): Promise<SessionUser> {
      return apiFetch<SessionUser>('/auth/me')
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
      return apiFetch<SessionUser>('/users/register', {
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
    async getAll(filters?: { status?: string; languageId?: string; teacherId?: string }) {
      const q = new URLSearchParams()
      if (filters?.status)     q.set('status',     filters.status)
      if (filters?.languageId) q.set('languageId', filters.languageId)
      if (filters?.teacherId)  q.set('teacherId',  filters.teacherId)
      const qs = q.toString() ? `?${q.toString()}` : ''
      return apiFetch<any[]>(`/courses${qs}`)
    },
    async getLanguages() {
      return apiFetch<any[]>('/courses/languages/list')
    },
    async getOne(id: string) {
      return apiFetch<any>(`/courses/${id}`)
    },
    async createLanguage(dto: { name: string; code: string }) {
      return apiFetch('/courses/languages', {
        method: 'POST',
        body: JSON.stringify(dto),
      })
    },
  },

  // ── Enrollments ───────────────────────────
  enrollments: {
    async getMy() {
      return apiFetch<any[]>('/enrollments/my')
    },
    async getMyHistory() {
      return apiFetch<any[]>('/enrollments/my/history')
    },
    async getAll(filters?: { courseId?: string; status?: string }) {
      const q = new URLSearchParams()
      if (filters?.courseId) q.set('courseId', filters.courseId)
      if (filters?.status)   q.set('status',   filters.status)
      const qs = q.toString() ? `?${q.toString()}` : ''
      return apiFetch<any[]>(`/enrollments${qs}`)
    },
    async preEnroll(courseId: string) {
      return apiFetch<any>('/enrollments/pre-enroll', {
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
    async getMy() {
      return apiFetch<any[]>('/payments/my')
    },
    async getStats() {
      return apiFetch<{ totalRevenue: number; totalApproved: number; totalPending: number; totalRejected: number }>('/payments/stats')
    },
    async getAll(filters?: { studentId?: string; status?: string }) {
      const q = new URLSearchParams()
      if (filters?.studentId) q.set('studentId', filters.studentId)
      if (filters?.status)    q.set('status',    filters.status)
      const qs = q.toString() ? `?${q.toString()}` : ''
      return apiFetch<any[]>(`/payments${qs}`)
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
