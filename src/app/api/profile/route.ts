import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// GET endpoint to retrieve user profile
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Profile API: GET request received');
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    console.log('🔍 Authorization header exists:', !!authHeader);
    
    if (!authHeader) {
      console.log('❌ No authorization header provided');
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Extract the token from the header
    const token = authHeader.replace('Bearer ', '');
    console.log('🔍 Token length:', token.length);
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    if (!user) {
      console.log('❌ No user found');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.id, user.email);

    // Get user profile from database
    let { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist, create it
    if (profileError && profileError.code === 'PGRST116') {
      console.log('Profile not found, creating new profile for user:', user.id);
      
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || 'VaryAI User',
          profile_picture: user.user_metadata?.avatar_url,
          preferences: {},
          usage_stats: {
            total_generations: 0,
            image_generations: 0,
            video_generations: 0,
            character_variations: 0,
            background_changes: 0,
            last_activity: null
          }
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }

      // Use the newly created profile
      profile = newProfile;
    } else if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Get user's gallery items
    const { data: galleryItems, error: galleryError } = await supabase
      .from('galleries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (galleryError) {
      console.error('Error fetching gallery:', galleryError);
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        profile_picture: profile.profile_picture,
        bio: profile.bio || 'AI enthusiast and creative explorer',
        social_links: profile.social_links || {},
        preferences: profile.preferences || {},
        usage_stats: profile.usage_stats || {},
        created_at: profile.created_at,
        updated_at: profile.updated_at
      },
      gallery: galleryItems || [],
      status: 'success'
    });

  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT endpoint to update user profile
export async function PUT(request: NextRequest) {
  try {
    console.log('🔍 Profile API: PUT request received');
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('❌ No authorization header provided');
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Extract the token from the header
    const token = authHeader.replace('Bearer ', '');
    console.log('🔍 Token length:', token.length);
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    if (!user) {
      console.log('❌ No user found');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.id, user.email);

    const body = await request.json();
    const { name, profile_picture, bio, social_links, preferences } = body;
    
    console.log('🔍 Update data:', {
      name: name ? 'provided' : 'not provided',
      profile_picture: profile_picture ? `base64 data (${profile_picture.length} chars)` : 'not provided',
      bio: bio ? 'provided' : 'not provided',
      social_links: social_links ? 'provided' : 'not provided',
      preferences: preferences ? 'provided' : 'not provided'
    });

    // Create a new Supabase client with the user's token for RLS
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // First, check if the profile exists
    const { data: existingProfile, error: fetchError } = await userSupabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    let updatedProfile;

    if (fetchError && fetchError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log('Profile not found, creating new profile for user:', user.id);
      
      const { data: newProfile, error: createError } = await userSupabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: name || user.user_metadata?.name || user.user_metadata?.full_name || 'VaryAI User',
          profile_picture: profile_picture || user.user_metadata?.avatar_url,
          bio: bio || 'AI enthusiast and creative explorer',
          social_links: social_links || {},
          preferences: preferences || {},
          usage_stats: {
            total_generations: 0,
            image_generations: 0,
            video_generations: 0,
            character_variations: 0,
            background_changes: 0,
            last_activity: null
          }
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating profile:', createError);
        return NextResponse.json({ 
          error: 'Failed to create profile', 
          details: createError.message,
          code: createError.code
        }, { status: 500 });
      }

      updatedProfile = newProfile;
    } else if (fetchError) {
      // Some other error occurred
      console.error('❌ Error checking profile existence:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to check profile', 
        details: fetchError.message,
        code: fetchError.code
      }, { status: 500 });
    } else {
      // Profile exists, update it
      console.log('Profile exists, updating for user:', user.id);
      
      const { data: updated, error: updateErr } = await userSupabase
        .from('users')
        .update({
          name: name || undefined,
          profile_picture: profile_picture || undefined,
          bio: bio || undefined,
          social_links: social_links || undefined,
          preferences: preferences || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateErr) {
        console.error('❌ Error updating profile:', updateErr);
        console.error('❌ Update error details:', {
          code: updateErr.code,
          message: updateErr.message,
          details: updateErr.details,
          hint: updateErr.hint
        });
        return NextResponse.json({ 
          error: 'Failed to update profile', 
          details: updateErr.message,
          code: updateErr.code
        }, { status: 500 });
      }

      updatedProfile = updated;
    }

    console.log('✅ Profile updated successfully:', updatedProfile.id);

    return NextResponse.json({
      profile: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
        profile_picture: updatedProfile.profile_picture,
        bio: updatedProfile.bio || 'AI enthusiast and creative explorer',
        social_links: updatedProfile.social_links || {},
        preferences: updatedProfile.preferences || {},
        usage_stats: updatedProfile.usage_stats || {},
        created_at: updatedProfile.created_at,
        updated_at: updatedProfile.updated_at
      },
      status: 'success'
    });

  } catch (error) {
    console.error('❌ Profile update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
