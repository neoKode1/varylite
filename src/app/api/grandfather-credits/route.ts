import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

interface GrandfatherRequest {
  batchName: string;
  weeklyCharge: number; // $5.99 per week
  creditsPerUser: number; // $5.00 worth of credits (keeping $0.99 profit)
  maxUsers: number;
}

interface GrandfatherResponse {
  success: boolean;
  message: string;
  batchId?: string;
  processedUsers?: number;
  successfulCharges?: number;
  failedCharges?: number;
  errors?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse<GrandfatherResponse>> {
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

    // Check if user is admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.is_admin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body: GrandfatherRequest = await request.json();
    const { batchName, weeklyCharge, creditsPerUser, maxUsers } = body;

    // Validate input
    if (!batchName || weeklyCharge <= 0 || creditsPerUser <= 0 || maxUsers <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid input parameters' },
        { status: 400 }
      );
    }

    // Ensure profit margin (weeklyCharge should be at least $0.99 more than creditsPerUser)
    if (weeklyCharge - creditsPerUser < 0.99) {
      return NextResponse.json(
        { success: false, message: 'Weekly charge must be at least $0.99 more than credits given to ensure profit' },
        { status: 400 }
      );
    }

    // Create grandfathering batch record
    const totalBudget = weeklyCharge * maxUsers; // Total revenue from weekly charges
    const { data: batchData, error: batchError } = await supabaseAdmin
      .from('grandfathering_batch')
      .insert({
        batch_name: batchName,
        total_users: maxUsers,
        total_budget: totalBudget,
        credits_per_user: creditsPerUser,
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (batchError || !batchData) {
      return NextResponse.json(
        { success: false, message: 'Failed to create batch record' },
        { status: 500 }
      );
    }

    // Get all users with Stripe customers
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        name,
        stripe_customer_id
      `)
      .not('stripe_customer_id', 'is', null)
      .limit(maxUsers);

    if (usersError || !users) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    let processedUsers = 0;
    let successfulCharges = 0;
    let failedCharges = 0;
    const errors: string[] = [];

    // Process each user
    for (const userRecord of users) {
      try {
        processedUsers++;

        // Check if user already has grandfathered credits
        const { data: existingCredits } = await supabaseAdmin
          .from('user_credits')
          .select('id')
          .eq('user_id', userRecord.id)
          .eq('credit_type', 'grandfathered')
          .single();

        if (existingCredits) {
          errors.push(`User ${userRecord.email} already has grandfathered credits`);
          continue;
        }

        // Create Stripe payment intent for weekly charge
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(weeklyCharge * 100), // Convert to cents
          currency: 'usd',
          customer: userRecord.stripe_customer_id,
          description: `Weekly subscription credits for ${userRecord.email}`,
          metadata: {
            userId: userRecord.id,
            batchId: batchData.id,
            type: 'weekly_subscription'
          },
          confirm: true,
          payment_method_options: {
            card: {
              request_three_d_secure: 'automatic'
            }
          }
        });

        if (paymentIntent.status === 'succeeded') {
          // Add credits to user
          const { error: creditError } = await supabaseAdmin.rpc('add_user_credits', {
            p_user_id: userRecord.id,
            p_amount: creditsPerUser,
            p_credit_type: 'grandfathered',
            p_description: `Grandfathered credits from batch: ${batchName}`
          });

          if (creditError) {
            errors.push(`Failed to add credits for ${userRecord.email}: ${creditError.message}`);
            failedCharges++;
          } else {
            successfulCharges++;
          }
        } else {
          errors.push(`Payment failed for ${userRecord.email}: ${paymentIntent.status}`);
          failedCharges++;
        }

      } catch (error) {
        errors.push(`Error processing ${userRecord.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failedCharges++;
      }
    }

    // Update batch status
    const { error: updateError } = await supabaseAdmin
      .from('grandfathering_batch')
      .update({
        processed_users: processedUsers,
        successful_charges: successfulCharges,
        failed_charges: failedCharges,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', batchData.id);

    if (updateError) {
      errors.push(`Failed to update batch status: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `Grandfathering completed. Processed ${processedUsers} users.`,
      batchId: batchData.id,
      processedUsers,
      successfulCharges,
      failedCharges,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Grandfathering error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
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

    // Check if user is admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.is_admin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all grandfathering batches
    const { data: batches, error: batchesError } = await supabaseAdmin
      .from('grandfathering_batch')
      .select('*')
      .order('created_at', { ascending: false });

    if (batchesError) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch batches' },
        { status: 500 }
      );
    }

    // Get user credit statistics
    const { data: creditStats, error: creditError } = await supabaseAdmin
      .from('user_credits')
      .select(`
        user_id,
        total_credits,
        used_credits,
        available_credits,
        credit_type,
        created_at
      `)
      .eq('credit_type', 'grandfathered')
      .eq('is_active', true);

    if (creditError) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch credit statistics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      batches,
      creditStats: {
        totalUsersWithCredits: creditStats?.length || 0,
        totalCreditsDistributed: creditStats?.reduce((sum, credit) => sum + Number(credit.total_credits), 0) || 0,
        totalCreditsUsed: creditStats?.reduce((sum, credit) => sum + Number(credit.used_credits), 0) || 0,
        totalCreditsAvailable: creditStats?.reduce((sum, credit) => sum + Number(credit.available_credits), 0) || 0
      }
    });

  } catch (error) {
    console.error('Get grandfathering data error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
