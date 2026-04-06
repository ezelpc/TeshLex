// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from '../lib/api'
import type { UserDTO } from '../shared/types'

interface AuthContextType {
  user:            UserDTO | null
  isAuthenticated: boolean
  isLoading:       boolean
  logout:          () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user:            null,
  isAuthenticated: false,
  isLoading:       true,
  logout:          async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<UserDTO | null>(null)
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    // Necesitamos bypass del auto-refresh para evitar loop en /login
    // apiFetch en api.auth.me() hace refresh si hay 401 y redirige.
    // Usamos fetch directo con credentials para la verificación inicial de sesión.
    const checkSession = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include',
          signal: AbortSignal.timeout(10000),
        })

        if (!res.ok) {
          // 401 en verificación inicial = no hay sesión, no intentar refresh
          setUser(null)
          return
        }

        const json = await res.json()
        setUser(json.data ?? json)
      } catch (err) {
        console.error('[Auth] Error en verificación inicial:', err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  const logout = useCallback(async () => {
    await api.auth.logout()
    setUser(null)
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
