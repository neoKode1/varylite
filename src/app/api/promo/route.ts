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
    // Give everyone access - no restrictions
    return NextResponse.json({ 
      hasAccess: true, // Always true - no restrictions
      isAdmin: false,
      adminUser: null
    });
  } catch (error) {
    console.error('Error in promo access check API:', error);
    return NextResponse.json(
      { 
        hasAccess: true, // Even on error, give access
        isAdmin: false,
        adminUser: null,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
