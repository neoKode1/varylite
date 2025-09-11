import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Promo code is required' },
        { status: 400 }
      );
    }

    // Get the current session
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Call the redeem_promo_code function
    const { data, error } = await supabase.rpc('redeem_promo_code', {
      code_text: code,
      user_uuid: user.id
    });

    if (error) {
      console.error('Error redeeming promo code:', error);
      return NextResponse.json(
        { error: 'Failed to redeem promo code' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in promo code API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Hardcoded admin access for Chad (@1deeptechnology)
    if (user.email === '1deeptechnology@gmail.com') {
      return NextResponse.json({ 
        hasAccess: true, 
        isAdmin: true,
        adminUser: 'Chad (@1deeptechnology)'
      });
    }

    // Check if user has secret access via promo codes
    const { data, error } = await supabase.rpc('user_has_secret_access', {
      user_uuid: user.id
    });

    if (error) {
      console.error('Error checking secret access:', error);
      return NextResponse.json(
        { error: 'Failed to check access' },
        { status: 500 }
      );
    }

    return NextResponse.json({ hasAccess: data });
  } catch (error) {
    console.error('Error in promo access check API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
