import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import type { UserDTO } from '../shared/types'

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPERADMIN'

function dashboardFor(role: Role): string {
  if (role === 'STUDENT')                          return '/dashboard-alumno'
  if (role === 'TEACHER')                          return '/dashboard-profesor'
  if (role === 'ADMIN' || role === 'SUPERADMIN')   return '/dashboard-admin'
  return '/login'
}

/**
 * Protects a page by required role(s).
 */
export function useRequireRole(required: Role | Role[]): { user: UserDTO | null; isLoading: boolean } {
  const { user: session, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return

    if (!session) {
      window.location.href = '/login'
      return
    }
    const allowed = Array.isArray(required) ? required : [required]
    if (!allowed.includes(session.role as Role)) {
      window.location.href = dashboardFor(session.role as Role)
    }
  }, [session, isLoading])

  return { user: session, isLoading }
}
