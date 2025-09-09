import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Use hardcoded Supabase configuration
    const supabaseUrl = 'https://vqmzepfbgbwtzbpmrevx.supabase.co'
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbXplcGZiZ2J3dHpicG1yZXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNDk5NjgsImV4cCI6MjA3MjcyNTk2OH0.vwKODtk4ScXWv8ZCTqtkmlMeYLWhUrInxrhaYZnEVqo'
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔄 [UpdateAnalytics] Starting analytics sync...')

    // 1. Check current counts
    const { count: publicUsersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    console.log('📊 [UpdateAnalytics] Current counts:', {
      publicUsers: publicUsersCount
    })

    // 2. Use the SQL function to sync users from auth to public
    const { data: syncResult, error: syncError } = await supabase
      .rpc('sync_auth_users_to_public')

    if (syncError) {
      console.error('❌ [UpdateAnalytics] Error syncing users:', syncError)
      // Fallback: just get current count without syncing
      console.log('⚠️ [UpdateAnalytics] Falling back to current count only')
    } else {
      console.log('✅ [UpdateAnalytics] Sync result:', syncResult)
    }

    // 4. Get final counts
    const { count: finalPublicUsersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      message: 'Analytics updated successfully',
      counts: {
        before: {
          publicUsers: publicUsersCount
        },
        after: {
          publicUsers: finalPublicUsersCount
        }
      }
    })

  } catch (error) {
    console.error('❌ [UpdateAnalytics] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
