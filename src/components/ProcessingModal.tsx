import React from 'react';
import { Loader2, X } from 'lucide-react';

interface ProcessingModalProps {
  isOpen: boolean;
  progress: number;
  currentStep: string;
  estimatedTime?: number;
  timeRemaining?: number;
  onCancel?: () => void;
  cancellable?: boolean;
  type?: 'image' | 'video';
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  progress,
  currentStep,
  estimatedTime,
  timeRemaining,
  onCancel,
  cancellable = false,
  type = 'image'
}) => {
  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              <div className="absolute inset-0 rounded-full border-2 border-blue-400/20"></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {type === 'video' ? 'Generating Video' : 'Generating Image'}
              </h3>
              <p className="text-sm text-gray-400">
                {type === 'video' ? 'This may take 2-20 minutes' : 'This should take 30-60 seconds'}
              </p>
            </div>
          </div>
          
          {cancellable && onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-white transition-colors"
              title="Cancel generation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-300 mb-2">
            <span>{currentStep}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Time Information */}
        {(estimatedTime || timeRemaining) && (
          <div className="text-center text-sm text-gray-400">
            {timeRemaining ? (
              <span>Time remaining: {formatTime(timeRemaining)}</span>
            ) : estimatedTime ? (
              <span>Estimated time: {formatTime(estimatedTime)}</span>
            ) : null}
          </div>
        )}

        {/* Type-specific message */}
        {type === 'video' && (
          <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
            <p className="text-sm text-blue-300 text-center">
              🎬 Video generation is running in the background. You can continue using the app while it processes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
