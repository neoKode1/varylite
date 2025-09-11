import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (user.email !== '1deeptechnology@gmail.com') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all users who have redeemed promo codes
    const { data: promoUsers, error } = await supabase
      .from('user_promo_access')
      .select(`
        id,
        redeemed_at,
        promo_codes (
          id,
          code,
          description,
          access_type,
          max_uses,
          used_count,
          expires_at,
          created_at,
          created_by
        ),
        user_id
      `)
      .order('redeemed_at', { ascending: false });

    if (error) {
      console.error('Error fetching promo users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch promo users' },
        { status: 500 }
      );
    }

    // Get user details for each promo user
    const userIds = promoUsers?.map(pu => pu.user_id) || [];
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, display_name, username, created_at, secret_level, total_generations, unique_models_used')
      .in('id', userIds);

    if (usersError) {
      console.error('Error fetching user details:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch user details' },
        { status: 500 }
      );
    }

    // Combine promo access with user details
    const combinedData = promoUsers?.map(promoAccess => {
      const userDetails = users?.find(u => u.id === promoAccess.user_id);
      return {
        ...promoAccess,
        user: userDetails
      };
    }) || [];

    return NextResponse.json({
      success: true,
      promoUsers: combinedData
    });

  } catch (error) {
    console.error('Error in admin promo users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
