import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fal } from '@fal-ai/client';

// Create a server-side Supabase client
const supabaseUrl = 'https://vqmzepfbgbwtzbpmrevx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Supabase to FAL transfer API called');
    
    const body = await request.json();
    console.log('📥 Request body:', body);
    
    const { supabaseUrl, sessionId } = body;
    
    if (!supabaseUrl) {
      console.error('❌ Missing supabaseUrl in request body');
      return NextResponse.json({ error: 'Supabase URL is required' }, { status: 400 });
    }

    console.log('📥 Processing Supabase URL:', supabaseUrl);

    // Fetch the image from Supabase
    const imageResponse = await fetch(supabaseUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from Supabase: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    console.log('📦 Fetched image from Supabase:', imageBlob.size, 'bytes, type:', imageBlob.type);

    // Create File object for FAL upload
    const fileObj = new File([imageBlob], 'image.jpg', { type: 'image/jpeg' });
    
    console.log('📤 Uploading to FAL storage...');
    
    // Upload to FAL storage
    let falUrl;
    try {
      falUrl = await fal.storage.upload(fileObj);
      console.log('✅ Image uploaded to FAL storage:', falUrl);
    } catch (falError) {
      console.error('❌ FAL upload error:', falError);
      throw new Error(`FAL upload failed: ${falError instanceof Error ? falError.message : 'Unknown error'}`);
    }

    // Update the database record with FAL URL
    if (sessionId) {
      const { error: updateError } = await supabase
        .from('image_uploads')
        .update({ 
          fal_url: falUrl,
          is_processed: true,
          updated_at: new Date().toISOString()
        })
        .eq('public_url', supabaseUrl);

      if (updateError) {
        console.warn('⚠️ Failed to update database with FAL URL:', updateError.message);
      } else {
        console.log('✅ Database updated with FAL URL');
      }
    }

    return NextResponse.json({ 
      url: falUrl,
      originalUrl: supabaseUrl,
      size: imageBlob.size,
      type: imageBlob.type
    });

  } catch (error) {
    console.error('❌ Supabase to FAL transfer error:', error);
    return NextResponse.json(
      { error: 'Failed to transfer image from Supabase to FAL storage' },
      { status: 500 }
    );
  }
}
