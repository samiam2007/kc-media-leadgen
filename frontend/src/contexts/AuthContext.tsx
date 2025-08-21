'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setLoading(false)
        return
      }

      // Add timeout to prevent infinite loading
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      try {
        const response = await api.get('/auth/me', {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        setUser(response.data)
      } catch (err) {
        clearTimeout(timeoutId)
        console.log('Auth check failed, clearing token')
        localStorage.removeItem('token')
      }
    } catch (error) {
      console.error('Auth check error:', error)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', response.data.token)
      setUser(response.data.user)
      toast.success('Welcome to KC Media Lead Gen!')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid email or password')
      throw error
    }
  }

  const register = async (email: string, password: string) => {
    if (!email.includes('@')) {
      toast.error('Please enter a valid email')
      throw new Error('Invalid email')
    }
    
    try {
      const response = await api.post('/auth/register', { email, password })
      localStorage.setItem('token', response.data.token)
      setUser(response.data.user)
      toast.success('Account created successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed')
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    toast.success('Logged out successfully')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}