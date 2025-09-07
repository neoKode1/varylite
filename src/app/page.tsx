'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, UserPlus, LogIn, Sparkles, Zap, Users, Heart } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const router = useRouter();

  const handleSignUp = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const handleSignIn = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  const handleSkipToGeneration = () => {
    router.push('/generate');
  };

  return (
    <div className="min-h-screen relative overflow-hidden w-full">
      {/* Video Background */}
                        <video
        autoPlay
                          muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/Hailuo_Video_419969345664200707.mp4" type="video/mp4" />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-60 z-10"></div>

      {/* Content */}
      <div className="relative z-20 min-h-screen flex items-center justify-center px-4 sm:px-8">
        <div className="w-full max-w-4xl mx-auto flex items-center justify-center">
          {/* Content - Centered */}
          <div className="w-full text-center bg-black bg-opacity-87 p-16 rounded-lg">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Welcome to VaryAI
          </h1>
            <p className="text-xl text-gray-300 mb-4 max-w-2xl mx-auto">
              The first ever fully funded generation or AI app made by creators, led by creators.
            </p>
            
            {/* Sign In Option - Moved here */}
            <div className="mb-6">
              <p className="text-gray-300 mb-3">Already have an account?</p>
              <button
                onClick={handleSignIn}
                className="flex items-center justify-center space-x-2 text-white border border-white border-opacity-30 px-6 py-3 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors mx-auto"
              >
                <LogIn className="w-4 h-4" />
                <span>→ Sign In</span>
              </button>
            </div>
            
            <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
              Transform your images and videos with the power of AI. Create stunning variations, 
              change backgrounds, and bring your creative vision to life - all supported by our amazing community.
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
                <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">AI-Powered Generation</h3>
                <p className="text-gray-300 text-sm">Create stunning variations with advanced AI models</p>
                        </div>
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
                <Zap className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Lightning Fast</h3>
                <p className="text-gray-300 text-sm">Generate results in seconds, not minutes</p>
                            </div>
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
                <Users className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Community Driven</h3>
                <p className="text-gray-300 text-sm">Built by developers, for the community</p>
                          </div>
                      </div>

            {/* Call to Action */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Ready to Create?</h2>
                <p className="text-purple-100 mb-4">
                  Start with 3 free generations per day, or get unlimited access
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                        <button
                    onClick={handleSkipToGeneration}
                    className="flex items-center justify-center space-x-2 bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                        >
                    <Play className="w-5 h-5" />
                    <span>Start Generating (3 Free)</span>
                        </button>

                        <button
                    onClick={handleSignUp}
                    className="flex items-center justify-center space-x-2 bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-800 transition-colors"
                        >
                    <UserPlus className="w-5 h-5" />
                    <span>Get Unlimited Access</span>
                        </button>
                          </div>
                        </div>

                        </div>

            {/* Community Support */}
            <div className="mt-12 bg-white bg-opacity-5 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-10">
              <div className="flex items-center space-x-2 mb-3">
                <Heart className="w-5 h-5 text-red-400" />
                <span className="text-white font-semibold">Support the Community</span>
                        </div>
              <p className="text-gray-300 text-sm mb-4">
                Help keep VaryAI running and growing. Every contribution helps us create more amazing AI tools!
              </p>
              <div className="flex items-center space-x-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">$40.34</div>
                  <div className="text-xs text-gray-400">Raised</div>
                  </div>
                <div className="text-gray-400">/</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">$363</div>
                  <div className="text-xs text-gray-400">Goal</div>
                  </div>
                </div>
              
              {/* Donation Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                <a 
                  href="https://ko-fi.com/varyai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  ⚡ Support on Ko-fi
                </a>
                <a 
                  href="https://cash.app/$VaryAi" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  💚 Cash App
                </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

      {/* Character Variation Image - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-30">
                      <div className="relative">
                        <img
            src="/b39d569d-2c0e-4f3a-9ff0-d0d58b7a185d_removalai_preview.png"
            alt="AI Generated Content Preview"
            className="w-96 h-96 rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 opacity-85"
          />
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
            AI Generated
                      </div>
                          </div>
                      </div>

      {/* Simple Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md relative">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </h2>
                    <button
                onClick={() => setShowAuthModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
                  </button>
                </div>
            <div className="p-6">
              <p className="text-gray-300 text-center mb-6">
                {authMode === 'signin' 
                  ? 'Sign in to access your unlimited generations and saved content.'
                  : 'Create an account to get unlimited generations and save your creations.'
                }
              </p>
                              <div className="space-y-3">
                                          <button
                  onClick={() => {
                    setShowAuthModal(false);
                    router.push('/generate');
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-colors"
                >
                  Continue to Generation
                                          </button>
                <p className="text-center text-gray-400 text-sm">
                  You can always sign up later
                </p>
                                </div>
                              </div>
                                  </div>
                          </div>
                        )}
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
    </div>
  );
}
