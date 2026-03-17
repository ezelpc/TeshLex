// src/hooks/useRequireRole.ts
import { useEffect } from 'react'
import { tokenStore, type SessionUser } from '../lib/api'

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPERADMIN'

function dashboardFor(role: Role): string {
  if (role === 'STUDENT')                          return '/dashboard-alumno'
  if (role === 'TEACHER')                          return '/dashboard-profesor'
  if (role === 'ADMIN' || role === 'SUPERADMIN')   return '/dashboard-admin'
  return '/login'
}

/**
 * Protects a page by required role(s).
 * - No session  → redirects to /login
 * - Wrong role  → redirects to the correct dashboard
 * Returns { user } — guaranteed non-null after the effect runs.
 */
export function useRequireRole(required: Role | Role[]): { user: SessionUser | null } {
  const session = tokenStore.getSession()

  useEffect(() => {
    if (!session) {
      window.location.href = '/login'
      return
    }
    const allowed = Array.isArray(required) ? required : [required]
    if (!allowed.includes(session.role as Role)) {
      window.location.href = dashboardFor(session.role as Role)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { user: session }
}
