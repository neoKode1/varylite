import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper function to check if user is active (active within last 30 minutes)
const isUserActive = (lastActive: Date): boolean => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  return lastActive > thirtyMinutesAgo;
};

// Helper function to get user stats from database
const getUserStatsFromDB = async () => {
  try {
    // Get total users count
    const { count: totalUsers, error: totalUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (totalUsersError) {
      console.error('Error fetching total users:', totalUsersError);
      throw totalUsersError;
    }

    // Get new users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: newUsersToday, error: newUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    if (newUsersError) {
      console.error('Error fetching new users today:', newUsersError);
      throw newUsersError;
    }

    // Get active users (users who have used the app in the last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const { count: activeUsers, error: activeUsersError } = await supabase
      .from('usage_tracking')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', thirtyMinutesAgo.toISOString())
      .not('user_id', 'is', null);

    if (activeUsersError) {
      console.error('Error fetching active users:', activeUsersError);
      throw activeUsersError;
    }

    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      newUsersToday: newUsersToday || 0,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
};

// Helper function to track user activity in database
const trackUserActivity = async (userId: string, sessionId: string) => {
  try {
    // Insert usage tracking record
    const { error } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        session_id: sessionId,
        action_type: 'image_generation', // Default action for page views
        service_used: 'gemini', // Default service
        metadata: { type: 'page_view', timestamp: new Date().toISOString() }
      });

    if (error) {
      console.error('Error tracking user activity:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Database tracking error:', error);
    throw error;
  }
};

// GET endpoint to retrieve user statistics
export async function GET(request: NextRequest) {
  try {
    const stats = await getUserStatsFromDB();
    
    return NextResponse.json({
      totalUsers: stats.totalUsers,
      activeUsers: stats.activeUsers,
      newUsersToday: stats.newUsersToday,
      lastUpdated: stats.lastUpdated,
      status: 'success'
    });
    
  } catch (error) {
    console.error('User stats API error:', error);
    
    // Return fallback data on error
    return NextResponse.json({
      totalUsers: 0,
      activeUsers: 0,
      newUsersToday: 0,
      lastUpdated: new Date().toISOString(),
      status: 'error'
    }, { status: 500 });
  }
}

// POST endpoint to track user activity
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId, action } = await request.json();
    
    if (!userId || !sessionId) {
      return NextResponse.json({ error: 'User ID and Session ID are required' }, { status: 400 });
    }
    
    // Track user activity in database
    await trackUserActivity(userId, sessionId);
    
    // Get updated stats
    const stats = await getUserStatsFromDB();
    
    return NextResponse.json({
      message: 'User activity tracked',
      totalUsers: stats.totalUsers,
      activeUsers: stats.activeUsers,
      newUsersToday: stats.newUsersToday,
      status: 'success'
    });
    
  } catch (error) {
    console.error('User tracking error:', error);
    return NextResponse.json({ error: 'Failed to track user activity' }, { status: 500 });
  }
}

// Reset daily stats (call this at midnight) - Not needed with database approach
export async function PUT(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'refresh_stats') {
      const stats = await getUserStatsFromDB();
      
      return NextResponse.json({
        message: 'Stats refreshed',
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
        newUsersToday: stats.newUsersToday,
        lastUpdated: stats.lastUpdated,
        status: 'success'
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Refresh stats error:', error);
    return NextResponse.json({ error: 'Failed to refresh stats' }, { status: 500 });
  }
}
