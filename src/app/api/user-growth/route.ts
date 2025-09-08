import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [UserGrowth] Fetching 24-hour user growth data...');
    
    // Calculate 24 hours ago timestamp
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    console.log('📊 [UserGrowth] Time range:', {
      from: twentyFourHoursAgo.toISOString(),
      to: new Date().toISOString()
    });

    // Query for new users in the last 24 hours
    const { data: newUsers, error } = await supabase
      .from('users')
      .select('id, created_at, email')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [UserGrowth] Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    const newUserCount = newUsers?.length || 0;
    
    console.log('✅ [UserGrowth] User growth data:', {
      newUsers24h: newUserCount,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: {
        newUsers24h: newUserCount,
        timestamp: new Date().toISOString(),
        period: '24 hours'
      }
    });

  } catch (error) {
    console.error('❌ [UserGrowth] API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
