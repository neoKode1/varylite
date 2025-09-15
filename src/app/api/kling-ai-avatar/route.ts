import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
const falKey = process.env.FAL_KEY;
if (!falKey) {
  throw new Error('FAL_KEY environment variable is not set');
}

fal.config({ credentials: falKey });

export async function POST(request: NextRequest) {
  try {
    console.log('🎭 [KLING AI AVATAR] API Route called');
    
    const body = await request.json();
    console.log('📥 [KLING AI AVATAR] Request body:', {
      imageUrl: body.imageUrl ? 'Present' : 'Missing',
      audioUrl: body.audioUrl ? 'Present' : 'Missing',
      prompt: body.prompt ? 'Present' : 'Missing'
    });

    const { imageUrl, audioUrl, prompt } = body;

    // Validate required fields
    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
        { status: 400 }
      );
    }

    if (!audioUrl) {
      return NextResponse.json(
        { success: false, error: 'Audio URL is required' },
        { status: 400 }
      );
    }

    console.log('🎭 [KLING AI AVATAR] Calling FAL API with:', {
      image_url: imageUrl,
      audio_url: audioUrl,
      prompt: prompt || ''
    });

    // Call Kling AI Avatar API
    const result = await fal.subscribe('fal-ai/kling-video/v1/standard/ai-avatar', {
      input: {
        image_url: imageUrl,
        audio_url: audioUrl,
        prompt: prompt || ''
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    console.log('✅ [KLING AI AVATAR] FAL API Response:', {
      success: true,
      videoUrl: result.data.video?.url ? 'Present' : 'Missing',
      requestId: result.requestId
    });

    return NextResponse.json({
      success: true,
      videoUrl: result.data.video?.url,
      requestId: result.requestId
    });

  } catch (error) {
    console.error('❌ [KLING AI AVATAR] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
