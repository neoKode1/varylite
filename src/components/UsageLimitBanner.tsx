'use client'

import React from 'react'
import { AlertTriangle, UserPlus, Download } from 'lucide-react'
import { useUsageTracking } from '@/hooks/useUsageTracking'

interface UsageLimitBannerProps {
  onSignUpClick: () => void
  onSaveToAccountClick: () => void
}

export const UsageLimitBanner: React.FC<UsageLimitBannerProps> = ({
  onSignUpClick,
  onSaveToAccountClick
}) => {
  const { usageStats, remainingGenerations, isAnonymous } = useUsageTracking()

  // Don't show banner for authenticated users
  if (!isAnonymous) return null

  // Don't show banner if user still has generations left
  if (remainingGenerations > 0) return null

  return (
    <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-yellow-400 font-semibold text-lg mb-2">
            Free Trial Complete! 🎉
          </h3>
            <p className="text-gray-300 text-sm mb-4">
              You&apos;ve used all {usageStats.totalGenerations} free generations. 
              Create an account to continue generating amazing content and save your work permanently!
            </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onSignUpClick}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Free Account</span>
            </button>
            
            <button
              onClick={onSaveToAccountClick}
              className="flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Save Current Work</span>
            </button>
          </div>
          
          <div className="mt-3 text-xs text-gray-400">
            <p>✨ <strong>Benefits of creating an account:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Unlimited generations</li>
              <li>Save your gallery permanently</li>
              <li>Access to all presets and features</li>
              <li>Sync across devices</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

interface UsageCounterProps {
  onSignUpClick: () => void
}

export const UsageCounter: React.FC<UsageCounterProps> = ({ onSignUpClick }) => {
  const { usageStats, remainingGenerations, isAnonymous } = useUsageTracking()

  // Don't show counter for authenticated users
  if (!isAnonymous) return null

  // Don't show counter if user has no generations left
  if (remainingGenerations === 0) return null

  const progressPercentage = ((usageStats.totalGenerations / 3) * 100)

  return (
    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300">
            Free generations for all models: {usageStats.totalGenerations}/3
          </span>
          <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
            Try it free!
          </span>
        </div>
        <span className="text-sm text-green-400 font-medium">
          {remainingGenerations} remaining
        </span>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          <span className="text-green-400 font-medium">✨ Sign up for unlimited generations!</span>
        </div>
        <button
          onClick={onSignUpClick}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full transition-colors font-medium"
        >
          Get Unlimited
        </button>
      </div>
      
      {remainingGenerations <= 1 && (
        <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs text-yellow-300">
          ⚡ Last generation! Sign up now to continue creating amazing content.
        </div>
      )}
    </div>
  )
}
