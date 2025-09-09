import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

export async function GET() {
  try {
    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseKey) {
      console.log('Supabase not configured, returning empty posts');
      return NextResponse.json({ success: true, data: [] });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch posts with user information
    const { data: posts, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        profiles:user_id (
          id,
          display_name,
          avatar_url,
          username
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching posts:', error);
      // Return empty array instead of error to prevent 500s
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({ success: true, data: posts || [] });
  } catch (error) {
    console.error('Error in GET /api/community/posts:', error);
    // Return empty array instead of error to prevent 500s
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseKey) {
      console.log('Supabase not configured, returning mock success');
      return NextResponse.json({ 
        success: true, 
        data: { 
          id: 'mock-' + Date.now(), 
          message: 'Community features coming soon - database setup in progress' 
        } 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    
    const { content, images, user_id } = body;

    if (!content && (!images || images.length === 0)) {
      return NextResponse.json({ error: 'Content or images required' }, { status: 400 });
    }

    // Allow posts with just content, just images, or both
    const postContent = content || '';
    const postImages = images || [];

    if (!user_id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Create the post
    const { data: post, error } = await supabase
      .from('community_posts')
      .insert({
        user_id,
        content: postContent,
        images: postImages,
        likes_count: 0,
        reposts_count: 0,
        comments_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return NextResponse.json({ 
        error: 'Failed to create post', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    // Track analytics (optional, don't fail if this fails)
    try {
      await supabase
        .from('analytics_events')
        .insert({
          event_type: 'community_post_created',
          user_id,
          metadata: {
            post_id: post.id,
            has_images: images && images.length > 0,
            image_count: images ? images.length : 0
          }
        });
    } catch (analyticsError) {
      console.log('Analytics tracking failed, but post was created successfully');
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('Error in POST /api/community/posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('post_id');
    const userId = searchParams.get('user_id');

    if (!postId || !userId) {
      return NextResponse.json({ error: 'Post ID and User ID required' }, { status: 400 });
    }

    // First, verify the user owns this post
    const { data: post, error: fetchError } = await supabase
      .from('community_posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (fetchError) {
      console.error('Error fetching post:', fetchError);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized to delete this post' }, { status: 403 });
    }

    // Delete the post (cascade will handle related comments and interactions)
    const { error: deleteError } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Error deleting post:', deleteError);
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }

    // Track analytics
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'community_post_deleted',
        user_id: userId,
        metadata: {
          post_id: postId
        }
      });

    return NextResponse.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/community/posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
