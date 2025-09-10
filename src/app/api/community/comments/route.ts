import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fallback to hardcoded values if environment variables are not available
const finalSupabaseUrl = supabaseUrl || 'https://vqmzepfbgbwtzbpmrevx.supabase.co';
const finalSupabaseKey = supabaseServiceKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbXplcGZiZ2J3dHpicG1yZXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNDk5NjgsImV4cCI6MjA3MjcyNTk2OH0.vwKODtk4ScXWv8ZCTqtkmlMeYLWhUrInxrhaYZnEVqo';

console.log('🔧 [COMMUNITY COMMENTS] Environment check:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  usingFallback: !supabaseUrl || !supabaseServiceKey
});

export async function GET(request: NextRequest) {
  try {
    // Validate configuration
    if (!finalSupabaseUrl || !finalSupabaseKey) {
      console.error('❌ [COMMUNITY COMMENTS] Missing Supabase configuration');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(finalSupabaseUrl, finalSupabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('post_id');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }

    // Fetch comments for a specific post
    const { data: comments, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

         // Fetch user profiles for comments
         if (comments && comments.length > 0) {
           const userIds = [...new Set(comments.map(comment => comment.user_id))];
           
           const { data: profiles, error: profilesError } = await supabase
             .from('users')
             .select('id, name, profile_picture, email')
             .in('id', userIds);

           // Merge comments with profiles
           const commentsWithProfiles = comments.map(comment => {
             const userProfile = profiles?.find(profile => profile.id === comment.user_id);
             return {
               ...comment,
               profiles: userProfile ? {
                 id: userProfile.id,
                 display_name: userProfile.name,
                 username: userProfile.email?.split('@')[0] || 'user',
                 avatar_url: userProfile.profile_picture
               } : null
             };
           });

      return NextResponse.json({ success: true, data: commentsWithProfiles });
    }

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
    // Validate configuration
    if (!finalSupabaseUrl || !finalSupabaseKey) {
      console.error('❌ [COMMUNITY COMMENTS] Missing Supabase configuration');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(finalSupabaseUrl, finalSupabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
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
