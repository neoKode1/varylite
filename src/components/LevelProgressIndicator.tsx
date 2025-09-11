'use client';

import React from 'react';
import { Star, Zap, Trophy, Gift, Sparkles, Crown } from 'lucide-react';

interface LevelProgressIndicatorProps {
  level: number;
  totalGenerations: number;
  uniqueModelsUsed: number;
  progressToNext: {
    current: number;
    total: number;
    percentage: number;
  };
  modelsNeededForNext: number;
}

export const LevelProgressIndicator: React.FC<LevelProgressIndicatorProps> = ({
  level,
  totalGenerations,
  uniqueModelsUsed,
  progressToNext,
  modelsNeededForNext
}) => {
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
    if (level <= 2) return <Star className="w-5 h-5" />;
    if (level <= 4) return <Zap className="w-5 h-5" />;
    if (level <= 6) return <Trophy className="w-5 h-5" />;
    if (level <= 8) return <Gift className="w-5 h-5" />;
    return <Crown className="w-5 h-5" />;
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
      {/* Level Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-r ${getLevelColor(level)} text-white`}>
            {getLevelIcon(level)}
          </div>
          <div>
            <div className={`text-lg font-bold bg-gradient-to-r ${getLevelColor(level)} bg-clip-text text-transparent`}>
              Level {level}
            </div>
            <div className="text-white/70 text-sm">
              {getLevelTitle(level)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-white font-semibold">{uniqueModelsUsed}</div>
          <div className="text-white/60 text-xs">Models Used</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/80 text-sm">Progress to Level {level + 1}</span>
          <span className="text-white/60 text-sm">
            {progressToNext.current}/{progressToNext.total}
          </span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getLevelColor(level)} transition-all duration-500 ease-out`}
            style={{ width: `${progressToNext.percentage}%` }}
          />
        </div>
        <div className="text-center mt-2">
          <span className="text-white/60 text-sm">
            {modelsNeededForNext} more unique models needed
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-white font-semibold">{totalGenerations}</div>
          <div className="text-white/60 text-xs">Total Generations</div>
        </div>
        <div className="text-center">
          <div className="text-white font-semibold">{Math.round(progressToNext.percentage)}%</div>
          <div className="text-white/60 text-xs">Level Progress</div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
        <div className="text-white/80 text-sm">
          <strong>💡 Tip:</strong> Try different model combinations to unlock new models faster!
        </div>
      </div>
    </div>
  );
};
