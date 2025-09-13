import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { batchName, weeklyCharge, creditsPerUser } = await request.json();

    // Validate input
    if (!batchName || !weeklyCharge || !creditsPerUser) {
      return NextResponse.json({ 
        error: 'Missing required fields: batchName, weeklyCharge, creditsPerUser' 
      }, { status: 400 });
    }

    // Validate amounts
    if (weeklyCharge <= 0 || creditsPerUser <= 0) {
      return NextResponse.json({ 
        error: 'Amounts must be positive' 
      }, { status: 400 });
    }

    // Validate profit margin (must be at least $0.99)
    const profitMargin = weeklyCharge - creditsPerUser;
    if (profitMargin < 0.99) {
      return NextResponse.json({ 
        error: 'Profit margin must be at least $0.99' 
      }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('💰 Processing weekly payment:', {
      batchName,
      weeklyCharge,
      creditsPerUser,
      profitMargin
    });

    // Call the database function to process the payment
    const { data, error } = await supabase
      .rpc('process_weekly_payment', {
        p_batch_name: batchName,
        p_weekly_charge: weeklyCharge,
        p_credits_per_user: creditsPerUser
      });

    if (error) {
      console.error('❌ Error processing weekly payment:', error);
      return NextResponse.json({ 
        error: 'Failed to process weekly payment',
        details: error.message 
      }, { status: 500 });
    }

    const result = data[0];

    console.log('✅ Weekly payment processed successfully:', result);

    return NextResponse.json({
      success: true,
      message: 'Weekly payment processed successfully',
      batchId: result.batch_id,
      totalUsers: result.total_users,
      totalRevenue: result.total_revenue,
      profitMargin: result.profit_margin,
      weeklyCharge,
      creditsPerUser
    });

  } catch (error) {
    console.error('❌ Weekly payment API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recent payment batches
    const { data: batches, error } = await supabase
      .from('grandfathering_batch')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching payment batches:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch payment batches' 
      }, { status: 500 });
    }

    // Get current user count with credits
    const { count: userCount, error: countError } = await supabase
      .from('user_credits')
      .select('*', { count: 'exact', head: true })
      .gt('balance', 0);

    if (countError) {
      console.error('❌ Error fetching user count:', countError);
    }

    // Get total credits in circulation
    const { data: totalCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('balance');

    if (creditsError) {
      console.error('❌ Error fetching total credits:', creditsError);
    }

    const totalCreditsInCirculation = totalCredits?.reduce((sum, user) => sum + parseFloat(user.balance), 0) || 0;

    return NextResponse.json({
      success: true,
      batches: batches || [],
      currentStats: {
        usersWithCredits: userCount || 0,
        totalCreditsInCirculation: totalCreditsInCirculation,
        averageCreditsPerUser: (userCount && userCount > 0) ? totalCreditsInCirculation / userCount : 0
      }
    });

  } catch (error) {
    console.error('❌ Weekly payment stats API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
