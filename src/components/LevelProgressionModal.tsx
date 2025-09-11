'use client';

import React from 'react';
import { X, Star, Zap, Trophy, Gift, Sparkles } from 'lucide-react';

interface LevelProgressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelUpData: {
    leveledUp: boolean;
    currentLevel: number;
    previousLevel: number;
    unlockedModels: string[];
  };
}

export const LevelProgressionModal: React.FC<LevelProgressionModalProps> = ({
  isOpen,
  onClose,
  levelUpData
}) => {
  if (!isOpen || !levelUpData.leveledUp) return null;

  const { currentLevel, previousLevel, unlockedModels } = levelUpData;

  const getLevelTitle = (level: number) => {
    if (level <= 2) return 'Novice Creator';
    if (level <= 4) return 'Skilled Artist';
    if (level <= 6) return 'Expert Designer';
    if (level <= 8) return 'Master Creator';
    return 'Legendary Artist';
  };

  const getLevelColor = (level: number) => {
    if (level <= 2) return 'from-green-500 to-emerald-500';
    if (level <= 4) return 'from-blue-500 to-cyan-500';
    if (level <= 6) return 'from-purple-500 to-pink-500';
    if (level <= 8) return 'from-orange-500 to-red-500';
    return 'from-yellow-500 to-gold-500';
  };

  const getLevelIcon = (level: number) => {
    if (level <= 2) return <Star className="w-8 h-8" />;
    if (level <= 4) return <Zap className="w-8 h-8" />;
    if (level <= 6) return <Trophy className="w-8 h-8" />;
    if (level <= 8) return <Gift className="w-8 h-8" />;
    return <Sparkles className="w-8 h-8" />;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-2xl p-8 max-w-2xl w-full border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full bg-gradient-to-r ${getLevelColor(currentLevel)} text-white`}>
              {getLevelIcon(currentLevel)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Level Up!</h2>
              <p className="text-white/70">Congratulations on your progress!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white/70 hover:text-white" />
          </button>
        </div>

        {/* Level Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white/70">Level {previousLevel}</div>
              <div className="text-sm text-white/50">Previous</div>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            <div className="text-center">
              <div className={`text-4xl font-bold bg-gradient-to-r ${getLevelColor(currentLevel)} bg-clip-text text-transparent`}>
                Level {currentLevel}
              </div>
              <div className="text-sm text-white/50">Current</div>
            </div>
          </div>
          
          <div className="text-center mb-4">
            <div className={`text-xl font-semibold bg-gradient-to-r ${getLevelColor(currentLevel)} bg-clip-text text-transparent`}>
              {getLevelTitle(currentLevel)}
            </div>
            <div className="text-white/60 text-sm">
              You&apos;ve unlocked {unlockedModels.length} new models!
            </div>
          </div>
        </div>

        {/* Unlocked Models */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-yellow-400" />
            New Models Unlocked
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unlockedModels.map((model, index) => (
              <div
                key={model}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:border-white/40 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {model.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="text-white/60 text-sm">
                      {model.includes('text-to-image') ? 'Text-to-Image' :
                       model.includes('text-to-video') ? 'Text-to-Video' :
                       model.includes('image-to-video') ? 'Image-to-Video' :
                       'Specialized Model'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Level Benefits
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <span>Access to {unlockedModels.length} premium AI models</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <span>Priority processing for faster generations</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <span>Reduced costs on selected models</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <span>Exclusive access to beta features</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className={`px-8 py-3 bg-gradient-to-r ${getLevelColor(currentLevel)} text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105`}
          >
            Continue Creating
          </button>
        </div>
      </div>
    </div>
  );
};
