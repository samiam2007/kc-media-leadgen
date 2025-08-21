'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Phone, 
  Users, 
  Target, 
  TrendingUp, 
  Plus,
  PlayCircle,
  PauseCircle,
  Activity,
  Settings,
  LogOut,
  Sparkles,
  Wrench
} from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CampaignList } from './CampaignList'
import { MetricsCard } from './MetricsCard'
import { RecentCalls } from './RecentCalls'
import { CreateCampaignModal } from '../campaigns/CreateCampaignModal'
import { AICustomizationModal } from '../campaigns/AICustomizationModal'
import { useAuth } from '@/hooks/useAuth'

export function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const { user, logout } = useAuth()

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(res => res.data),
    refetchInterval: 30000
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600"></div>
          <div className="absolute inset-0 rounded-full h-16 w-16 border-t-4 border-b-4 border-secondary-600 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header with gradient */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="bg-brand-gradient h-1"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-brand-gradient rounded-xl shadow-lg">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">Drone Lead Gen</h1>
                <p className="text-xs text-gray-500">AI-Powered Calling Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link href="/tools">
                <Button 
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Tools
                </Button>
              </Link>
              <Button 
                onClick={() => setShowAIModal(true)}
                className="bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Settings
              </Button>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-brand-gradient hover:opacity-90 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
              <div className="h-8 w-px bg-gray-300 mx-2"></div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
              <button onClick={logout} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <LogOut className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 p-6 bg-brand-gradient rounded-2xl shadow-xl text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">Welcome to KC Media Lead Gen!</h2>
              <p className="text-white/80">Your AI calling campaigns are performing exceptionally well today.</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">24.5%</p>
              <p className="text-white/80">Overall Conversion</p>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricsCard
            title="Active Campaigns"
            value={dashboardData?.activeCampaigns || 0}
            icon={PlayCircle}
            trend="+12%"
            gradient="from-primary-500 to-primary-600"
          />
          <MetricsCard
            title="Total Calls"
            value={dashboardData?.totalCalls || 0}
            icon={Phone}
            trend="+28%"
            gradient="from-secondary-500 to-secondary-600"
          />
          <MetricsCard
            title="Qualified Leads"
            value={dashboardData?.qualifiedLeads || 0}
            icon={Target}
            trend="+15%"
            gradient="from-purple-500 to-purple-600"
          />
          <MetricsCard
            title="Conversion Rate"
            value="24.5%"
            icon={TrendingUp}
            trend="+3.2%"
            gradient="from-orange-500 to-orange-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="p-6 glass-card hover-glow">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Active Campaigns</h2>
                  <p className="text-sm text-gray-500 mt-1">Monitor and manage your outreach</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg">
                  <Activity className="h-5 w-5 text-primary-600" />
                </div>
              </div>
              <CampaignList />
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 glass-card hover-glow">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Recent Calls</h2>
                  <p className="text-sm text-gray-500 mt-1">Live activity feed</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-secondary-100 to-primary-100 rounded-lg">
                  <Phone className="h-5 w-5 text-secondary-600" />
                </div>
              </div>
              <RecentCalls calls={dashboardData?.recentCalls || []} />
            </Card>
          </div>
        </div>
      </main>

      <CreateCampaignModal 
        open={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      
      <AICustomizationModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
      />
    </div>
  )
}