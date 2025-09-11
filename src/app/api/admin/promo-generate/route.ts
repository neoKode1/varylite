import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { description, maxUses, expiresAt } = await request.json();

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

    // Check if user is admin (Chad)
    if (user.email !== '1deeptechnology@gmail.com') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Generate a unique promo code
    const generatePromoCode = () => {
      const prefix = 'SECRET';
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `${prefix}${timestamp}${random}`;
    };

    let promoCode = generatePromoCode();
    
    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('promo_codes')
        .select('code')
        .eq('code', promoCode)
        .single();

      if (!existing) break;
      
      promoCode = generatePromoCode();
      attempts++;
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'Failed to generate unique promo code' },
        { status: 500 }
      );
    }

    // Create the promo code in database
    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        code: promoCode,
        description: description || `Admin Generated - ${new Date().toLocaleDateString()}`,
        access_type: 'secret_level',
        max_uses: maxUses || 1,
        used_count: 0,
        expires_at: expiresAt || null,
        created_by: user.id,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating promo code:', error);
      return NextResponse.json(
        { error: 'Failed to create promo code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      promoCode: data.code,
      description: data.description,
      maxUses: data.max_uses,
      expiresAt: data.expires_at
    });
  } catch (error) {
    console.error('Error in promo code generation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
