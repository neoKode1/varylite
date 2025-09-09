import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [UserStats] Fetching comprehensive user statistics...');
    console.log('🔍 [UserStats] Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_KEY
    });
    
    // Use hardcoded Supabase configuration (same as client-side)
    const supabaseUrl = 'https://vqmzepfbgbwtzbpmrevx.supabase.co'
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbXplcGZiZ2J3dHpicG1yZXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNDk5NjgsImV4cCI6MjA3MjcyNTk2OH0.vwKODtk4ScXWv8ZCTqtkmlMeYLWhUrInxrhaYZnEVqo'
    
    // Create a server-side Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get current timestamp and calculate time ranges
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    console.log('📊 [UserStats] Time ranges:', {
      now: now.toISOString(),
      twentyFourHoursAgo: twentyFourHoursAgo.toISOString(),
      sevenDaysAgo: sevenDaysAgo.toISOString(),
      thirtyDaysAgo: thirtyDaysAgo.toISOString()
    });

    // 1. Get total user count
    const { count: totalUsers, error: totalUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (totalUsersError) {
      console.error('❌ [UserStats] Error fetching total users:', totalUsersError);
    }

    // 2. Get new users in last 24 hours
    const { count: newUsers24h, error: newUsers24hError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (newUsers24hError) {
      console.error('❌ [UserStats] Error fetching new users 24h:', newUsers24hError);
    }

    // 3. Get new users in last 7 days
    const { count: newUsers7d, error: newUsers7dError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    if (newUsers7dError) {
      console.error('❌ [UserStats] Error fetching new users 7d:', newUsers7dError);
    }

    // 4. Get active users (users with activity in last 24 hours)
    // We'll consider users active if they have usage_tracking entries in the last 24 hours
    const { data: activeUsersData, error: activeUsersError } = await supabase
      .from('usage_tracking')
      .select('user_id')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .not('user_id', 'is', null);

    if (activeUsersError) {
      console.error('❌ [UserStats] Error fetching active users:', activeUsersError);
    }

    // Count unique active users
    const activeUsers = activeUsersData ? new Set(activeUsersData.map(u => u.user_id)).size : 0;

    // 5. Get total usage statistics
    const { count: totalGenerations, error: totalGenerationsError } = await supabase
      .from('usage_tracking')
      .select('*', { count: 'exact', head: true });

    if (totalGenerationsError) {
      console.error('❌ [UserStats] Error fetching total generations:', totalGenerationsError);
    }

    // 6. Get usage breakdown by type
    const { data: usageBreakdown, error: usageBreakdownError } = await supabase
      .from('usage_tracking')
      .select('action_type, service_used')
      .not('user_id', 'is', null);

    if (usageBreakdownError) {
      console.error('❌ [UserStats] Error fetching usage breakdown:', usageBreakdownError);
    }

    // Process usage breakdown
    const breakdown = {
      image_generations: 0,
      video_generations: 0,
      character_variations: 0,
      background_changes: 0,
      nano_banana: 0,
      runway_aleph: 0,
      minimax_endframe: 0,
      gemini: 0
    };

    if (usageBreakdown) {
      usageBreakdown.forEach(usage => {
        if (usage.action_type) {
          breakdown[usage.action_type as keyof typeof breakdown]++;
        }
        if (usage.service_used) {
          breakdown[usage.service_used as keyof typeof breakdown]++;
        }
      });
    }

    // 7. Get recent activity (last 7 days)
    const { count: recentActivity, error: recentActivityError } = await supabase
      .from('usage_tracking')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    if (recentActivityError) {
      console.error('❌ [UserStats] Error fetching recent activity:', recentActivityError);
    }

    // 8. Calculate growth rates
    const dailyGrowthRate = newUsers24h && totalUsers ? 
      ((newUsers24h / totalUsers) * 100).toFixed(2) : '0.00';
    
    const weeklyGrowthRate = newUsers7d && totalUsers ? 
      ((newUsers7d / totalUsers) * 100).toFixed(2) : '0.00';

    // 9. Calculate engagement metrics
    const avgGenerationsPerUser = totalUsers && totalGenerations ? 
      (totalGenerations / totalUsers).toFixed(1) : '0.0';
    
    const activeUserPercentage = totalUsers && activeUsers ? 
      ((activeUsers / totalUsers) * 100).toFixed(1) : '0.0';

    const stats = {
      totalUsers: totalUsers || 0,
      newUsers24h: newUsers24h || 0,
      newUsers7d: newUsers7d || 0,
      activeUsers: activeUsers,
      totalGenerations: totalGenerations || 0,
      recentActivity: recentActivity || 0,
      usageBreakdown: breakdown,
      growthRates: {
        daily: dailyGrowthRate,
        weekly: weeklyGrowthRate
      },
      engagement: {
        avgGenerationsPerUser: avgGenerationsPerUser,
        activeUserPercentage: activeUserPercentage
      },
      lastUpdated: now.toISOString(),
      period: 'Real-time data from Supabase'
    };

    console.log('✅ [UserStats] User statistics:', {
      totalUsers: stats.totalUsers,
      activeUsers: stats.activeUsers,
      newUsers24h: stats.newUsers24h,
      totalGenerations: stats.totalGenerations
    });

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ [UserStats] API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          totalUsers: 0,
          activeUsers: 0,
          newUsers24h: 0,
          totalGenerations: 0,
          lastUpdated: new Date().toISOString(),
          period: 'Error fetching data'
        }
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}