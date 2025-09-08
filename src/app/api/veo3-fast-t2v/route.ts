import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, duration = "8s", generate_audio = true, resolution = "720p" } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('🎬 Starting Veo3 Fast text-to-video generation...');
    console.log('📝 Prompt:', prompt);
    console.log('⏱️ Duration:', duration);
    console.log('🔊 Generate Audio:', generate_audio);
    console.log('📺 Resolution:', resolution);

    // Use fal.subscribe for automatic polling
    const result = await fal.subscribe("fal-ai/veo3/fast/text-to-video", {
      input: {
        prompt,
        duration,
        generate_audio,
        resolution
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log('🔄 Veo3 Fast T2V generation in progress...');
          if (update.logs) {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        }
      },
    });

    console.log('✅ Veo3 Fast T2V generation completed!');
    console.log('🎥 Video URL:', result.data.video.url);

    return NextResponse.json({
      success: true,
      videoUrl: result.data.video.url,
      requestId: result.requestId,
      model: 'veo3-fast-t2v',
      duration: duration,
      prompt: prompt
    });

  } catch (error) {
    console.error('❌ Veo3 Fast T2V generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate video with Veo3 Fast T2V',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
