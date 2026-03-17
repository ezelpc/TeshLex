// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api, tokenStore, type SessionUser } from '../lib/api'

interface AuthContextType {
  user:            SessionUser | null
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
  const [user, setUser]         = useState<SessionUser | null>(null)
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    // Rehydrate session from localStorage on mount
    const session = tokenStore.getSession()
    setUser(session)
    setLoading(false)
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
