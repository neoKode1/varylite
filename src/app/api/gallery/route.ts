import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET endpoint to retrieve user's gallery
export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Extract the token from the header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user's gallery items
    const { data: galleryItems, error: galleryError } = await supabase
      .from('galleries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (galleryError) {
      console.error('Error fetching gallery:', galleryError);
      return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
    }

    return NextResponse.json({
      gallery: galleryItems || [],
      status: 'success'
    });

  } catch (error) {
    console.error('Gallery API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST endpoint to add item to gallery
export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Extract the token from the header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      variation_id, 
      description, 
      angle, 
      pose, 
      image_url, 
      video_url, 
      file_type, 
      original_prompt, 
      original_image_preview 
    } = body;

    // Validate required fields
    if (!variation_id || !description || !angle || !pose || !file_type || !original_prompt) {
      return NextResponse.json({ 
        error: 'Missing required fields: variation_id, description, angle, pose, file_type, original_prompt' 
      }, { status: 400 });
    }

    // Add item to gallery
    const { data: newItem, error: insertError } = await supabase
      .from('galleries')
      .insert({
        user_id: user.id,
        variation_id,
        description,
        angle,
        pose,
        image_url: image_url || null,
        video_url: video_url || null,
        file_type,
        original_prompt,
        original_image_preview: original_image_preview || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding to gallery:', insertError);
      return NextResponse.json({ error: 'Failed to add to gallery' }, { status: 500 });
    }

    return NextResponse.json({
      item: newItem,
      status: 'success'
    });

  } catch (error) {
    console.error('Gallery add error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE endpoint to remove item from gallery
export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Extract the token from the header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('id');

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    // Delete item from gallery
    const { error: deleteError } = await supabase
      .from('galleries')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id); // Ensure user can only delete their own items

    if (deleteError) {
      console.error('Error deleting from gallery:', deleteError);
      return NextResponse.json({ error: 'Failed to delete from gallery' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Item deleted successfully',
      status: 'success'
    });

  } catch (error) {
    console.error('Gallery delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
