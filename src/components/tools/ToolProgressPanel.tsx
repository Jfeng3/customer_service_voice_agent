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

  const isInProgress = toolProgress.status !== 'completed'

  return (
    <div className="flex items-center gap-3">
      {/* Spinner or checkmark */}
      {isInProgress ? (
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      ) : (
        <span className="text-green-500 text-lg">✓</span>
      )}

      {/* Tool info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌐</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {formatToolName(toolProgress.toolName)}
          </span>
        </div>
        {toolProgress.message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {toolProgress.message}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-24 flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-out ${
              toolProgress.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${toolProgress.progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 w-8 text-right">
          {toolProgress.progress}%
        </span>
      </div>
    </div>
  )
}
