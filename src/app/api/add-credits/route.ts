import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface AddCreditsRequest {
  userId: string;
  amount: number;
  source: string;
}

interface AddCreditsResponse {
  success: boolean;
  message: string;
  newBalance?: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<AddCreditsResponse>> {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Check authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const body: AddCreditsRequest = await request.json();
    const { userId, amount, source } = body;

    // Validate input
    if (!amount || amount <= 0 || amount > 1000) {
      return NextResponse.json(
        { success: false, message: 'Invalid credit amount. Must be between $0.01 and $1000' },
        { status: 400 }
      );
    }

    // Check if user is adding credits for themselves or is admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (user.id !== userId && !userData.is_admin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to add credits for this user' },
        { status: 403 }
      );
    }

    // Add credits to user account
    console.log('🔧 [ADD CREDITS] Attempting to add credits:', { userId, amount, source });
    
    // Try the RPC function first (using correct parameter names from the hint)
    const { error: creditError } = await supabaseAdmin.rpc('add_user_credits', {
      p_user_id: userId,
      p_credits: amount,
      p_description: `Credits added via ${source}`,
      p_transaction_type: 'credit'
    });

    if (creditError) {
      console.error('❌ [ADD CREDITS] RPC function failed:', creditError);
      console.error('❌ [ADD CREDITS] Full error details:', JSON.stringify(creditError, null, 2));
      
      // Fallback: Try direct insertion into credit_transactions table
      console.log('🔄 [ADD CREDITS] Attempting fallback method...');
      
      const { error: fallbackError } = await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: amount,
          transaction_type: 'credit',
          description: `Credits added via ${source}`,
          created_at: new Date().toISOString()
        });

      if (fallbackError) {
        console.error('❌ [ADD CREDITS] Fallback method also failed:', fallbackError);
        return NextResponse.json(
          { success: false, message: 'Failed to add credits to account', error: `RPC: ${creditError.message}, Fallback: ${fallbackError.message}` },
          { status: 500 }
        );
      }

      console.log('✅ [ADD CREDITS] Credits added via fallback method');
    } else {
      console.log('✅ [ADD CREDITS] Credits added successfully via RPC');
    }

    // Get updated balance
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .from('user_credits')
      .select('current_balance')
      .eq('user_id', userId)
      .single();

    if (balanceError) {
      console.error('Error fetching updated balance:', balanceError);
      // Still return success since credits were added
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added $${amount} credits to your account`,
      newBalance: balanceData?.current_balance || null
    });

  } catch (error) {
    console.error('Add credits error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
