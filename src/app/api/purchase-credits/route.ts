import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

interface PurchaseCreditsRequest {
  amount: number; // Dollar amount of credits to purchase
  userId: string;
}

interface PurchaseCreditsResponse {
  success: boolean;
  message: string;
  clientSecret?: string | null;
  paymentIntentId?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<PurchaseCreditsResponse>> {
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

    const body: PurchaseCreditsRequest = await request.json();
    const { amount, userId } = body;

    // Validate input
    if (!amount || amount <= 0 || amount > 1000) {
      return NextResponse.json(
        { success: false, message: 'Invalid credit amount. Must be between $0.01 and $1000' },
        { status: 400 }
      );
    }

    // Get or create user profile
    let { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_admin, name, email')
      .eq('id', user.id)
      .single();

    // If user doesn't exist, create a default profile
    if (userError && userError.code === 'PGRST116') {
      console.log('User profile not found, creating default profile for:', user.id);
      
      const defaultProfile = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        display_name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        username: user.email?.split('@')[0]?.toLowerCase().replace(/\s+/g, '_') || 'user',
        bio: 'AI enthusiast and creative explorer',
        profile_picture: null,
        social_links: {
          twitter: '',
          instagram: '',
          website: ''
        },
        background_image: null,
        preferences: {
          defaultModel: 'runway-t2i',
          defaultStyle: 'realistic',
          notifications: true,
          publicProfile: false,
          toastyNotifications: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('users')
        .insert(defaultProfile)
        .select('is_admin, name, email')
        .single();

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return NextResponse.json(
          { success: false, message: 'Failed to create user profile' },
          { status: 500 }
        );
      }

      userData = newProfile;
    } else if (userError || !userData) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is purchasing for themselves or is admin
    if (user.id !== userId && !userData.is_admin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to purchase credits for this user' },
        { status: 403 }
      );
    }

    // Create Stripe customer (always create new for simplicity)
    const customer = await stripe.customers.create({
      email: user.email,
      name: userData.name || user.email,
      metadata: {
        userId: user.id
      }
    });
    const customerId = customer.id;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      description: `Purchase ${amount} credits for ${user.email}`,
      metadata: {
        userId: user.id,
        type: 'credit_purchase',
        creditAmount: amount.toString()
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment intent created successfully',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Purchase credits error:', error);
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

// Webhook handler for successful payments
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Database connection not available' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { paymentIntentId, userId, creditAmount } = body;

    if (!paymentIntentId || !userId || !creditAmount) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { success: false, message: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Add credits to user
    const { error: creditError } = await supabaseAdmin.rpc('add_user_credits', {
      p_user_id: userId,
      p_amount: parseFloat(creditAmount),
      p_credit_type: 'purchased',
      p_description: `Credits purchased via Stripe payment ${paymentIntentId}`
    });

    if (creditError) {
      return NextResponse.json(
        { success: false, message: 'Failed to add credits', error: creditError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Credits added successfully'
    });

  } catch (error) {
    console.error('Confirm credits purchase error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
