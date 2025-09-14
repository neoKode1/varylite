import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a server-side Supabase client
const supabaseUrl = 'https://vqmzepfbgbwtzbpmrevx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side operations');
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required for user authentication');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Supabase Storage Upload API called');
    
    // Get the authorization header for user identification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('❌ No authorization header provided');
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Extract the token from the header
    const token = authHeader.replace('Bearer ', '');
    
    // Create a client with anon key to verify user token
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey!);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.id, user.email);
    
    // Get the file from the request body
    const file = await request.blob();
    console.log('📦 Received blob:', file.size, 'bytes, type:', file.type);
    
    if (!file || file.size === 0) {
      console.error('❌ No file or empty file received');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file size (Supabase free tier limit: 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size, 'bytes (max:', maxSize, ')');
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB.' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.type.split('/')[1] || 'jpg';
    const fileName = `uploads/${timestamp}-${randomId}.${fileExtension}`;
    
    console.log('📁 Generated filename:', fileName);

    // Convert blob to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('📤 Uploading to Supabase Storage...');

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, uint8Array, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload to Supabase Storage', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ File uploaded successfully to Supabase:', data.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(data.path);

    const publicUrl = urlData.publicUrl;
    console.log('🔗 Public URL:', publicUrl);

    // Store metadata in database
    const { error: dbError } = await supabase
      .from('image_uploads')
      .insert({
        file_name: fileName,
        file_size: file.size,
        file_type: file.type,
        public_url: publicUrl,
        storage_path: data.path,
        user_id: user.id,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.warn('⚠️ Failed to store metadata:', dbError.message);
      // Don't fail the upload if metadata storage fails
    } else {
      console.log('✅ Metadata stored in database');
    }

    return NextResponse.json({ 
      url: publicUrl,
      path: data.path,
      fileName: fileName,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('❌ Supabase upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file to Supabase Storage' },
      { status: 500 }
    );
  }
}

// Get signed URL for direct browser upload (bypasses serverless function)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const fileType = searchParams.get('fileType');
    const fileSize = searchParams.get('fileSize');

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'fileName and fileType are required' }, { status: 400 });
    }

    console.log('🔑 Generating signed URL for:', fileName);

    // Generate signed URL for direct upload
    const { data, error } = await supabase.storage
      .from('images')
      .createSignedUploadUrl(fileName, {
        upsert: false
      });

    if (error) {
      console.error('❌ Failed to create signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to create signed upload URL' },
        { status: 500 }
      );
    }

    console.log('✅ Signed URL created successfully');

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path
    });

  } catch (error) {
    console.error('❌ Signed URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate signed upload URL' },
      { status: 500 }
    );
  }
}
