'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AnimatedErrorProps {
  message: string;
  type?: 'farting-man' | 'mortal-kombat' | 'bouncing-error' | 'shake-error' | 'toasty';
  onClose?: () => void;
  duration?: number;
}

export default function AnimatedError({ 
  message, 
  type = 'farting-man', 
  onClose, 
  duration = 4000 
}: AnimatedErrorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'idle' | 'exit'>('enter');
  const [audioPlayed, setAudioPlayed] = useState(false);

  useEffect(() => {
    // Play audio for Toasty animation
    if (type === 'toasty' && !audioPlayed) {
      const audio = new Audio('/TOASTY SOUND EFFECT (MORTAL KOMBAT).mp3');
      audio.volume = 0.7; // Set volume to 70%
      audio.play().catch(error => {
        console.warn('Could not play Toasty audio:', error);
      });
      setAudioPlayed(true);
    }

    // Enter animation
    const enterTimer = setTimeout(() => {
      setAnimationPhase('idle');
    }, 500);

    // Auto-close timer
    const closeTimer = setTimeout(() => {
      setAnimationPhase('exit');
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 500);
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose, type, audioPlayed]);

  if (!isVisible) return null;

  const handleClose = () => {
    setAnimationPhase('exit');
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 500);
  };

  const renderAnimation = () => {
    switch (type) {
      case 'farting-man':
        return (
          <div className={`relative ${animationPhase === 'enter' ? 'animate-slide-in-left' : animationPhase === 'exit' ? 'animate-slide-out-right' : ''}`}>
            {/* Little running man */}
            <div className="flex items-center gap-2">
              <div className="text-2xl animate-bounce">
                🏃‍♂️
              </div>
              <div className="text-lg animate-pulse">
                💨
              </div>
              <div className="text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>
                🏃‍♂️
              </div>
            </div>
            {/* Fart sound effect */}
            <div className="absolute -top-2 -right-2 text-xs animate-ping">
              💨
            </div>
          </div>
        );

      case 'mortal-kombat':
        return (
          <div className={`relative ${animationPhase === 'enter' ? 'animate-slide-in-top' : animationPhase === 'exit' ? 'animate-slide-out-bottom' : ''}`}>
            <div className="flex items-center gap-2">
              <div className="text-3xl animate-bounce">
                👊
              </div>
              <div className="text-2xl animate-pulse">
                ⚡
              </div>
              <div className="text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>
                👊
              </div>
            </div>
            {/* "Whoopee!" text */}
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-yellow-400 animate-bounce">
              WHOOPEE!
            </div>
          </div>
        );

      case 'bouncing-error':
        return (
          <div className={`${animationPhase === 'enter' ? 'animate-bounce-in' : animationPhase === 'exit' ? 'animate-bounce-out' : 'animate-bounce'}`}>
            <div className="flex items-center gap-2">
              <div className="text-2xl">⚠️</div>
              <div className="text-2xl animate-spin">🌀</div>
              <div className="text-2xl">⚠️</div>
            </div>
          </div>
        );

      case 'shake-error':
        return (
          <div className={`${animationPhase === 'enter' ? 'animate-shake' : ''}`}>
            <div className="flex items-center gap-2">
              <div className="text-2xl animate-pulse">😵</div>
              <div className="text-2xl animate-bounce">💥</div>
              <div className="text-2xl animate-pulse" style={{ animationDelay: '0.1s' }}>😵</div>
            </div>
          </div>
        );

      case 'toasty':
        return (
          <div className={`relative ${animationPhase === 'enter' ? 'animate-toasty-enter' : animationPhase === 'exit' ? 'animate-toasty-exit' : 'animate-toasty-bounce'}`}>
            <div className="flex items-center justify-center">
              {/* Just show a warning icon since the main image is in the tag */}
              <div className="text-2xl animate-pulse">⚠️</div>
            </div>
          </div>
        );

      default:
        return <div className="text-2xl">⚠️</div>;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 duration-300">
      <div className="relative">
        {/* Main oval/cylinder notification body */}
        <div className="bg-red-600 bg-opacity-95 backdrop-blur-sm border border-red-500 rounded-full px-6 py-3 max-w-sm shadow-lg relative overflow-hidden">
          {/* Cylinder effect with gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-red-500 to-red-700 rounded-full opacity-80"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 rounded-full"></div>
          
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                {renderAnimation()}
              </div>
              <p className="text-white text-sm font-medium leading-tight">{message}</p>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors flex-shrink-0 bg-red-700 hover:bg-red-800 rounded-full p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {/* Image tag popping out from the side */}
        {type === 'toasty' && (
          <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 z-10">
            <div className="relative">
              {/* Tag background */}
              <div className="bg-yellow-400 rounded-full p-2 shadow-lg border-2 border-yellow-300">
                <img 
                  src="/Toasty_mk3.JPG.webp" 
                  alt="Toasty from Mortal Kombat"
                  className="w-12 h-12 object-contain rounded-full"
                  style={{ 
                    filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.9))',
                    animation: animationPhase === 'idle' ? 'toasty-glow 2s ease-in-out infinite' : 'none'
                  }}
                />
              </div>
              {/* Tag connector line */}
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-0.5 bg-yellow-400"></div>
              {/* "TOASTY!" text above the tag */}
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-yellow-400 animate-bounce whitespace-nowrap">
                TOASTY!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
