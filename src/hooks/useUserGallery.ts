'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { CharacterVariation } from '@/types/gemini'
import { getOptimizedImageUrl } from '@/lib/imageUtils'

interface StoredVariation extends CharacterVariation {
  timestamp: number
  originalPrompt: string
  originalImagePreview?: string
  videoUrl?: string
  fileType?: 'image' | 'video'
  databaseId?: string // Database primary key for deletion
}

interface UserGalleryHook {
  gallery: StoredVariation[]
  loading: boolean
  addToGallery: (variations: CharacterVariation[], originalPrompt: string, originalImagePreview?: string) => Promise<void>
  removeFromGallery: (variationId: string, timestamp: number) => Promise<void>
  clearGallery: () => Promise<void>
  removeDuplicates: () => void
  migrateLocalStorageToDatabase: () => Promise<void>
  saveToAccount: (variations: CharacterVariation[], originalPrompt: string, originalImagePreview?: string) => Promise<void>
}

export const useUserGallery = (): UserGalleryHook => {
  const { user } = useAuth()
  const [gallery, setGallery] = useState<StoredVariation[]>([])
  const [loading, setLoading] = useState(false)

  const loadFromDatabase = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading gallery from database:', error)
        return
      }

      const formattedGallery: StoredVariation[] = data.map((item) => ({
        id: item.variation_id,
        description: item.description,
        angle: item.angle,
        pose: item.pose,
        imageUrl: item.image_url, // Use direct URL without optimization for now
        videoUrl: item.video_url,
        fileType: item.file_type,
        timestamp: new Date(item.created_at).getTime(),
        originalPrompt: item.original_prompt,
        originalImagePreview: item.original_image_preview,
        databaseId: item.id // Preserve the database primary key
      }))

      setGallery(formattedGallery)
    } catch (error) {
      console.error('Error loading from database:', error)
    }
  }, [user])

  const loadGallery = useCallback(async () => {
    setLoading(true)
    try {
      if (user) {
        // Load from database for authenticated users
        await loadFromDatabase()
      } else {
        // Load from localStorage for anonymous users
        loadFromLocalStorage()
      }
    } catch (error) {
      console.error('Error loading gallery:', error)
    } finally {
      setLoading(false)
    }
  }, [user, loadFromDatabase])

  // Load gallery from appropriate source
  useEffect(() => {
    loadGallery()
  }, [user, loadGallery])

  const loadFromLocalStorage = () => {
    if (typeof window === 'undefined') return
    
    try {
      const savedGallery = localStorage.getItem('vari-ai-gallery')
      if (savedGallery) {
        setGallery(JSON.parse(savedGallery))
      }
    } catch (error) {
      console.error('Error loading gallery from localStorage:', error)
    }
  }

  const saveToDatabase = useCallback(async (variations: StoredVariation[]) => {
    if (!user) return

    try {
      const galleryData = variations.map(variation => ({
        user_id: user.id,
        variation_id: variation.id,
        description: variation.description,
        angle: variation.angle,
        pose: variation.pose,
        image_url: variation.imageUrl,
        video_url: variation.videoUrl,
        file_type: variation.fileType || (variation.videoUrl ? 'video' : 'image'),
        original_prompt: variation.originalPrompt,
        original_image_preview: variation.originalImagePreview
      }))

      const { error } = await supabase
        .from('galleries')
        .insert(galleryData)

      if (error) {
        console.error('Error saving to database:', error)
        throw error
      }
    } catch (error) {
      console.error('Error saving to database:', error)
      throw error
    }
  }, [user])

  const addToGallery = useCallback(async (
    newVariations: CharacterVariation[], 
    originalPrompt: string, 
    originalImagePreview?: string
  ) => {
    const baseTimestamp = Date.now()
    const storedVariations: StoredVariation[] = newVariations.map((variation, index) => ({
      ...variation,
      timestamp: baseTimestamp + index, // Ensure each variation has a unique timestamp
      originalPrompt,
      originalImagePreview,
      // Fix: Properly determine file type based on what's actually present
      fileType: variation.fileType || (variation.videoUrl ? 'video' : 'image')
    }))

    if (user) {
      // Save to database for authenticated users
      await saveToDatabase(storedVariations)
    } else {
      // Save to localStorage for anonymous users
      saveToLocalStorage(storedVariations)
    }

    setGallery(prev => {
      // Remove any existing duplicates before adding new items
      const existingKeys = new Set(prev.map(item => `${item.id}-${item.timestamp}`));
      const newItems = storedVariations.filter(item => 
        !existingKeys.has(`${item.id}-${item.timestamp}`)
      );
      
      if (newItems.length !== storedVariations.length) {
        console.log(`🔄 Filtered out ${storedVariations.length - newItems.length} duplicate items`);
      }
      
      return [...newItems, ...prev];
    })
  }, [user, saveToDatabase])

  const saveToLocalStorage = (variations: StoredVariation[]) => {
    if (typeof window === 'undefined') return
    
    try {
      const currentGallery = JSON.parse(localStorage.getItem('vari-ai-gallery') || '[]')
      const newGallery = [...variations, ...currentGallery]
      localStorage.setItem('vari-ai-gallery', JSON.stringify(newGallery))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }

  const removeFromGallery = useCallback(async (variationId: string, timestamp: number) => {
    console.log('🗑️ [REMOVE FROM GALLERY] Starting deletion:', { variationId, timestamp, user: user?.id })
    console.log('🗑️ [REMOVE FROM GALLERY] Current gallery items:', gallery.map(item => ({ id: item.id, timestamp: item.timestamp, databaseId: item.databaseId })))
    
    if (user) {
      // Find the item to get its database ID
      const itemToDelete = gallery.find(item => item.id === variationId && item.timestamp === timestamp)
      
      console.log('🗑️ [REMOVE FROM GALLERY] Item found:', itemToDelete)
      
      if (!itemToDelete) {
        console.error('❌ [REMOVE FROM GALLERY] Item not found:', { variationId, timestamp })
        console.log('🗑️ [REMOVE FROM GALLERY] Available items:', gallery.map(item => ({ id: item.id, timestamp: item.timestamp, hasDatabaseId: !!item.databaseId })))
        return
      }

      // If item doesn't have databaseId, just remove from local state (for older items)
      if (!itemToDelete.databaseId) {
        console.log('⚠️ [REMOVE FROM GALLERY] Item found but no databaseId, removing from local state only')
        setGallery(prev => {
          const newGallery = prev.filter(item => !(item.id === variationId && item.timestamp === timestamp))
          console.log('✅ [REMOVE FROM GALLERY] Updated gallery state (local only), new count:', newGallery.length)
          return newGallery
        })
        return
      }

      // Remove from database using the primary key
      try {
        console.log('🗑️ [REMOVE FROM GALLERY] Deleting from database:', itemToDelete.databaseId)
        
        const { error } = await supabase
          .from('galleries')
          .delete()
          .eq('id', itemToDelete.databaseId)
          .eq('user_id', user.id) // Extra security check

        if (error) {
          console.error('❌ [REMOVE FROM GALLERY] Error removing from database:', error)
          return
        }
        
        console.log('✅ [REMOVE FROM GALLERY] Successfully deleted item from database:', itemToDelete.databaseId)
      } catch (error) {
        console.error('❌ [REMOVE FROM GALLERY] Error removing from database:', error)
        return
      }
    } else {
      // Remove from localStorage
      try {
        console.log('🗑️ [REMOVE FROM GALLERY] Removing from localStorage')
        const currentGallery = JSON.parse(localStorage.getItem('vari-ai-gallery') || '[]')
        const newGallery = currentGallery.filter((item: StoredVariation) => 
          !(item.id === variationId && item.timestamp === timestamp)
        )
        localStorage.setItem('vari-ai-gallery', JSON.stringify(newGallery))
        console.log('✅ [REMOVE FROM GALLERY] Successfully removed from localStorage')
      } catch (error) {
        console.error('❌ [REMOVE FROM GALLERY] Error removing from localStorage:', error)
        return
      }
    }

    console.log('🗑️ [REMOVE FROM GALLERY] Updating local state')
    setGallery(prev => {
      const newGallery = prev.filter(item => !(item.id === variationId && item.timestamp === timestamp))
      console.log('✅ [REMOVE FROM GALLERY] Updated gallery state, new count:', newGallery.length)
      return newGallery
    })
  }, [user]) // Removed gallery dependency to avoid stale closure

  const clearGallery = useCallback(async () => {
    if (user) {
      // Clear from database
      try {
        const { error } = await supabase
          .from('galleries')
          .delete()
          .eq('user_id', user.id)

        if (error) {
          console.error('Error clearing database gallery:', error)
          return
        }
      } catch (error) {
        console.error('Error clearing database gallery:', error)
        return
      }
    } else {
      // Clear from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vari-ai-gallery')
      }
    }

    setGallery([])
  }, [user])

  const removeDuplicates = useCallback(() => {
    setGallery(prev => {
      const seen = new Set();
      const unique = prev.filter(item => {
        const key = `${item.id}-${item.timestamp}`;
        if (seen.has(key)) {
          console.log('🗑️ Removing duplicate gallery item:', key);
          return false;
        }
        seen.add(key);
        return true;
      });
      
      if (unique.length !== prev.length) {
        console.log(`🧹 Removed ${prev.length - unique.length} duplicate items from gallery`);
        return unique;
      }
      
      // No duplicates found, return original array to prevent unnecessary re-renders
      return prev;
    });
  }, [])

  const migrateLocalStorageToDatabase = useCallback(async () => {
    if (!user) return

    try {
      if (typeof window === 'undefined') return
      
      const localGallery = JSON.parse(localStorage.getItem('vari-ai-gallery') || '[]')
      if (localGallery.length === 0) return

      // Save all local items to database
      await saveToDatabase(localGallery)
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vari-ai-gallery')
      }
      
      // Reload gallery from database
      await loadFromDatabase()
      
      console.log(`Migrated ${localGallery.length} items from localStorage to database`)
    } catch (error) {
      console.error('Error migrating localStorage to database:', error)
    }
  }, [user, saveToDatabase, loadFromDatabase])

  const saveToAccount = useCallback(async (
    variations: CharacterVariation[], 
    originalPrompt: string, 
    originalImagePreview?: string
  ) => {
    if (!user) {
      throw new Error('User must be signed in to save to account')
    }

    await addToGallery(variations, originalPrompt, originalImagePreview)
  }, [user, addToGallery])

  return {
    gallery,
    loading,
    addToGallery,
    removeFromGallery,
    clearGallery,
    removeDuplicates,
    migrateLocalStorageToDatabase,
    saveToAccount
  }
}
