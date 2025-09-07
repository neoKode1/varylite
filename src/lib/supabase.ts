import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vqmzepfbgbwtzbpmrevx.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbXplcGZiZ2J3dHpicG1yZXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNDk5NjgsImV4cCI6MjA3MjcyNTk2OH0.vwKODtk4ScXWv8ZCTqtkmlMeYLWhUrInxrhaYZnEVqo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable to prevent redirect issues on mobile
    flowType: 'pkce' // Use PKCE flow for better mobile compatibility
  }
})

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          profile_picture: string | null
          created_at: string
          updated_at: string
          preferences: any | null
          usage_stats: any | null
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          profile_picture?: string | null
          created_at?: string
          updated_at?: string
          preferences?: any | null
          usage_stats?: any | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          profile_picture?: string | null
          created_at?: string
          updated_at?: string
          preferences?: any | null
          usage_stats?: any | null
        }
      }
      galleries: {
        Row: {
          id: string
          user_id: string
          variation_id: string
          description: string
          angle: string
          pose: string
          image_url: string | null
          video_url: string | null
          file_type: 'image' | 'video'
          original_prompt: string
          original_image_preview: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          variation_id: string
          description: string
          angle: string
          pose: string
          image_url?: string | null
          video_url?: string | null
          file_type: 'image' | 'video'
          original_prompt: string
          original_image_preview?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          variation_id?: string
          description?: string
          angle?: string
          pose?: string
          image_url?: string | null
          video_url?: string | null
          file_type?: 'image' | 'video'
          original_prompt?: string
          original_image_preview?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      usage_tracking: {
        Row: {
          id: string
          user_id: string | null
          session_id: string
          action_type: 'image_generation' | 'video_generation' | 'character_variation' | 'background_change'
          service_used: 'nano_banana' | 'runway_aleph' | 'minimax_endframe' | 'gemini'
          created_at: string
          metadata: any | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id: string
          action_type: 'image_generation' | 'video_generation' | 'character_variation' | 'background_change'
          service_used: 'nano_banana' | 'runway_aleph' | 'minimax_endframe' | 'gemini'
          created_at?: string
          metadata?: any | null
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string
          action_type?: 'image_generation' | 'video_generation' | 'character_variation' | 'background_change'
          service_used?: 'nano_banana' | 'runway_aleph' | 'minimax_endframe' | 'gemini'
          created_at?: string
          metadata?: any | null
        }
      }
    }
  }
}
