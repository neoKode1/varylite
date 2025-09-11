import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { modelName, generationType, costCredits = 0 } = await request.json();

    if (!modelName || !generationType) {
      return NextResponse.json(
        { error: 'Model name and generation type are required' },
        { status: 400 }
      );
    }

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

    // Track model usage and check for level up
    const { data: result, error } = await supabase.rpc('track_model_usage', {
      user_uuid: user.id,
      model_name: modelName,
      generation_type: generationType,
      cost_credits: costCredits
    });

    if (error) {
      console.error('Error tracking model usage:', error);
      return NextResponse.json(
        { error: 'Failed to track model usage' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      leveledUp: result.leveled_up,
      currentLevel: result.current_level,
      previousLevel: result.previous_level,
      unlockedModels: result.unlocked_models
    });

  } catch (error) {
    console.error('Error in user progression API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Get user's current level and unlocked models
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('secret_level, total_generations, unique_models_used, last_level_up')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    // Get unlocked models for current level
    const { data: unlockedModels, error: modelsError } = await supabase.rpc(
      'get_level_unlocked_models',
      {
        user_uuid: user.id,
        target_level: userData.secret_level
      }
    );

    if (modelsError) {
      console.error('Error fetching unlocked models:', modelsError);
      return NextResponse.json(
        { error: 'Failed to fetch unlocked models' },
        { status: 500 }
      );
    }

    // Get model usage statistics
    const { data: modelUsage, error: usageError } = await supabase
      .from('model_usage')
      .select('model_name, generation_type, cost_credits')
      .eq('user_id', user.id);

    if (usageError) {
      console.error('Error fetching model usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to fetch model usage' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      level: userData.secret_level,
      totalGenerations: userData.total_generations,
      uniqueModelsUsed: userData.unique_models_used,
      lastLevelUp: userData.last_level_up,
      unlockedModels: unlockedModels || [],
      modelUsage: modelUsage || []
    });

  } catch (error) {
    console.error('Error in user progression GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
