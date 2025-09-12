import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure Fal.ai client
fal.config({
  credentials: process.env.FAL_KEY,
});

// File type validation
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg'];

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('📤 FAL Secure Upload API called');
    
    // Get the file from the request body
    const file = await request.blob();
    console.log('📦 Received blob:', file.size, 'bytes, type:', file.type);
    
    if (!file || file.size === 0) {
      console.error('❌ No file or empty file received');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const isValidImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isValidVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    const isValidAudio = ALLOWED_AUDIO_TYPES.includes(file.type);
    
    if (!isValidImage && !isValidVideo && !isValidAudio) {
      console.error('❌ Unsupported file type:', file.type);
      return NextResponse.json({ 
        error: 'Unsupported file type', 
        details: `Supported types: ${[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_AUDIO_TYPES].join(', ')}` 
      }, { status: 400 });
    }

    // Validate file size
    let maxSize = MAX_IMAGE_SIZE;
    if (isValidVideo) maxSize = MAX_VIDEO_SIZE;
    if (isValidAudio) maxSize = MAX_AUDIO_SIZE;
    
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size, 'bytes (max:', maxSize, ')');
      return NextResponse.json({ 
        error: 'File too large', 
        details: `Maximum size: ${maxSize / (1024 * 1024)}MB` 
      }, { status: 400 });
    }

    // Generate secure filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.type.split('/')[1] || 'bin';
    const fileName = `secure-uploads/${timestamp}-${randomId}.${fileExtension}`;
    
    console.log('📁 Generated secure filename:', fileName);

    // Create a File object from the blob
    const fileObj = new File([file], fileName, { type: file.type });
    console.log('📤 Uploading file to FAL storage...');
    
    // Upload file to FAL storage
    const url = await fal.storage.upload(fileObj);
    
    console.log('✅ File uploaded successfully to FAL:', url);

    const result: UploadResult = {
      url,
      fileName,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString()
    };

    console.log('🔗 Returning secure URL to client');
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ FAL secure upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file to FAL storage', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
