'use client'

import type { ToolProgress } from '@/types/events'

interface ToolProgressPanelProps {
  toolProgress: ToolProgress | null
}

function formatToolName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function ToolProgressPanel({ toolProgress }: ToolProgressPanelProps) {
  if (!toolProgress) return null

  const getToolIcon = () => {
    switch (toolProgress.toolName) {
      case 'web_search':
        return '🌐'
      case 'order_lookup':
        return '📦'
      case 'knowledge_base_search':
        return '📚'
      case 'faq_lookup':
        return '❓'
      default:
        return '🔧'
    }
  }

  const getStatusIcon = () => {
    switch (toolProgress.status) {
      case 'started':
        return '🔄'
      case 'progress':
        return '⏳'
      case 'completed':
        return '✅'
      default:
        return '🔍'
    }
  }

  const getStatusColor = () => {
    switch (toolProgress.status) {
      case 'completed':
        return 'bg-green-500'
      case 'progress':
        return 'bg-blue-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{getToolIcon()}</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {formatToolName(toolProgress.toolName)}
        </span>
        <span className="text-sm">{getStatusIcon()}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div
          className={`h-full ${getStatusColor()} transition-all duration-300 ease-out`}
          style={{ width: `${toolProgress.progress}%` }}
        />
      </div>

      {/* Progress message */}
      {toolProgress.message && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {toolProgress.message}
        </p>
      )}

      {/* Progress percentage */}
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
        {toolProgress.progress}%
      </p>
    </div>
  )
}
