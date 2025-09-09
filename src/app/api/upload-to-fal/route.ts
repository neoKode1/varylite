import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('📤 FAL Upload API called');
    console.log('📋 Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Get the file from the request body
    const file = await request.blob();
    console.log('📦 Received blob:', file.size, 'bytes, type:', file.type);
    
    if (!file || file.size === 0) {
      console.error('❌ No file or empty file received');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create a File object from the blob
    const fileObj = new File([file], 'image.jpg', { type: 'image/jpeg' });
    console.log('📁 Created file object:', fileObj.name, fileObj.size, 'bytes, type:', fileObj.type);
    
    console.log('📤 Uploading file to FAL storage...');
    
    // Upload file to FAL storage
    const url = await fal.storage.upload(fileObj);
    
    console.log('✅ File uploaded successfully to FAL:', url);
    console.log('🔗 Returning URL to client');
    
    return NextResponse.json({ url });
  } catch (error) {
    console.error('❌ FAL upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file to FAL storage' },
      { status: 500 }
    );
  }
}
