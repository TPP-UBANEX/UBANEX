import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from './api'
import type { Usuario } from '@/data/types'

interface AuthState {
  user: Usuario | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (nombreCompleto: string, email: string, password: string, unidadAcademicaId?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    isLoading: true,
    isAuthenticated: false,
  })

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
      return
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const user = await api.usuarios.get(payload.sub)
      setState({ user, token, isLoading: false, isAuthenticated: true })
    } catch {
      localStorage.removeItem('token')
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken } = await api.auth.login({ email, password })
    localStorage.setItem('token', accessToken)
    const payload = JSON.parse(atob(accessToken.split('.')[1]))
    const user = await api.usuarios.get(payload.sub)
    setState({ user, token: accessToken, isLoading: false, isAuthenticated: true })
  }, [])

  const register = useCallback(async (
    nombreCompleto: string, email: string, password: string, unidadAcademicaId?: string,
  ) => {
    const { accessToken } = await api.auth.register({ nombreCompleto, email, password, unidadAcademicaId })
    localStorage.setItem('token', accessToken)
    const payload = JSON.parse(atob(accessToken.split('.')[1]))
    const user = await api.usuarios.get(payload.sub)
    setState({ user, token: accessToken, isLoading: false, isAuthenticated: true })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
