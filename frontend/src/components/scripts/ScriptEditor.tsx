'use client'

import { useState, useEffect } from 'react'
import { Save, Download, Upload, FileText, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface ScriptSection {
  greeting: string
  valueProposition: string
  qualification: string
  objectionHandling: string
  closing: string
  voicemail: string
}

export default function ScriptEditor() {
  const [scriptName, setScriptName] = useState('KC Media Drone Sales Script')
  const [script, setScript] = useState<ScriptSection>({
    greeting: `Hi {{name}}, this is {{agent}} from KC Media Team. We specialize in drone photography and videography for commercial real estate in the Kansas City area. I noticed your company {{company}} has several commercial properties. Do you have a quick moment to discuss how aerial media can help your properties lease 30% faster?`,
    
    valueProposition: `Great! What we've found is that properties with aerial photography and video tours get 3x more online views and lease significantly faster. Our drone footage showcases parking, access routes, surrounding amenities, and gives potential tenants the full picture they can't get from ground-level photos. We work with companies like yours to create stunning marketing materials starting at just $100 per property.`,
    
    qualification: `To better understand how we can help, can you tell me:
- How many properties are you currently marketing?
- What's your typical timeline for getting properties leased?
- What's been your biggest challenge in showcasing properties to potential tenants?`,
    
    objectionHandling: `I completely understand {{objection_type}}. 
- [Price] Our services start at just $100, and most clients see ROI within their first lease. The faster leasing alone typically saves thousands in carrying costs.
- [Timing] We can schedule shoots at your convenience, even same-week. The entire process takes less than an hour per property.
- [Not interested] No problem at all. May I send you some examples of our work? You might find it useful for future properties.`,
    
    closing: `Based on what you've told me, I think our aerial services would be perfect for your properties. I'd love to show you some examples specific to commercial real estate. Are you available for a quick 15-minute call this week? I have openings on {{available_times}}.`,
    
    voicemail: `Hi {{name}}, this is {{agent}} from KC Media Team. We help commercial real estate companies in Kansas City showcase their properties with professional drone photography and videography. Our aerial media helps properties lease 30% faster. Please give me a call back at 913-238-7094 or visit kcmediateam.me to see examples of our work. Thank you!`
  })
  
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    
    try {
      await api.post('/scripts', {
        name: scriptName,
        content: script,
        isDefault: true
      })
      setMessage('Script saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Failed to save script')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = () => {
    const content = `KC MEDIA TEAM - CALL SCRIPT
============================

SCRIPT NAME: ${scriptName}

1. GREETING
-----------
${script.greeting}

2. VALUE PROPOSITION
-------------------
${script.valueProposition}

3. QUALIFICATION QUESTIONS
--------------------------
${script.qualification}

4. OBJECTION HANDLING
--------------------
${script.objectionHandling}

5. CLOSING
----------
${script.closing}

6. VOICEMAIL MESSAGE
-------------------
${script.voicemail}

VARIABLES:
----------
{{name}} - Contact's name
{{company}} - Company name
{{agent}} - Agent name (KC Media Team)
{{objection_type}} - Type of objection
{{available_times}} - Available meeting times

NOTES:
------
- Keep responses under 2 sentences
- Sound natural and conversational
- Focus on value and ROI
- Be respectful of their time
`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${scriptName.replace(/\s+/g, '_')}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        // Parse the text file and extract sections
        // This is a simple parser - you can make it more sophisticated
        const sections = {
          greeting: extractSection(text, '1. GREETING', '2. VALUE PROPOSITION'),
          valueProposition: extractSection(text, '2. VALUE PROPOSITION', '3. QUALIFICATION'),
          qualification: extractSection(text, '3. QUALIFICATION', '4. OBJECTION'),
          objectionHandling: extractSection(text, '4. OBJECTION', '5. CLOSING'),
          closing: extractSection(text, '5. CLOSING', '6. VOICEMAIL'),
          voicemail: extractSection(text, '6. VOICEMAIL', 'VARIABLES:')
        }
        setScript(sections)
        setMessage('Script imported successfully!')
        setTimeout(() => setMessage(''), 3000)
      }
      reader.readAsText(file)
    }
  }

  const extractSection = (text: string, start: string, end: string): string => {
    const startIdx = text.indexOf(start)
    const endIdx = text.indexOf(end)
    if (startIdx === -1 || endIdx === -1) return ''
    
    const section = text.substring(startIdx, endIdx)
    const lines = section.split('\n')
    // Remove the header and separator lines
    return lines.slice(2).join('\n').trim()
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Call Script Editor</h2>
            <p className="text-sm text-gray-600 mt-1">
              Edit your call script sections. The AI will use these as guidelines for conversations.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".txt"
              onChange={handleImport}
              className="hidden"
              id="import-script"
            />
            <label
              htmlFor="import-script"
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" />
              Import
            </label>
            <button
              onClick={handleExport}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Script'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Script Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Script Name
          </label>
          <input
            type="text"
            value={scriptName}
            onChange={(e) => setScriptName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Greeting */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            1. Greeting (Initial Contact)
          </label>
          <textarea
            value={script.greeting}
            onChange={(e) => setScript({ ...script, greeting: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="How the agent introduces themselves..."
          />
        </div>

        {/* Value Proposition */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            2. Value Proposition
          </label>
          <textarea
            value={script.valueProposition}
            onChange={(e) => setScript({ ...script, valueProposition: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Explain the benefits and value..."
          />
        </div>

        {/* Qualification */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            3. Qualification Questions
          </label>
          <textarea
            value={script.qualification}
            onChange={(e) => setScript({ ...script, qualification: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Questions to qualify the lead..."
          />
        </div>

        {/* Objection Handling */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            4. Objection Handling
          </label>
          <textarea
            value={script.objectionHandling}
            onChange={(e) => setScript({ ...script, objectionHandling: e.target.value })}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="How to handle common objections..."
          />
        </div>

        {/* Closing */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            5. Closing
          </label>
          <textarea
            value={script.closing}
            onChange={(e) => setScript({ ...script, closing: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="How to close the call and book meetings..."
          />
        </div>

        {/* Voicemail */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            6. Voicemail Message
          </label>
          <textarea
            value={script.voicemail}
            onChange={(e) => setScript({ ...script, voicemail: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Message to leave on voicemail..."
          />
        </div>
      </div>

      {/* Variables Guide */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Available Variables</h3>
        <p className="text-xs text-blue-700 mb-2">
          Use these variables in your script - they'll be replaced with actual values during calls:
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
          <div>• <code className="bg-blue-100 px-1 rounded">{'{{name}}'}</code> - Contact's name</div>
          <div>• <code className="bg-blue-100 px-1 rounded">{'{{company}}'}</code> - Company name</div>
          <div>• <code className="bg-blue-100 px-1 rounded">{'{{agent}}'}</code> - Agent name</div>
          <div>• <code className="bg-blue-100 px-1 rounded">{'{{property_count}}'}</code> - Number of properties</div>
        </div>
      </div>
    </div>
  )
}