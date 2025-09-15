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
    // Get all active model costs
    const { data: modelCosts, error } = await supabase
      .from('model_costs')
      .select('model_name, cost_per_generation, allowed_tiers, is_active')
      .eq('is_active', true)
      .order('cost_per_generation', { ascending: true });

    if (error) {
      console.error('Error fetching model costs:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch model costs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      models: modelCosts || []
    });

  } catch (error) {
    console.error('Error in model costs API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
