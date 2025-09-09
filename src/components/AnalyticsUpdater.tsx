'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react'

export const AnalyticsUpdater = () => {
  const [isUpdating, setIsUpdating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const updateAnalytics = async () => {
    setIsUpdating(true)
    setResult(null)

    try {
      const response = await fetch('/api/update-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Failed to update analytics' })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="relative">
      {/* Collapsible Tab Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-gray-800 bg-opacity-90 text-white px-2 sm:px-3 py-2 rounded-lg cursor-pointer hover:bg-opacity-95 transition-all duration-200 flex items-center justify-between border border-gray-600 hover:border-gray-500"
      >
        <div className="flex items-center gap-1 sm:gap-2">
          <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
          <span className="text-xs sm:text-sm font-medium">Analytics</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
        )}
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 bg-gray-800 bg-opacity-95 text-white p-4 rounded-lg border border-gray-600 shadow-xl z-50 min-w-[280px]">
          <h3 className="text-lg font-bold mb-2">Analytics Updater</h3>
          
          <div className="mb-3 p-2 bg-green-900 bg-opacity-50 rounded border border-green-500">
            <div className="text-green-400 font-semibold">💰 Current Funding: $14.12</div>
            <div className="text-xs text-gray-300">Community contributions</div>
          </div>
          
          <button
            onClick={updateAnalytics}
            disabled={isUpdating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 w-full"
          >
            {isUpdating ? 'Updating...' : 'Update Analytics'}
          </button>

          {result && (
            <div className="mt-4 p-3 bg-gray-800 rounded text-sm">
              {result.success ? (
                <div>
                  <div className="text-green-400 font-semibold">✅ Success!</div>
                  <div className="mt-2">
                    <div>Before: {result.counts.before.publicUsers} users</div>
                    <div>After: {result.counts.after.publicUsers} users</div>
                  </div>
                </div>
              ) : (
                <div className="text-red-400">
                  ❌ Error: {result.error}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
