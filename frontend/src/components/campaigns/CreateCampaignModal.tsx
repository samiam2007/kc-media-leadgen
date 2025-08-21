'use client'

import { useState } from 'react'
import { X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface CreateCampaignModalProps {
  open: boolean
  onClose: () => void
}

export function CreateCampaignModal({ open, onClose }: CreateCampaignModalProps) {
  const [campaignName, setCampaignName] = useState('')
  const [dailyCap, setDailyCap] = useState('100')

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success(`Campaign "${campaignName}" created successfully!`)
    setCampaignName('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create New Campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Q1 Bay Area Outreach"
              required
            />
          </div>

          <div>
            <Label htmlFor="script">Script Template</Label>
            <select
              id="script"
              className="w-full h-10 px-3 rounded-md border border-gray-300"
            >
              <option>Drone Photography Pitch</option>
              <option>Video Package Pitch</option>
              <option>Custom Script</option>
            </select>
          </div>

          <div>
            <Label htmlFor="voice">Voice</Label>
            <select
              id="voice"
              className="w-full h-10 px-3 rounded-md border border-gray-300"
            >
              <option>Professional Female (Sarah)</option>
              <option>Professional Male (James)</option>
              <option>Friendly Female (Emma)</option>
            </select>
          </div>

          <div>
            <Label htmlFor="contacts">Upload Contacts (CSV)</Label>
            <div className="mt-1 flex items-center gap-3">
              <Input
                id="contacts"
                type="file"
                accept=".csv"
                className="flex-1"
              />
              <Upload className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Format: name, company, phone, email
            </p>
          </div>

          <div>
            <Label htmlFor="cap">Daily Call Cap</Label>
            <Input
              id="cap"
              type="number"
              value={dailyCap}
              onChange={(e) => setDailyCap(e.target.value)}
              min="1"
              max="500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Campaign
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}