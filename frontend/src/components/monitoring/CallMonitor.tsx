'use client'

import { useState, useEffect } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Clock, User, Building, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import io from 'socket.io-client'

interface ActiveCall {
  id: string
  contactName: string
  company: string
  phone: string
  status: string
  duration: number
  state: string
  transcript: Array<{
    speaker: 'agent' | 'contact'
    text: string
    timestamp: string
  }>
  qualificationData: {
    budget?: string
    timeline?: string
    propertiesCount?: number
    decisionMaker?: boolean
  }
}

export default function CallMonitor() {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([])
  const [selectedCall, setSelectedCall] = useState<string | null>(null)
  const [socket, setSocket] = useState<any>(null)

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://kc-media-leadgen-production.up.railway.app'
    const newSocket = io(socketUrl)
    
    newSocket.on('connect', () => {
      console.log('Connected to call monitoring')
    })

    // Listen for call events
    newSocket.on('call:started', (call: ActiveCall) => {
      setActiveCalls(prev => [...prev, call])
    })

    newSocket.on('call:updated', (update: any) => {
      setActiveCalls(prev => prev.map(call => 
        call.id === update.callId ? { ...call, ...update } : call
      ))
    })

    newSocket.on('call:ended', (callId: string) => {
      setActiveCalls(prev => prev.filter(call => call.id !== callId))
    })

    newSocket.on('call:transcript', (data: any) => {
      setActiveCalls(prev => prev.map(call => {
        if (call.id === data.callId) {
          return {
            ...call,
            transcript: [...call.transcript, {
              speaker: data.speaker,
              text: data.text,
              timestamp: new Date().toISOString()
            }]
          }
        }
        return call
      }))
    })

    setSocket(newSocket)

    // Fetch current active calls
    fetchActiveCalls()

    return () => {
      newSocket.disconnect()
    }
  }, [])

  const fetchActiveCalls = async () => {
    try {
      const response = await api.get('/calls/active')
      setActiveCalls(response.data)
    } catch (error) {
      console.error('Failed to fetch active calls:', error)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'greeting': return 'bg-blue-100 text-blue-800'
      case 'value_pitch': return 'bg-purple-100 text-purple-800'
      case 'qualify': return 'bg-yellow-100 text-yellow-800'
      case 'objection_handling': return 'bg-orange-100 text-orange-800'
      case 'close': return 'bg-green-100 text-green-800'
      case 'end': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const selectedCallData = activeCalls.find(call => call.id === selectedCall)

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Live Call Monitoring</h2>
            <p className="text-sm text-gray-600 mt-1">
              Monitor active calls in real-time
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">
                {activeCalls.length} Active {activeCalls.length === 1 ? 'Call' : 'Calls'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-x">
        {/* Call List */}
        <div className="lg:col-span-1 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Active Calls</h3>
          <div className="space-y-2">
            {activeCalls.length === 0 ? (
              <div className="text-center py-8">
                <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No active calls</p>
              </div>
            ) : (
              activeCalls.map(call => (
                <button
                  key={call.id}
                  onClick={() => setSelectedCall(call.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedCall === call.id 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-sm">{call.contactName || 'Unknown'}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDuration(call.duration)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {call.company && (
                      <div className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {call.company}
                      </div>
                    )}
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStateColor(call.state)}`}>
                        {call.state.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Call Details */}
        <div className="lg:col-span-2 p-4">
          {selectedCallData ? (
            <div>
              {/* Call Header */}
              <div className="mb-4 pb-4 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {selectedCallData.contactName || 'Unknown Contact'}
                    </h3>
                    <p className="text-sm text-gray-600">{selectedCallData.phone}</p>
                    {selectedCallData.company && (
                      <p className="text-sm text-gray-600">{selectedCallData.company}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span className="font-mono">{formatDuration(selectedCallData.duration)}</span>
                    </div>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getStateColor(selectedCallData.state)}`}>
                      {selectedCallData.state.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Qualification Data */}
              {Object.keys(selectedCallData.qualificationData).length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Qualification Data</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedCallData.qualificationData.budget && (
                      <div>
                        <span className="text-blue-700">Budget:</span>
                        <span className="ml-2 font-medium text-blue-900">
                          {selectedCallData.qualificationData.budget}
                        </span>
                      </div>
                    )}
                    {selectedCallData.qualificationData.timeline && (
                      <div>
                        <span className="text-blue-700">Timeline:</span>
                        <span className="ml-2 font-medium text-blue-900">
                          {selectedCallData.qualificationData.timeline}
                        </span>
                      </div>
                    )}
                    {selectedCallData.qualificationData.propertiesCount && (
                      <div>
                        <span className="text-blue-700">Properties:</span>
                        <span className="ml-2 font-medium text-blue-900">
                          {selectedCallData.qualificationData.propertiesCount}
                        </span>
                      </div>
                    )}
                    {selectedCallData.qualificationData.decisionMaker !== undefined && (
                      <div>
                        <span className="text-blue-700">Decision Maker:</span>
                        <span className="ml-2 font-medium text-blue-900">
                          {selectedCallData.qualificationData.decisionMaker ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Live Transcript */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Live Transcript</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedCallData.transcript.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Waiting for conversation...
                    </p>
                  ) : (
                    selectedCallData.transcript.map((entry, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${
                          entry.speaker === 'agent' 
                            ? 'bg-primary-50 ml-8' 
                            : 'bg-gray-50 mr-8'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-600">
                            {entry.speaker === 'agent' ? 'KC Media' : 'Contact'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800">{entry.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <Phone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a call to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}