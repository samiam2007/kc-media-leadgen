'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Phone, Activity } from 'lucide-react'
import ContactUpload from '@/components/contacts/ContactUpload'
import ScriptEditor from '@/components/scripts/ScriptEditor'
import CallMonitor from '@/components/monitoring/CallMonitor'

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<'contacts' | 'scripts' | 'monitor'>('contacts')

  const tabs = [
    { id: 'contacts', label: 'Upload Contacts', icon: Upload },
    { id: 'scripts', label: 'Script Editor', icon: FileText },
    { id: 'monitor', label: 'Live Monitoring', icon: Activity }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Lead Generation Tools</h1>
          <p className="text-gray-600 mt-2">
            Manage contacts, scripts, and monitor live calls
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${activeTab === tab.id ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `} />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'contacts' && <ContactUpload />}
          {activeTab === 'scripts' && <ScriptEditor />}
          {activeTab === 'monitor' && <CallMonitor />}
        </div>
      </div>
    </div>
  )
}