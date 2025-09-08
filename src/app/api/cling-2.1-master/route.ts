import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, image_url, duration = "5", negative_prompt = "blur, distort, and low quality", cfg_scale = 0.5 } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!image_url) {
      return NextResponse.json(
        { error: 'Image URL is required for image-to-video generation' },
        { status: 400 }
      );
    }

    console.log('🎬 Starting Cling 2.1 Master image-to-video generation...');
    console.log('📝 Prompt:', prompt);
    console.log('🖼️ Image URL:', image_url);
    console.log('⏱️ Duration:', duration);

    // Use fal.subscribe for automatic polling
    const result = await fal.subscribe("fal-ai/kling-video/v2.1/master/image-to-video", {
      input: {
        prompt,
        image_url,
        duration,
        negative_prompt,
        cfg_scale
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log('🔄 Cling 2.1 Master generation in progress...');
          if (update.logs) {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        }
      },
    });

    console.log('✅ Cling 2.1 Master generation completed!');
    console.log('🎥 Video URL:', result.data.video.url);

    return NextResponse.json({
      success: true,
      videoUrl: result.data.video.url,
      requestId: result.requestId,
      model: 'cling-2.1-master',
      duration: duration,
      prompt: prompt
    });

  } catch (error) {
    console.error('❌ Cling 2.1 Master generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate video with Cling 2.1 Master',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
