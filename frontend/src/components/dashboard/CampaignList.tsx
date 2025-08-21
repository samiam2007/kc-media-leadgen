'use client'

import { useState } from 'react'
import { PlayCircle, PauseCircle, Users, Phone, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

const mockCampaigns = [
  {
    id: '1',
    name: 'Q1 Bay Area Brokers',
    status: 'active',
    contacts: 245,
    callsPlaced: 89,
    qualified: 21,
    conversionRate: 23.6
  },
  {
    id: '2',
    name: 'Silicon Valley Commercial',
    status: 'paused',
    contacts: 180,
    callsPlaced: 45,
    qualified: 8,
    conversionRate: 17.8
  },
  {
    id: '3',
    name: 'Oakland Properties Outreach',
    status: 'active',
    contacts: 320,
    callsPlaced: 156,
    qualified: 42,
    conversionRate: 26.9
  }
]

export function CampaignList() {
  const [campaigns] = useState(mockCampaigns)

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  campaign.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {campaign.status}
              </span>
            </div>
            <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{campaign.contacts} contacts</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <span>{campaign.callsPlaced} calls</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span>{campaign.conversionRate}% conversion</span>
              </div>
            </div>
          </div>
          <Button
            variant={campaign.status === 'active' ? 'outline' : 'default'}
            size="sm"
          >
            {campaign.status === 'active' ? (
              <>
                <PauseCircle className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Resume
              </>
            )}
          </Button>
        </div>
      ))}
    </div>
  )
}