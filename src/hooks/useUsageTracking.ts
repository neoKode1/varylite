'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface UsageStats {
  totalGenerations: number
  imageGenerations: number
  videoGenerations: number
  characterVariations: number
  backgroundChanges: number
  lastActivity: string | null
}

interface UsageTrackingHook {
  usageStats: UsageStats
  canGenerate: boolean
  remainingGenerations: number
  trackUsage: (actionType: 'image_generation' | 'video_generation' | 'character_variation' | 'background_change', serviceUsed: 'nano_banana' | 'runway_aleph' | 'minimax_endframe' | 'gemini', metadata?: any) => Promise<void>
  getSessionId: () => string
  isAnonymous: boolean
}

const ANONYMOUS_LIMIT = 3 // 3 generations for anonymous users

export const useUsageTracking = (): UsageTrackingHook => {
  const { user } = useAuth()
  const [usageStats, setUsageStats] = useState<UsageStats>({
    totalGenerations: 0,
    imageGenerations: 0,
    videoGenerations: 0,
    characterVariations: 0,
    backgroundChanges: 0,
    lastActivity: null
  })
  const [sessionId] = useState(() => {
    // Generate or retrieve session ID from localStorage
    if (typeof window === 'undefined') return 'server-session'
    
    const stored = localStorage.getItem('varyai-session-id')
    if (stored) return stored
    
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('varyai-session-id', newSessionId)
    return newSessionId
  })

  const isAnonymous = !user

  const loadUserStats = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('usage_stats')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error loading user stats:', error)
        return
      }

      if (data?.usage_stats) {
        setUsageStats({
          totalGenerations: data.usage_stats.total_generations || 0,
          imageGenerations: data.usage_stats.image_generations || 0,
          videoGenerations: data.usage_stats.video_generations || 0,
          characterVariations: data.usage_stats.character_variations || 0,
          backgroundChanges: data.usage_stats.background_changes || 0,
          lastActivity: data.usage_stats.last_activity
        })
      }
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }, [user])

  // Load usage stats for authenticated users
  useEffect(() => {
    if (user) {
      loadUserStats()
    } else {
      // For anonymous users, check localStorage for usage count
      loadAnonymousStats()
    }
  }, [user, loadUserStats])

  const loadAnonymousStats = () => {
    if (typeof window === 'undefined') return
    
    const stored = localStorage.getItem('varyai-anonymous-usage')
    if (stored) {
      try {
        const stats = JSON.parse(stored)
        setUsageStats(stats)
      } catch (error) {
        console.error('Error parsing anonymous usage stats:', error)
      }
    }
  }

  const saveAnonymousStats = (stats: UsageStats) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('varyai-anonymous-usage', JSON.stringify(stats))
  }

  const trackUsage = useCallback(async (
    actionType: 'image_generation' | 'video_generation' | 'character_variation' | 'background_change',
    serviceUsed: 'nano_banana' | 'runway_aleph' | 'minimax_endframe' | 'gemini' | 'veo3_fast' | 'minimax_2.0',
    metadata: any = {}
  ) => {
    try {
      // Update local stats
      const newStats = { ...usageStats }
      newStats.totalGenerations += 1
      newStats.lastActivity = new Date().toISOString()

      switch (actionType) {
        case 'image_generation':
          newStats.imageGenerations += 1
          break
        case 'video_generation':
          newStats.videoGenerations += 1
          break
        case 'character_variation':
          newStats.characterVariations += 1
          break
        case 'background_change':
          newStats.backgroundChanges += 1
          break
      }

      setUsageStats(newStats)

      if (user) {
        // Track in database for authenticated users
        const { error } = await supabase
          .from('usage_tracking')
          .insert({
            user_id: user.id,
            session_id: sessionId,
            action_type: actionType,
            service_used: serviceUsed,
            metadata
          })

        if (error) {
          console.error('Error tracking usage:', error)
        }

        // Update user stats in database
        const { error: updateError } = await supabase
          .from('users')
          .update({
            usage_stats: {
              total_generations: newStats.totalGenerations,
              image_generations: newStats.imageGenerations,
              video_generations: newStats.videoGenerations,
              character_variations: newStats.characterVariations,
              background_changes: newStats.backgroundChanges,
              last_activity: newStats.lastActivity
            }
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('Error updating user stats:', updateError)
        }
      } else {
        // Save to localStorage for anonymous users
        saveAnonymousStats(newStats)
      }
    } catch (error) {
      console.error('Error tracking usage:', error)
    }
  }, [user, usageStats, sessionId])

  const canGenerate = user ? true : usageStats.totalGenerations < ANONYMOUS_LIMIT
  const remainingGenerations = user ? Infinity : Math.max(0, ANONYMOUS_LIMIT - usageStats.totalGenerations)

  return {
    usageStats,
    canGenerate,
    remainingGenerations,
    trackUsage,
    getSessionId: () => sessionId,
    isAnonymous
  }
}
