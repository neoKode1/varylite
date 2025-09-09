'use client'

import React, { useState } from 'react'
import { User, LogOut, Settings, UserPlus, LogIn, MessageCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsageTracking } from '@/hooks/useUsageTracking'
import { useRouter } from 'next/navigation'
import { ProfileModal } from './ProfileModal'
import { AnalyticsUpdater } from './AnalyticsUpdater'

interface HeaderProps {
  onSignUpClick: () => void
  onSignInClick: () => void
  showContributors?: boolean
  onToggleContributors?: () => void
  hideCommunityButton?: boolean
}

export const Header: React.FC<HeaderProps> = ({ onSignUpClick, onSignInClick, showContributors, onToggleContributors, hideCommunityButton }) => {
  const { user, signOut } = useAuth()
  const { usageStats, isAnonymous } = useUsageTracking()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
    setShowUserMenu(false)
  }

  return (
    <header className="bg-transparent backdrop-blur-sm border-b border-gray-700/30 px-4 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white">VaryAI</h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => router.push('/generate')}
            className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
          >
            <span className="hidden sm:inline">Generate</span>
            <span className="sm:hidden">Gen</span>
          </button>
          
          {/* Community Button - Only show if not on community page */}
          {!hideCommunityButton && (
            <button
              onClick={() => router.push('/community')}
              className="flex items-center space-x-1 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
            >
              <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Tha Communita</span>
              <span className="sm:hidden">Community</span>
            </button>
          )}
          
          {/* Contributors Button - Only show on community page */}
          {hideCommunityButton && onToggleContributors && (
            <button
              onClick={onToggleContributors}
              className="flex items-center space-x-1 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
            >
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{showContributors ? 'Hide' : 'Show'} Contributors</span>
              <span className="sm:hidden">Contributors</span>
            </button>
          )}
          
          {/* Analytics Dropdown */}
          <div className="ml-1 sm:ml-2">
            <AnalyticsUpdater />
          </div>
        </div>

        {/* User Section */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Usage Stats */}
          <div className="hidden lg:flex items-center space-x-2 text-sm">
            {isAnonymous ? (
              <>
                <span className="text-gray-300">Free: {usageStats.totalGenerations}/3</span>
                <div className="w-16 h-2 bg-gray-700 rounded-full">
                  <div 
                    className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${(usageStats.totalGenerations / 3) * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <span className="text-green-400 font-medium">✨ Unlimited</span>
            )}
          </div>

          {/* Auth Buttons */}
          {!user ? (
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={onSignInClick}
                className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-800"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
              <button
                onClick={onSignUpClick}
                className="flex items-center space-x-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-2 sm:px-3 py-2 rounded-lg transition-colors font-medium text-sm sm:text-base"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Get Unlimited</span>
                <span className="sm:hidden">Unlimited</span>
              </button>
            </div>
          ) : (
            /* User Menu */
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-1 sm:space-x-2 text-gray-300 hover:text-white transition-colors px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-800"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-white">
                    {user.user_metadata?.name || user.email?.split('@')[0]}
                  </div>
                  <div className="text-xs text-green-400 font-medium">
                    ✨ Unlimited
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-[60]">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-gray-700">
                      <div className="text-sm font-medium text-white">
                        {user.user_metadata?.name || 'User'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {user.email}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        setShowProfileModal(true)
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        router.push('/profile')
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    
                    <button
                      onClick={handleSignOut}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-[55]" 
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </header>
  )
}
