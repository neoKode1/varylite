import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use hardcoded Supabase configuration (same as client-side)
const supabaseUrl = 'https://vqmzepfbgbwtzbpmrevx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbXplcGZiZ2J3dHpicG1yZXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNDk5NjgsImV4cCI6MjA3MjcyNTk2OH0.vwKODtk4ScXWv8ZCTqtkmlMeYLWhUrInxrhaYZnEVqo';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    
    const { post_id, user_id, interaction_type } = body; // 'like', 'repost', 'share'

    if (!post_id || !user_id || !interaction_type) {
      return NextResponse.json({ error: 'Post ID, user ID, and interaction type required' }, { status: 400 });
    }

    if (!['like', 'repost', 'share'].includes(interaction_type)) {
      return NextResponse.json({ error: 'Invalid interaction type' }, { status: 400 });
    }

    // Check if interaction already exists
    const { data: existingInteraction, error: checkError } = await supabase
      .from('community_interactions')
      .select('*')
      .eq('post_id', post_id)
      .eq('user_id', user_id)
      .eq('interaction_type', interaction_type)
      .single();

    let isNewInteraction = false;

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing interaction:', checkError);
      return NextResponse.json({ error: 'Failed to check interaction' }, { status: 500 });
    }

    if (existingInteraction) {
      // Remove existing interaction (toggle off)
      const { error: deleteError } = await supabase
        .from('community_interactions')
        .delete()
        .eq('id', existingInteraction.id);

      if (deleteError) {
        console.error('Error removing interaction:', deleteError);
        return NextResponse.json({ error: 'Failed to remove interaction' }, { status: 500 });
      }

      // Decrease count
      const countField = `${interaction_type}s_count`;
      const { data: currentPost } = await supabase
        .from('community_posts')
        .select(countField)
        .eq('id', post_id)
        .single();

      if (currentPost) {
        const currentCount = (currentPost as any)[countField] as number;
        await supabase
          .from('community_posts')
          .update({ [countField]: Math.max(0, currentCount - 1) })
          .eq('id', post_id);
      }

    } else {
      // Create new interaction
      const { data: interaction, error: createError } = await supabase
        .from('community_interactions')
        .insert({
          post_id,
          user_id,
          interaction_type
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating interaction:', createError);
        return NextResponse.json({ error: 'Failed to create interaction' }, { status: 500 });
      }

      // Increase count
      const countField = `${interaction_type}s_count`;
      const { data: currentPost } = await supabase
        .from('community_posts')
        .select(countField)
        .eq('id', post_id)
        .single();

      if (currentPost) {
        const currentCount = (currentPost as any)[countField] as number;
        await supabase
          .from('community_posts')
          .update({ [countField]: currentCount + 1 })
          .eq('id', post_id);
      }

      isNewInteraction = true;

      // Track analytics
      await supabase
        .from('analytics_events')
        .insert({
          event_type: `community_${interaction_type}`,
          user_id,
          metadata: {
            post_id,
            interaction_id: interaction.id
          }
        });
    }

    // Get updated post data
    const { data: updatedPost, error: fetchError } = await supabase
      .from('community_posts')
      .select('*')
      .eq('id', post_id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated post:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch updated post' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        isNewInteraction,
        post: updatedPost
      } 
    });
  } catch (error) {
    console.error('Error in POST /api/community/interactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
