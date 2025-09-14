import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('🔍 User Credits API called:', { userId });

    if (!userId) {
      console.error('❌ User ID is required');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Return all models accessible to all users (no tier restrictions)
    const allModels = [
      {
        model_name: 'nano-banana',
        display_name: 'Nano Banana',
        cost_per_generation: 0.0398,
        category: 'basic',
        is_secret_level: false,
        generations_possible: 999,
        total_cost: 0
      },
      {
        model_name: 'runway-t2i',
        display_name: 'Runway T2I',
        cost_per_generation: 0.0398,
        category: 'basic',
        is_secret_level: false,
        generations_possible: 999,
        total_cost: 0
      },
      {
        model_name: 'veo3-fast',
        display_name: 'VEO3 Fast',
        cost_per_generation: 0.15,
        category: 'premium',
        is_secret_level: false,
        generations_possible: 999,
        total_cost: 0
      },
      {
        model_name: 'sync/lipsync-2-pro',
        display_name: 'LipSync 2 Pro',
        cost_per_generation: 0.25,
        category: 'premium',
        is_secret_level: false, // Changed from true to false
        generations_possible: 999,
        total_cost: 0
      },
      {
        model_name: 'bytedance/seedream-3',
        display_name: 'Seedream 3',
        cost_per_generation: 0.0398,
        category: 'basic',
        is_secret_level: false,
        generations_possible: 999,
        total_cost: 0
      },
      {
        model_name: 'bytedance/seedream-4',
        display_name: 'Seedream 4',
        cost_per_generation: 0.0398,
        category: 'basic',
        is_secret_level: false,
        generations_possible: 999,
        total_cost: 0
      },
      {
        model_name: 'bytedance/seedance-1-pro',
        display_name: 'Seedance 1 Pro',
        cost_per_generation: 0.15,
        category: 'premium',
        is_secret_level: false,
        generations_possible: 999,
        total_cost: 0
      },
      {
        model_name: 'seedance-pro',
        display_name: 'Seedance Pro',
        cost_per_generation: 2.50,
        category: 'ultra-premium',
        is_secret_level: false, // Changed from true to false
        generations_possible: 999,
        total_cost: 0
      }
    ];

    // Group calculations by category
    const groupedCalculations = {
      basic: allModels.filter((calc: any) => calc.category === 'basic'),
      premium: allModels.filter((calc: any) => calc.category === 'premium'),
      ultraPremium: allModels.filter((calc: any) => calc.category === 'ultra-premium')
    };

    const summary = {
      user_id: userId,
      current_balance: 999.00, // Give everyone unlimited credits
      total_base_generations: 999,
      total_premium_generations: 999,
      total_ultra_premium_generations: 999,
      cheapest_model: 'nano-banana',
      cheapest_cost: 0.0398,
      most_expensive_model: 'seedance-pro',
      most_expensive_cost: 2.50
    };

    console.log('✅ Returning all models accessible to all users:', allModels.length, 'models');

    return NextResponse.json({
      success: true,
      summary: summary,
      calculations: groupedCalculations,
      totalModels: allModels.length
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
