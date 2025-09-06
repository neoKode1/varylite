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
              <img 
                src="/Toasty_mk3.JPG.webp" 
                alt="Toasty from Mortal Kombat"
                className="w-16 h-16 object-contain"
                style={{ 
                  filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))',
                  animation: animationPhase === 'idle' ? 'toasty-glow 2s ease-in-out infinite' : 'none'
                }}
              />
            </div>
            {/* "TOASTY!" text */}
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-yellow-400 animate-bounce">
              TOASTY!
            </div>
          </div>
        );

      default:
        return <div className="text-2xl">⚠️</div>;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 duration-300">
      <div className="bg-red-600 bg-opacity-95 backdrop-blur-sm border border-red-500 rounded-lg p-4 max-w-sm shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {renderAnimation()}
            </div>
            <p className="text-white text-sm font-medium">{message}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
