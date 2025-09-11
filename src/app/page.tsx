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

  const handleSignUp = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden w-full">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{
          minWidth: '100%',
          minHeight: '100%',
          width: 'auto',
          height: 'auto',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <source src="/91b9d7be-bb33-4df3-af75-85c7bc3f9d79.mp4" type="video/mp4" />
      </video>

      {/* Black Background Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-70 z-10"></div>

      {/* Content */}
      <div className="relative z-20 min-h-screen flex items-center justify-center px-4 sm:px-8">
        <div className="w-full max-w-4xl mx-auto flex items-center justify-center">
          {/* Content - Centered */}
          <div className="w-full text-center bg-black bg-opacity-87 p-8 md:p-16 rounded-lg">
            <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-10xl font-bold text-white mb-4 md:mb-6 leading-tight">
              Welcome to vARY Ai
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-4 max-w-2xl mx-auto">
              The AI app made for creation by creators.
            </p>
            
            <p className="text-gray-300 mb-6">Ready to get started?</p>
            
            {/* <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
            No one has these presets... because no one made them.
            </p> */}
            
            <div className="flex flex-col gap-4 justify-center items-center">
              {/* Free Generations Button - Primary CTA */}
              <button
                onClick={() => router.push('/generate')}
                className="flex items-center justify-center space-x-2 text-black bg-white border border-white px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors min-w-[200px] font-semibold text-lg"
              >
                <span>🎨 Get 3 Free Generations</span>
              </button>
              
              {/* Account Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={handleSignUp}
                  className="flex items-center justify-center space-x-2 text-white bg-white bg-opacity-10 border border-white border-opacity-30 px-6 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors min-w-[160px]"
                >
                  <span>Create Account</span>
                </button>
                
                <button
                  onClick={handleSignIn}
                  className="flex items-center justify-center space-x-2 text-white border border-white border-opacity-30 px-6 py-3 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors min-w-[160px]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>→ Sign In</span>
                </button>
              </div>
            </div>
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