import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vqmzepfbgbwtzbpmrevx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get user credit information including new user status
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('credit_balance, low_balance_threshold, tier, total_credits_purchased, last_credit_purchase, is_new_user, grace_period_expires_at, first_generation_at')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is in grace period
    const isInGracePeriod = userData.is_new_user && 
      userData.grace_period_expires_at && 
      new Date() <= new Date(userData.grace_period_expires_at);

    // For new users in grace period, show grace period info instead of credit balance
    let displayBalance = userData.credit_balance || 0;
    let displayMessage = null;
    
    if (isInGracePeriod) {
      // Calculate remaining grace period time
      const gracePeriodEnd = new Date(userData.grace_period_expires_at);
      const now = new Date();
      const hoursRemaining = Math.max(0, Math.floor((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60)));
      
      displayBalance = 0; // Show 0 credits for new users
      displayMessage = `Free trial: ${hoursRemaining}h remaining`;
    } else if (userData.is_new_user && !userData.grace_period_expires_at) {
      // New user who hasn't started grace period yet
      displayBalance = 0;
      displayMessage = 'Free trial available';
    }

    // Return credit summary
    const summary = {
      user_id: userId,
      current_balance: displayBalance,
      low_balance_threshold: userData.low_balance_threshold || 4,
      tier: userData.tier || 'pay_per_use',
      total_credits_purchased: userData.total_credits_purchased || 0,
      last_credit_purchase: userData.last_credit_purchase,
      is_new_user: userData.is_new_user,
      grace_period_expires_at: userData.grace_period_expires_at,
      grace_period_message: displayMessage
    };

    return NextResponse.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Error fetching user credits:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}