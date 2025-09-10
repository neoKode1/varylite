import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fallback to hardcoded values if environment variables are not available
const finalSupabaseUrl = supabaseUrl || 'https://vqmzepfbgbwtzbpmrevx.supabase.co';
const finalSupabaseKey = supabaseServiceKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbXplcGZiZ2J3dHpicG1yZXZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE0OTk2OCwiZXhwIjoyMDcyNzI1OTY4fQ.YourServiceRoleKeyHere';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 [COMMUNITY UPLOAD] POST request received');
    
    // Validate configuration
    if (!finalSupabaseUrl || !finalSupabaseKey) {
      console.error('❌ [COMMUNITY UPLOAD] Missing Supabase configuration');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    console.log('✅ [COMMUNITY UPLOAD] Supabase configured, creating client');
    const supabase = createClient(finalSupabaseUrl, finalSupabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('📝 [COMMUNITY UPLOAD] Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('user_id') as string;
    
    console.log('🔍 [COMMUNITY UPLOAD] Form data:', { 
      hasFile: !!file,
      fileName: file?.name || 'none',
      fileSize: file?.size || 0,
      userId: userId ? `${userId.substring(0, 8)}...` : 'missing'
    });

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `community/${userId}/${timestamp}.${fileExtension}`;

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('community-images')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('community-images')
      .getPublicUrl(fileName);

    // Track analytics (optional, don't fail if this fails)
    try {
      await supabase
        .from('analytics_events')
        .insert({
          event_type: 'community_image_uploaded',
          user_id: userId,
          metadata: {
            file_name: fileName,
            file_size: file.size,
            file_type: file.type
          }
        });
    } catch (analyticsError) {
      console.log('Analytics tracking failed, but upload was successful');
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        url: urlData.publicUrl,
        fileName: uploadData.path
      } 
    });
  } catch (error) {
    console.error('Error in POST /api/community/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
