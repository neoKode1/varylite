import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includeSecret = searchParams.get('includeSecret') === 'true';

    console.log('🔍 User Credits API called:', { userId, includeSecret });

    if (!userId) {
      console.error('❌ User ID is required');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase configuration missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's credit summary
    console.log('📊 Fetching credit summary for user:', userId);
    const { data: creditSummary, error: summaryError } = await supabase
      .rpc('get_user_credit_summary', { p_user_id: userId });

    if (summaryError) {
      console.error('❌ Error fetching credit summary:', summaryError);
      // Return a default summary if the function fails
      const defaultSummary = {
        user_id: userId,
        current_balance: 0.00,
        total_base_generations: 0,
        total_premium_generations: 0,
        total_ultra_premium_generations: 0,
        cheapest_model: 'nano-banana',
        cheapest_cost: 0.0398,
        most_expensive_model: 'seedance-pro',
        most_expensive_cost: 2.50
      };
      console.log('⚠️ Using default summary:', defaultSummary);
    }

    console.log('✅ Credit summary fetched:', creditSummary);

    // Get detailed generation calculations
    console.log('🧮 Fetching generation calculations for user:', userId, 'includeSecret:', includeSecret);
    const { data: generationCalculations, error: calcError } = await supabase
      .rpc('calculate_user_generations', { 
        p_user_id: userId, 
        p_include_secret: includeSecret 
      });

    if (calcError) {
      console.error('❌ Error fetching generation calculations:', calcError);
      // Return default calculations if the function fails
      const defaultCalculations = [
        {
          model_name: 'nano-banana',
          display_name: 'Nano Banana',
          cost_per_generation: 0.0398,
          category: 'basic',
          is_secret_level: false,
          generations_possible: 0,
          total_cost: 0
        },
        {
          model_name: 'runway-t2i',
          display_name: 'Runway T2I',
          cost_per_generation: 0.0398,
          category: 'basic',
          is_secret_level: false,
          generations_possible: 0,
          total_cost: 0
        },
        {
          model_name: 'veo3-fast',
          display_name: 'VEO3 Fast',
          cost_per_generation: 0.15,
          category: 'premium',
          is_secret_level: false,
          generations_possible: 0,
          total_cost: 0
        }
      ];
      console.log('⚠️ Using default calculations:', defaultCalculations.length, 'models');
    }

    console.log('✅ Generation calculations fetched:', generationCalculations?.length, 'models');

    // Use fallback data if there were errors
    const finalSummary = summaryError ? {
      user_id: userId,
      current_balance: 0.00,
      total_base_generations: 0,
      total_premium_generations: 0,
      total_ultra_premium_generations: 0,
      cheapest_model: 'nano-banana',
      cheapest_cost: 0.0398,
      most_expensive_model: 'seedance-pro',
      most_expensive_cost: 2.50
    } : creditSummary?.[0];

    const finalCalculations = calcError ? [
      {
        model_name: 'nano-banana',
        display_name: 'Nano Banana',
        cost_per_generation: 0.0398,
        category: 'basic',
        is_secret_level: false,
        generations_possible: 0,
        total_cost: 0
      },
      {
        model_name: 'runway-t2i',
        display_name: 'Runway T2I',
        cost_per_generation: 0.0398,
        category: 'basic',
        is_secret_level: false,
        generations_possible: 0,
        total_cost: 0
      },
      {
        model_name: 'veo3-fast',
        display_name: 'VEO3 Fast',
        cost_per_generation: 0.15,
        category: 'premium',
        is_secret_level: false,
        generations_possible: 0,
        total_cost: 0
      },
      {
        model_name: 'sync/lipsync-2-pro',
        display_name: 'LipSync 2 Pro',
        cost_per_generation: 0.08325,
        category: 'ultra-premium',
        is_secret_level: true,
        generations_possible: 0,
        total_cost: 0
      },
      {
        model_name: 'bytedance/seedream-3',
        display_name: 'Seedream 3',
        cost_per_generation: 0.03,
        category: 'basic',
        is_secret_level: false,
        generations_possible: 0,
        total_cost: 0
      },
      {
        model_name: 'bytedance/seedance-1-pro',
        display_name: 'Seedance 1 Pro',
        cost_per_generation: 0.15,
        category: 'premium',
        is_secret_level: false,
        generations_possible: 0,
        total_cost: 0
      }
    ] : generationCalculations;

    // Group calculations by category
    const groupedCalculations = {
      basic: finalCalculations?.filter((calc: any) => calc.category === 'basic') || [],
      premium: finalCalculations?.filter((calc: any) => calc.category === 'premium') || [],
      ultraPremium: finalCalculations?.filter((calc: any) => calc.category === 'ultra-premium') || []
    };

    return NextResponse.json({
      success: true,
      summary: finalSummary,
      calculations: groupedCalculations,
      totalModels: finalCalculations?.length || 0
    });

  } catch (error) {
    console.error('User credits API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, amount, description } = await request.json();

    if (!userId || !amount) {
      return NextResponse.json({ error: 'User ID and amount are required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Add credits to user
    const { data, error } = await supabase
      .rpc('add_user_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description || 'Credit addition'
      });

    if (error) {
      console.error('Error adding credits:', error);
      return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Added $${amount} credits to user`,
      newBalance: data
    });

  } catch (error) {
    console.error('Add credits API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
