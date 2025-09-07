'use client'

import React, { useState } from 'react'
import { User, LogOut, Settings, UserPlus, LogIn } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsageTracking } from '@/hooks/useUsageTracking'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  onSignUpClick: () => void
  onSignInClick: () => void
}

export const Header: React.FC<HeaderProps> = ({ onSignUpClick, onSignInClick }) => {
  const { user, signOut } = useAuth()
  const { usageStats, isAnonymous } = useUsageTracking()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
    setShowUserMenu(false)
  }

  return (
    <header className="bg-gray-900 border-b border-gray-700 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <h1 className="text-xl font-bold text-white">VaryAI</h1>
        </div>

        {/* User Section */}
        <div className="flex items-center space-x-4">
          {/* Usage Stats */}
          <div className="hidden sm:flex items-center space-x-2 text-sm">
            {isAnonymous ? (
              <>
                <span className="text-gray-300">Free for all models: {usageStats.totalGenerations}/3</span>
                <div className="w-16 h-2 bg-gray-700 rounded-full">
                  <div 
                    className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${(usageStats.totalGenerations / 3) * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <span className="text-green-400 font-medium">✨ Unlimited Generations</span>
            )}
          </div>

          {/* Auth Buttons */}
          {!user ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={onSignInClick}
                className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-800"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
              <button
                onClick={onSignUpClick}
                className="flex items-center space-x-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3 py-2 rounded-lg transition-colors font-medium"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Get Unlimited</span>
              </button>
            </div>
          ) : (
            /* User Menu */
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-800"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-white">
                    {user.user_metadata?.name || user.email?.split('@')[0]}
                  </div>
                  <div className="text-xs text-green-400 font-medium">
                    ✨ Unlimited Access
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
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
                        router.push('/profile')
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        // TODO: Open settings modal
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
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  )
}
