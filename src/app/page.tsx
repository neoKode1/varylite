'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const router = useRouter();

  const handleSignIn = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden w-full">
      {/* Content */}
      <div className="relative z-20 min-h-screen flex items-center justify-center px-4 sm:px-8">
        <div className="w-full max-w-4xl mx-auto flex items-center justify-center">
          {/* Content - Centered */}
          <div className="w-full text-center bg-black bg-opacity-87 p-16 rounded-lg">
            <h1 className="text-8xl md:text-10xl font-bold text-white mb-6 leading-tight">
              Welcome to vARY Ai
            </h1>
            <p className="text-xl text-gray-300 mb-4 max-w-2xl mx-auto">
              The first ever fully funded generation or AI app made for AI creators.
            </p>
            
            <p className="text-gray-300 mb-6">Already have an account?</p>
            
            <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
              Transform your images and videos with the power of AI. Create stunning variations, 
              change backgrounds, and bring your creative vision to life - all supported by our amazing community.
            </p>
            
            <button
              onClick={handleSignIn}
              className="flex items-center justify-center space-x-2 text-white border border-white border-opacity-30 px-6 py-3 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors mx-auto"
            >
              <LogIn className="w-4 h-4" />
              <span>→ Sign In</span>
            </button>
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
    </div>
  );
}