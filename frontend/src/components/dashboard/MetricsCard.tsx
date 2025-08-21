import { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface MetricsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: string
  gradient: string
}

export function MetricsCard({ title, value, icon: Icon, trend, gradient }: MetricsCardProps) {
  return (
    <Card className="relative overflow-hidden hover-glow transition-all duration-300 hover:scale-105">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {trend && (
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium text-green-600">{trend}</span>
                <span className="text-xs text-gray-500">vs last week</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`}></div>
    </Card>
  )
}