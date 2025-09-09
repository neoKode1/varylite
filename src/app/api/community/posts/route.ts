import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch posts with user information
    const { data: posts, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: posts });
  } catch (error) {
    console.error('Error in GET /api/community/posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    
    const { content, images, user_id } = body;

    if (!content && (!images || images.length === 0)) {
      return NextResponse.json({ error: 'Content or images required' }, { status: 400 });
    }

    if (!user_id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Create the post
    const { data: post, error } = await supabase
      .from('community_posts')
      .insert({
        user_id,
        content: content || '',
        images: images || [],
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

    // Track analytics
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

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('Error in POST /api/community/posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
