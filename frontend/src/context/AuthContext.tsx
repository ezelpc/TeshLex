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
    console.log('[Auth] Iniciando verificación de sesión...')
    
    // Safety timeout: force loading false after 15s to avoid infinite spinner
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn('[Auth] Timeout de seguridad alcanzado. Forzando fin de carga.')
        setLoading(false)
      }
    }, 15000)

    api.auth.me()
      .then(fetchedUser => {
        console.log('[Auth] Usuario recuperado:', fetchedUser?.email || 'ninguno')
        setUser(fetchedUser)
      })
      .catch((err) => {
        console.error('[Auth] Error recuperando sesión:', err)
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
        clearTimeout(timer)
      })
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
