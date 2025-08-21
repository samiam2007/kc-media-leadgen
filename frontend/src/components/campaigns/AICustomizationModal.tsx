'use client'

import { useState } from 'react'
import { X, Sparkles, Mic, MessageSquare, Zap, Save, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface AICustomizationModalProps {
  open: boolean
  onClose: () => void
}

export function AICustomizationModal({ open, onClose }: AICustomizationModalProps) {
  const [activeTab, setActiveTab] = useState('responses')
  const [personality, setPersonality] = useState('professional')
  const [tone, setTone] = useState('friendly')
  const [speed, setSpeed] = useState('moderate')
  
  const [responses, setResponses] = useState({
    greeting: "Hi, is this the broker handling commercial listings for your firm? I'm calling from Aerial Marketing Solutions with a quick question about your property marketing.",
    valueProp: "We help commercial brokers lease properties 30% faster using professional drone photography with traffic-path overlays and aerial callouts.",
    objectionPrice: "I understand budget is important. Our packages start at just $599, and brokers typically see ROI within the first showing.",
    objectionNotInterested: "No problem at all. Would you be open to seeing a 30-second sample reel of properties similar to yours?",
    closing: "I have two slots available this week for a quick 10-minute portfolio review. Would Tuesday at 2 PM or Thursday at 10 AM work better?"
  })

  if (!open) return null

  const handleSave = () => {
    toast.success('AI settings saved successfully!')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-brand-gradient p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI Customization</h2>
                <p className="text-white/80 text-sm">Personalize your AI agent's behavior and responses</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('responses')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'responses'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="inline h-4 w-4 mr-2" />
            Response Templates
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'voice'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mic className="inline h-4 w-4 mr-2" />
            Voice & Tone
          </button>
          <button
            onClick={() => setActiveTab('behavior')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'behavior'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Zap className="inline h-4 w-4 mr-2" />
            Behavior Settings
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'responses' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-primary-50 to-secondary-50 p-4 rounded-lg border border-primary-200">
                <p className="text-sm text-gray-700">
                  <strong>💡 Tip:</strong> Keep responses under 2 sentences for better engagement. Use specific benefits and numbers when possible.
                </p>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2">Greeting Message</Label>
                <textarea
                  value={responses.greeting}
                  onChange={(e) => setResponses({...responses, greeting: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Initial greeting when call is answered..."
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2">Value Proposition</Label>
                <textarea
                  value={responses.valueProp}
                  onChange={(e) => setResponses({...responses, valueProp: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Main value pitch..."
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2">Objection: Price Concerns</Label>
                <textarea
                  value={responses.objectionPrice}
                  onChange={(e) => setResponses({...responses, objectionPrice: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Response to price objections..."
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2">Objection: Not Interested</Label>
                <textarea
                  value={responses.objectionNotInterested}
                  onChange={(e) => setResponses({...responses, objectionNotInterested: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Response when not interested..."
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2">Closing Statement</Label>
                <textarea
                  value={responses.closing}
                  onChange={(e) => setResponses({...responses, closing: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Closing and booking offer..."
                />
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3">Voice Selection</Label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'sarah', name: 'Sarah', desc: 'Professional Female', tag: 'Most Popular' },
                    { id: 'james', name: 'James', desc: 'Professional Male', tag: 'Confident' },
                    { id: 'emma', name: 'Emma', desc: 'Friendly Female', tag: 'Warm' },
                    { id: 'custom', name: 'Custom Voice', desc: 'Clone your own', tag: 'Premium' }
                  ].map((voice) => (
                    <div
                      key={voice.id}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 cursor-pointer transition-all hover:shadow-md"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{voice.name}</h4>
                          <p className="text-sm text-gray-600">{voice.desc}</p>
                        </div>
                        <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                          {voice.tag}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3">Personality Type</Label>
                <select
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="professional">Professional - Business-focused, formal</option>
                  <option value="consultative">Consultative - Advisory, helpful</option>
                  <option value="enthusiastic">Enthusiastic - Energetic, passionate</option>
                  <option value="casual">Casual - Relaxed, conversational</option>
                </select>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3">Tone Settings</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Friendliness</Label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      defaultValue="7"
                      className="w-full mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Assertiveness</Label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      defaultValue="5"
                      className="w-full mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Empathy</Label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      defaultValue="8"
                      className="w-full mt-2"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3">Speaking Speed</Label>
                <select
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="slow">Slow - Clear and deliberate</option>
                  <option value="moderate">Moderate - Natural pace</option>
                  <option value="fast">Fast - Quick and energetic</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'behavior' && (
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3">Conversation Style</Label>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium">Allow Interruptions</p>
                      <p className="text-sm text-gray-600">AI can be interrupted mid-sentence</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-5 w-5 text-primary-600" />
                  </label>
                  
                  <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium">Active Listening</p>
                      <p className="text-sm text-gray-600">Use verbal acknowledgments (mm-hmm, I see)</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-5 w-5 text-primary-600" />
                  </label>
                  
                  <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium">Mirror Speech Patterns</p>
                      <p className="text-sm text-gray-600">Adapt to prospect's speaking style</p>
                    </div>
                    <input type="checkbox" className="h-5 w-5 text-primary-600" />
                  </label>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3">Objection Handling</Label>
                <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                  <option>Acknowledge and Redirect</option>
                  <option>Question to Understand</option>
                  <option>Provide Evidence</option>
                  <option>Offer Alternative</option>
                </select>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3">Qualification Priorities</Label>
                <div className="space-y-2">
                  {['Budget', 'Timeline', 'Decision Authority', 'Current Solution', 'Pain Points'].map((item) => (
                    <div key={item} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{item}</span>
                      <select className="text-sm border rounded px-2 py-1">
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3">Call Duration Targets</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Min Duration</Label>
                    <Input type="number" defaultValue="90" placeholder="seconds" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Max Duration</Label>
                    <Input type="number" defaultValue="300" placeholder="seconds" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="space-x-3">
              <Button variant="outline">
                Test Configuration
              </Button>
              <Button 
                onClick={handleSave}
                className="bg-brand-gradient hover:opacity-90 text-white border-0"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}