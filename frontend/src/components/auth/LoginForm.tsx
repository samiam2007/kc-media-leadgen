'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Phone, Sparkles, ArrowRight } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [isRegistering, setIsRegistering] = useState(false)
  const { login, register } = useAuth()
  const [loading, setLoading] = useState(false)

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    try {
      if (isRegistering) {
        await register(data.email, data.password)
      } else {
        await login(data.email, data.password)
      }
    } catch (error) {
      console.error('Auth error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-100 via-white to-secondary-100">
        <div className="absolute inset-0 bg-brand-gradient opacity-10 animate-gradient-xy"></div>
      </div>
      
      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 overflow-hidden">
        {/* Card gradient header */}
        <div className="h-2 bg-brand-gradient"></div>
        
        <div className="p-8">
          {/* Logo and title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-brand-gradient rounded-2xl shadow-lg mb-4">
              <Phone className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold gradient-text mb-2">
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-600">
              {isRegistering 
                ? 'Start your AI-powered calling journey' 
                : 'Sign in to manage your campaigns'}
            </p>
          </div>

          {/* Demo credentials hint */}
          {!isRegistering && (
            <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg border border-primary-200">
              <div className="flex items-start space-x-2">
                <Sparkles className="h-5 w-5 text-primary-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-gray-700">Demo Access</p>
                  <p className="text-gray-600">Email: demo@example.com</p>
                  <p className="text-gray-600">Password: demo123</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="mt-1.5 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                {...formRegister('email')}
                disabled={loading}
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="mt-1.5 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                {...formRegister('password')}
                disabled={loading}
              />
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-brand-gradient hover:opacity-90 text-white border-0 h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                </div>
              ) : (
                <span className="flex items-center justify-center">
                  {isRegistering ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              {isRegistering
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}