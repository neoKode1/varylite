import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      prompt,
      imageUrl,
      aspectRatio = 'auto',
      duration = '8s',
      generateAudio = true,
      resolution = '720p'
    } = body;

    console.log('🚀 [VEO3 FAST I2V] API Route called', {
      prompt: prompt?.substring(0, 50) + '...',
      imageUrl: imageUrl?.substring(0, 50) + '...',
      aspectRatio,
      duration,
      generateAudio,
      resolution
    });

    // Validate required fields
    if (!prompt) {
      return NextResponse.json({ 
        success: false, 
        error: 'Prompt is required' 
      }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Image URL is required' 
      }, { status: 400 });
    }

    // Prepare input for Veo3 Fast Image-to-Video API
    const input = {
      prompt: prompt.trim(),
      image_url: imageUrl,
      aspect_ratio: aspectRatio,
      duration: duration,
      generate_audio: generateAudio,
      resolution: resolution
    };

    console.log('🎨 [VEO3 FAST I2V] Calling FAL API with input:', {
      prompt: input.prompt.substring(0, 50) + '...',
      aspect_ratio: input.aspect_ratio,
      duration: input.duration,
      generate_audio: input.generate_audio,
      resolution: input.resolution
    });

    // Call Veo3 Fast Image-to-Video API
    const result = await fal.subscribe('fal-ai/veo3/fast/image-to-video', {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('⏳ [VEO3 FAST I2V] Processing:', update.logs?.map(log => log.message).join(', '));
        }
      },
    });

    console.log('✅ [VEO3 FAST I2V] FAL API Response:', {
      success: true,
      hasVideo: !!result.data?.video,
      requestId: result.requestId
    });

    // Extract video from response
    const video = result.data?.video;
    const extractedVideo = video ? {
      url: video.url,
      contentType: video.content_type,
      fileName: video.file_name,
      fileSize: video.file_size
    } : null;

    return NextResponse.json({
      success: true,
      data: {
        video: extractedVideo,
        requestId: result.requestId
      },
      model: 'veo3-fast-i2v',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [VEO3 FAST I2V] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process Veo3 Fast Image-to-Video request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
