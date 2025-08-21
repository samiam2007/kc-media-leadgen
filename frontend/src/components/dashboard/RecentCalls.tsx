import { format } from 'date-fns'
import { Phone, CheckCircle, XCircle, Clock } from 'lucide-react'

const mockCalls = [
  {
    id: '1',
    contact: { fullName: 'John Smith', company: 'Bay Realty' },
    startAt: new Date(Date.now() - 1000 * 60 * 15),
    duration: 245,
    outcome: 'qualified',
    campaign: { name: 'Q1 Bay Area' }
  },
  {
    id: '2',
    contact: { fullName: 'Sarah Johnson', company: 'Pacific Properties' },
    startAt: new Date(Date.now() - 1000 * 60 * 45),
    duration: 180,
    outcome: 'callback',
    campaign: { name: 'Silicon Valley' }
  },
  {
    id: '3',
    contact: { fullName: 'Mike Chen', company: 'Urban Commercial' },
    startAt: new Date(Date.now() - 1000 * 60 * 90),
    duration: 90,
    outcome: 'not_interested',
    campaign: { name: 'Oakland Properties' }
  },
  {
    id: '4',
    contact: { fullName: 'Lisa Williams', company: 'Sunset Brokers' },
    startAt: new Date(Date.now() - 1000 * 60 * 120),
    duration: 320,
    outcome: 'qualified',
    campaign: { name: 'Q1 Bay Area' }
  }
]

export function RecentCalls({ calls = mockCalls }: { calls?: any[] }) {
  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'qualified':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'not_interested':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'callback':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <Phone className="h-4 w-4 text-gray-400" />
    }
  }

  const getOutcomeLabel = (outcome: string) => {
    switch (outcome) {
      case 'qualified':
        return 'Qualified'
      case 'not_interested':
        return 'Not Interested'
      case 'callback':
        return 'Callback'
      default:
        return 'In Progress'
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-3">
      {calls.map((call) => (
        <div key={call.id} className="flex items-center justify-between py-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {getOutcomeIcon(call.outcome)}
              <span className="font-medium text-sm text-gray-900">
                {call.contact.fullName}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {call.contact.company} • {formatDuration(call.duration)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-700">
              {getOutcomeLabel(call.outcome)}
            </p>
            <p className="text-xs text-gray-500">
              {format(new Date(call.startAt), 'h:mm a')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}