import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Get user's gallery data
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (galleryError) {
      console.error('Error fetching gallery:', galleryError);
      // Don't fail the entire request if gallery fetch fails
    }

    // If no profile exists, create a default one
    if (!profile) {
      const defaultProfile = {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        email: user.email,
        bio: 'AI enthusiast and creative explorer',
        profile_picture: null,
        social_links: {
          twitter: '',
          instagram: '',
          website: ''
        },
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

      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert(defaultProfile)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }

      return NextResponse.json({ profile: newProfile, gallery: gallery || [] });
    }

    return NextResponse.json({ profile, gallery: gallery || [] });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { name, profile_picture, bio, social_links, preferences, background_image } = body;

    // Update user profile in database
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (profile_picture !== undefined) updateData.profile_picture = profile_picture;
    if (bio !== undefined) updateData.bio = bio;
    if (social_links !== undefined) updateData.social_links = social_links;
    if (preferences !== undefined) updateData.preferences = preferences;
    if (background_image !== undefined) updateData.background_image = background_image;

    console.log('Updating profile with data:', updateData);

    // First, check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    let updatedProfile;
    let updateError;

    if (fetchError && fetchError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log('Profile does not exist, creating new profile for user:', user.id);
      
      const newProfileData = {
        id: user.id,
        email: user.email,
        name: name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        profile_picture: profile_picture || null,
        bio: bio || 'AI enthusiast and creative explorer',
        social_links: social_links || {
          twitter: '',
          instagram: '',
          website: ''
        },
        preferences: preferences || {
          defaultModel: 'runway-t2i',
          defaultStyle: 'realistic',
          notifications: true,
          publicProfile: false,
          toastyNotifications: true
        },
        background_image: background_image || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Use admin client to bypass RLS for profile creation, fallback to regular client
      const client = supabaseAdmin || supabase;
      const { data: createdProfile, error: createError } = await client
        .from('users')
        .insert(newProfileData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return NextResponse.json({ 
          error: 'Failed to create profile', 
          details: createError.message,
          code: createError.code 
        }, { status: 500 });
      }

      updatedProfile = createdProfile;
    } else if (fetchError) {
      console.error('Error checking profile existence:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to check profile', 
        details: fetchError.message,
        code: fetchError.code 
      }, { status: 500 });
    } else {
      // Profile exists, update it using admin client, fallback to regular client
      const client = supabaseAdmin || supabase;
      const { data: updated, error: updateErr } = await client
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (updateErr) {
        console.error('Error updating profile:', updateErr);
        console.error('Update data that failed:', updateData);
        console.error('User ID:', user.id);
        return NextResponse.json({ 
          error: 'Failed to update profile', 
          details: updateErr.message,
          code: updateErr.code 
        }, { status: 500 });
      }

      updatedProfile = updated;
    }

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}