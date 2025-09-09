import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('post_id');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }

    // Fetch comments for a specific post
    const { data: comments, error } = await supabase
      .from('community_comments')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: comments });
  } catch (error) {
    console.error('Error in GET /api/community/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    
    const { post_id, content, user_id } = body;

    if (!post_id || !content || !user_id) {
      return NextResponse.json({ error: 'Post ID, content, and user ID required' }, { status: 400 });
    }

    // Create the comment
    const { data: comment, error } = await supabase
      .from('community_comments')
      .insert({
        post_id,
        user_id,
        content
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Update post comment count
    const { data: currentPost } = await supabase
      .from('community_posts')
      .select('comments_count')
      .eq('id', post_id)
      .single();

    if (currentPost) {
      await supabase
        .from('community_posts')
        .update({ comments_count: currentPost.comments_count + 1 })
        .eq('id', post_id);
    }

    // Track analytics
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'community_comment_created',
        user_id,
        metadata: {
          post_id,
          comment_id: comment.id
        }
      });

    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    console.error('Error in POST /api/community/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
