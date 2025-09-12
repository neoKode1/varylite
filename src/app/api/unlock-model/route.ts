import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Check authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check if user has secret access
    const { data: hasAccess, error: accessError } = await supabaseAdmin.rpc('user_has_secret_access', {
      user_uuid: user.id
    });

    if (accessError || !hasAccess) {
      return NextResponse.json(
        { error: 'Secret Level access required to unlock models' },
        { status: 403 }
      );
    }

    const { modelName } = await request.json();

    if (!modelName) {
      return NextResponse.json(
        { error: 'Model name is required' },
        { status: 400 }
      );
    }

    // Check if model is already unlocked
    const { data: existingUnlock, error: checkError } = await supabaseAdmin
      .from('user_unlocked_models')
      .select('*')
      .eq('user_id', user.id)
      .eq('model_name', modelName)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing unlock:', checkError);
      return NextResponse.json(
        { error: 'Failed to check model unlock status' },
        { status: 500 }
      );
    }

    if (existingUnlock) {
      return NextResponse.json({
        success: true,
        message: 'Model already unlocked',
        alreadyUnlocked: true
      });
    }

    // Unlock the model
    const { data: unlockData, error: unlockError } = await supabaseAdmin
      .from('user_unlocked_models')
      .insert({
        user_id: user.id,
        model_name: modelName,
        unlocked_at: new Date().toISOString()
      })
      .select()
      .single();

    if (unlockError) {
      console.error('Error unlocking model:', unlockError);
      return NextResponse.json(
        { error: 'Failed to unlock model' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Model unlocked successfully',
      unlockData
    });

  } catch (error) {
    console.error('Error in unlock model API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Check authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Get all unlocked models for the user
    const { data: unlockedModels, error: fetchError } = await supabaseAdmin
      .from('user_unlocked_models')
      .select('model_name, unlocked_at')
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching unlocked models:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch unlocked models' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      unlockedModels: unlockedModels || []
    });

  } catch (error) {
    console.error('Error in get unlocked models API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
