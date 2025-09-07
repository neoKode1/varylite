import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure Fal AI
if (process.env.FAL_KEY) {
  console.log('🔧 Configuring Fal AI with key...');
  fal.config({
    credentials: process.env.FAL_KEY
  });
  console.log('✅ Fal AI configured successfully');
} else {
  console.log('❌ No FAL_KEY found for configuration');
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, image_url, duration = "8s", generate_audio = true, resolution = "720p" } = await request.json();

    if (!prompt || !image_url) {
      return NextResponse.json(
        { error: 'Prompt and image_url are required' },
        { status: 400 }
      );
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: 'FAL API key not configured' },
        { status: 500 }
      );
    }

    console.log('🎬 Starting Minimax 2.0 generation...');
    console.log('📝 Prompt:', prompt);
    console.log('🖼️ Image URL:', image_url);

    // Use FAL client for Minimax 2.0
    // Note: Update the model name when Minimax 2.0 is available on FAL
    const result = await fal.subscribe("fal-ai/minimax/video-generation", {
      input: {
        prompt,
        image_url,
        duration,
        generate_audio,
        resolution,
        model: 'minimax-2.0'
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    if (!result.data || !result.data.video || !result.data.video.url) {
      throw new Error('Minimax 2.0 did not return a video URL.');
    }

    console.log('✅ Minimax 2.0 generation completed');

    return NextResponse.json({
      success: true,
      videoUrl: result.data.video.url,
      requestId: result.requestId,
      model: 'minimax-2.0'
    });

  } catch (error) {
    console.error('❌ Minimax 2.0 generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
