'use client'

interface ToolProgressItemProps {
  toolName: string
  progress: number
  status: 'started' | 'progress' | 'completed'
  message?: string
}

export function ToolProgressItem({
  toolName,
  progress,
  status,
  message,
}: ToolProgressItemProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'started':
        return (
          <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
        )
      case 'progress':
        return (
          <span className="animate-pulse inline-block w-4 h-4 bg-blue-500 rounded-full" />
        )
      case 'completed':
        return <span className="text-green-500">✓</span>
      default:
        return null
    }
  }

  return (
    <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-700 rounded-md shadow-sm">
      <div className="flex-shrink-0">{getStatusIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {toolName}
        </p>
        {message && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {message}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
        {progress}%
      </div>
    </div>
  )
}
