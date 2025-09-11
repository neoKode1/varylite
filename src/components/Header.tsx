'use client'

import React, { useState, useEffect } from 'react'
import { User, LogOut, Settings, UserPlus, LogIn, MessageCircle, FolderOpen, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsageTracking } from '@/hooks/useUsageTracking'
import { useRouter } from 'next/navigation'
import { ProfileModal } from './ProfileModal'
import { AnalyticsUpdater } from './AnalyticsUpdater'
import { supabase } from '@/lib/supabase'

interface HeaderProps {
  onSignUpClick: () => void
  onSignInClick: () => void
  showContributors?: boolean
  onToggleContributors?: () => void
  hideCommunityButton?: boolean
  onToggleGallery?: () => void
  showGallery?: boolean
  hideAnalytics?: boolean
  showExitSecretLevel?: boolean
}

export const Header: React.FC<HeaderProps> = ({ onSignUpClick, onSignInClick, showContributors, onToggleContributors, hideCommunityButton, onToggleGallery, showGallery, hideAnalytics, showExitSecretLevel }) => {
  const { user, signOut } = useAuth()
  const { usageStats, isAnonymous } = useUsageTracking()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null)
  const router = useRouter()

  // Fetch user's profile picture
  useEffect(() => {
    const fetchUserProfilePicture = async () => {
      if (!user) {
        setUserProfilePicture(null)
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const response = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          setUserProfilePicture(data.profile?.profile_picture || null)
        }
      } catch (error) {
        console.error('Error fetching profile picture:', error)
        setUserProfilePicture(null)
      }
    }

    fetchUserProfilePicture()
  }, [user])

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
    setShowUserMenu(false)
  }

  return (
    <header className="bg-transparent backdrop-blur-sm border-b border-transparent px-4 py-3 sticky top-0 z-[100]">
      {/* Desktop Layout */}
      <div className="hidden md:block max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-charcoal rounded-lg flex items-center justify-center border border-border-gray">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white">vARY Ai</h1>
          </div>

          {/* Navigation Tabs - Centered */}
          <div className="flex items-center space-x-6">
            {hideCommunityButton ? (
              // Show Generate button on community page
              <button
                onClick={() => router.push('/generate')}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
              >
                Generate
              </button>
            ) : (
              // Show Gallery button on generate page
              onToggleGallery && (
                <button
                  onClick={onToggleGallery}
                  className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                    showGallery 
                      ? 'text-cyan-400 bg-gray-800' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {showGallery ? 'Hide Gallery' : 'Show Gallery'}
                </button>
              )
            )}
           
           {/* Community Button - Only show if not on community page */}
           {!hideCommunityButton && (
             <button
               onClick={() => router.push('/community')}
               className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
             >
               <MessageCircle className="w-4 h-4" />
               <span>Tha Communita</span>
             </button>
           )}
           
           {/* Secret Level Button - Only show for authenticated users */}
           {user && !showExitSecretLevel && (
             <button
               onClick={() => router.push('/secret')}
               className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-yellow-400 hover:text-yellow-300 transition-colors rounded-lg hover:bg-yellow-400/10 border border-yellow-400/20"
             >
               <Lock className="w-4 h-4" />
               <span>Secret Level</span>
             </button>
           )}
           
           {/* Exit Secret Level Button - Show when on secret page */}
           {showExitSecretLevel && (
             <button
               onClick={() => router.push('/generate')}
               className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 rounded-lg shadow-lg hover:shadow-yellow-500/25"
             >
               <Lock className="w-4 h-4" />
               <span>Exit Secret Level</span>
             </button>
           )}
           
           {/* Contributors Button - Only show on community page */}
           {hideCommunityButton && onToggleContributors && (
             <button
               onClick={onToggleContributors}
               className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
             >
               <User className="w-4 h-4" />
               <span>{showContributors ? 'Hide' : 'Show'} Contributors</span>
             </button>
           )}
         </div>

         {/* User Section - Right aligned */}
         <div className="flex items-center space-x-6">
           {/* Analytics Dropdown - Desktop only */}
           {!hideAnalytics && (
             <div className="hidden lg:block flex-shrink-0">
               <AnalyticsUpdater />
             </div>
           )}
           
           {/* Usage Stats */}
           <div className="hidden lg:flex items-center space-x-3 text-sm">
             {isAnonymous ? (
               <>
                 <span className="text-gray-300">Free: {usageStats.totalGenerations}/3</span>
                 <div className="w-16 h-2 bg-gray-700 rounded-full">
                   <div 
                     className="h-2 bg-gradient-to-r from-accent-gray to-light-gray rounded-full transition-all duration-300"
                     style={{ width: `${(usageStats.totalGenerations / 3) * 100}%` }}
                   />
                 </div>
               </>
             ) : null}
           </div>

           {/* Auth Buttons */}
           {!user ? (
             <div className="flex items-center space-x-3">
               <button
                 onClick={onSignInClick}
                 className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-gray-800"
               >
                 <LogIn className="w-4 h-4" />
                 <span>Sign In</span>
               </button>
               <button
                 onClick={onSignUpClick}
                 className="flex items-center space-x-2 bg-gradient-charcoal hover:bg-gradient-jet text-white px-4 py-2 rounded-lg transition-colors font-medium border border-border-gray"
               >
                 <UserPlus className="w-4 h-4" />
                 <span>Get Unlimited</span>
               </button>
             </div>
           ) : (
             /* User Menu */
             <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-gray-800"
                >
                  <div className="w-8 h-8 bg-gradient-charcoal rounded-full flex items-center justify-center border border-border-gray overflow-hidden">
                    {userProfilePicture ? (
                      <img 
                        src={userProfilePicture} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                 <div className="text-left">
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
                 <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-[110]">
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
     </div>

      {/* Mobile Layout - Fixed Logo + Scrollable Components */}
      <div className="md:hidden">
        <div className="flex items-center">
          {/* Fixed Logo - Always visible on left */}
          <div className="flex items-center space-x-2 flex-shrink-0 pr-4">
            <div className="w-6 h-6 bg-gradient-charcoal rounded-lg flex items-center justify-center border border-border-gray">
              <span className="text-white font-bold text-xs">V</span>
            </div>
            <h1 className="text-base font-bold text-white">vARY Ai</h1>
          </div>

          {/* Scrollable Navigation Components */}
          <div className="flex items-center space-x-3 overflow-x-auto scrollbar-hide pb-2 flex-1">
            {/* Navigation Items */}
            {hideCommunityButton ? (
              // Show Generate button on community page
              <button
                onClick={() => router.push('/generate')}
                className="flex-shrink-0 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-gray-800 whitespace-nowrap"
              >
                Generate
              </button>
            ) : (
              // Show Gallery button on generate page
              onToggleGallery && (
                <button
                  onClick={onToggleGallery}
                  className={`flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors rounded-lg whitespace-nowrap ${
                    showGallery 
                      ? 'text-cyan-400 bg-gray-800' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {showGallery ? 'Hide Gallery' : 'Show Gallery'}
                </button>
              )
            )}
            
            {/* Community Button - Only show if not on community page */}
            {!hideCommunityButton && (
              <button
                onClick={() => router.push('/community')}
                className="flex items-center space-x-1 flex-shrink-0 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-gray-800 whitespace-nowrap"
              >
                <MessageCircle className="w-3 h-3" />
                <span>Community</span>
              </button>
            )}
            
            {/* Secret Level Button - Only show for authenticated users */}
            {user && !showExitSecretLevel && (
              <button
                onClick={() => router.push('/secret')}
                className="flex items-center space-x-1 flex-shrink-0 px-3 py-2 text-xs font-medium text-yellow-400 hover:text-yellow-300 transition-colors rounded-lg hover:bg-yellow-400/10 border border-yellow-400/20 whitespace-nowrap"
              >
                <Lock className="w-3 h-3" />
                <span>Secret</span>
              </button>
            )}
            
            {/* Exit Secret Level Button - Show when on secret page */}
            {showExitSecretLevel && (
              <button
                onClick={() => router.push('/generate')}
                className="flex items-center space-x-1 flex-shrink-0 px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 rounded-lg shadow-lg hover:shadow-yellow-500/25 whitespace-nowrap"
              >
                <Lock className="w-3 h-3" />
                <span>Exit Secret</span>
              </button>
            )}
            
            {/* Contributors Button - Only show on community page */}
            {hideCommunityButton && onToggleContributors && (
              <button
                onClick={onToggleContributors}
                className="flex items-center space-x-1 flex-shrink-0 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-gray-800 whitespace-nowrap"
              >
                <User className="w-3 h-3" />
                <span>{showContributors ? 'Hide' : 'Show'} Contributors</span>
              </button>
            )}
            
            
            {/* Usage Stats - Mobile */}
            <div className="flex items-center space-x-2 flex-shrink-0 text-xs">
              {isAnonymous ? (
                <>
                  <span className="text-gray-300">Free: {usageStats.totalGenerations}/3</span>
                  <div className="w-12 h-1.5 bg-gray-700 rounded-full">
                    <div 
                      className="h-1.5 bg-gradient-to-r from-accent-gray to-light-gray rounded-full transition-all duration-300"
                      style={{ width: `${(usageStats.totalGenerations / 3) * 100}%` }}
                    />
                  </div>
                </>
              ) : (
                <span className="text-green-400 font-medium">✨ Unlimited</span>
              )}
            </div>

            {/* Auth Buttons - Mobile */}
            {!user ? (
              <>
                <button
                  onClick={onSignInClick}
                  className="flex items-center space-x-1 flex-shrink-0 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-800 whitespace-nowrap"
                >
                  <LogIn className="w-3 h-3" />
                  <span className="text-xs">Sign In</span>
                </button>
                <button
                  onClick={onSignUpClick}
                  className="flex items-center space-x-1 flex-shrink-0 bg-gradient-charcoal hover:bg-gradient-jet text-white px-3 py-2 rounded-lg transition-colors font-medium text-xs whitespace-nowrap border border-border-gray"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>Get Unlimited</span>
                </button>
              </>
            ) : (
              /* User Profile - Mobile */
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => {
                    // On mobile, navigate directly to profile page
                    // On desktop, show dropdown menu
                    if (window.innerWidth < 768) {
                      router.push('/profile');
                    } else {
                      setShowUserMenu(!showUserMenu);
                    }
                  }}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-800"
                >
                  <div className="w-6 h-6 bg-gradient-charcoal rounded-full flex items-center justify-center border border-border-gray overflow-hidden">
                    {userProfilePicture ? (
                      <img 
                        src={userProfilePicture} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-medium text-white">
                      {user.user_metadata?.name || user.email?.split('@')[0]}
                    </div>
                    <div className="text-xs text-green-400 font-medium">
                      ✨ Unlimited
                    </div>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-[110]">
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
                        <span>Display Profile</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          router.push('/profile')
                        }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Show Profile</span>
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
      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-[105]" 
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
