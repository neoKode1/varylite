'use client'

import { useState } from 'react'

export const AnalyticsUpdater = () => {
  const [isUpdating, setIsUpdating] = useState(false)
  const [result, setResult] = useState<any>(null)

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
    <div className="fixed top-24 left-4 bg-black bg-opacity-90 text-white p-4 rounded-lg max-w-md z-50">
      <h3 className="text-lg font-bold mb-2">Analytics Updater</h3>
      
      <div className="mb-3 p-2 bg-green-900 bg-opacity-50 rounded border border-green-500">
        <div className="text-green-400 font-semibold">💰 Current Funding: $14.12</div>
        <div className="text-xs text-gray-300">Community contributions</div>
      </div>
      
      <button
        onClick={updateAnalytics}
        disabled={isUpdating}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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
  )
}
