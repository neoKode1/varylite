import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, duration = "5", aspect_ratio = "16:9", negative_prompt = "blur, distort, and low quality", cfg_scale = 0.5 } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('🎬 Starting Minimax 2.0 text-to-video generation...');
    console.log('📝 Prompt:', prompt);
    console.log('⏱️ Duration:', duration);
    console.log('📐 Aspect Ratio:', aspect_ratio);

    // Use fal.subscribe for automatic polling
    const result = await fal.subscribe("fal-ai/minimax-2/text-to-video", {
      input: {
        prompt,
        duration,
        aspect_ratio,
        negative_prompt,
        cfg_scale
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log('🔄 Minimax 2.0 T2V generation in progress...');
          if (update.logs) {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        }
      },
    });

    console.log('✅ Minimax 2.0 T2V generation completed!');
    console.log('🎥 Video URL:', result.data.video.url);

    return NextResponse.json({
      success: true,
      videoUrl: result.data.video.url,
      requestId: result.requestId,
      model: 'minimax-2-t2v',
      duration: duration,
      prompt: prompt
    });

  } catch (error) {
    console.error('❌ Minimax 2.0 T2V generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate video with Minimax 2.0 T2V',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
