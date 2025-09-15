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

    // Get user credit information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('credit_balance, low_balance_threshold, tier, total_credits_purchased, last_credit_purchase')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Return credit summary
    const summary = {
      user_id: userId,
      current_balance: userData.credit_balance || 0,
      low_balance_threshold: userData.low_balance_threshold || 4,
      tier: userData.tier || 'pay_per_use',
      total_credits_purchased: userData.total_credits_purchased || 0,
      last_credit_purchase: userData.last_credit_purchase
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