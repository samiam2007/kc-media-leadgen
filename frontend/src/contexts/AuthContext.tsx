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

// Mock user for demo
const MOCK_USER = {
  id: 'demo-user',
  email: 'demo@example.com',
  role: 'admin'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token === 'mock-token') {
        // Use mock user for demo
        setUser(MOCK_USER)
        setLoading(false)
        return
      }
      
      if (!token) {
        setLoading(false)
        return
      }

      const response = await api.get('/auth/me')
      setUser(response.data)
    } catch (error) {
      // If API fails, check for mock token
      const token = localStorage.getItem('token')
      if (token === 'mock-token') {
        setUser(MOCK_USER)
      } else {
        localStorage.removeItem('token')
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    // Mock login for demo
    if (email === 'demo@example.com' && password === 'demo123') {
      localStorage.setItem('token', 'mock-token')
      setUser(MOCK_USER)
      toast.success('Logged in successfully (Demo Mode)')
      return
    }

    try {
      const response = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', response.data.token)
      setUser(response.data.user)
      toast.success('Logged in successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed - Using demo mode: demo@example.com / demo123')
      throw error
    }
  }

  const register = async (email: string, password: string) => {
    // Mock registration for demo
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
      // Fallback to mock user for demo
      localStorage.setItem('token', 'mock-token')
      setUser(MOCK_USER)
      toast.success('Account created (Demo Mode)')
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