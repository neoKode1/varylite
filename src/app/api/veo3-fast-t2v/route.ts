import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `veo3-t2v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`🚀 [${requestId}] Veo3 Fast T2V - Request started`);
    
    const body = await request.json();
    const { prompt, duration = "8s", generate_audio = true, resolution = "720p" } = body;

    console.log(`📋 [${requestId}] Request parameters:`, {
      prompt: prompt?.substring(0, 100) + (prompt?.length > 100 ? '...' : ''),
      duration,
      generate_audio,
      resolution,
      timestamp: new Date().toISOString()
    });

    if (!prompt) {
      console.error(`❌ [${requestId}] Validation failed: Prompt is required`);
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log(`🎬 [${requestId}] Starting Veo3 Fast text-to-video generation...`);
    console.log(`📝 [${requestId}] Prompt: ${prompt}`);
    console.log(`⏱️ [${requestId}] Duration: ${duration}`);
    console.log(`🔊 [${requestId}] Generate Audio: ${generate_audio}`);
    console.log(`📺 [${requestId}] Resolution: ${resolution}`);

    console.log(`🔄 [${requestId}] Submitting to FAL API...`);
    const falStartTime = Date.now();
    
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
        const queueTime = Date.now() - falStartTime;
        console.log(`🔄 [${requestId}] Queue update - Status: ${update.status}, Queue time: ${queueTime}ms`);
        
        if (update.status === "IN_PROGRESS") {
          console.log(`🔄 [${requestId}] Veo3 Fast T2V generation in progress...`);
          if (update.logs) {
            update.logs.map((log) => {
              console.log(`📝 [${requestId}] FAL Log: ${log.message}`);
            });
          }
        } else if (update.status === "COMPLETED") {
          console.log(`✅ [${requestId}] FAL API completed successfully`);
        } else {
          console.log(`📊 [${requestId}] FAL API status: ${update.status}`);
        }
      },
    });

    const totalTime = Date.now() - startTime;
    const falTime = Date.now() - falStartTime;
    
    console.log(`✅ [${requestId}] Veo3 Fast T2V generation completed!`);
    console.log(`🎥 [${requestId}] Video URL: ${result.data.video.url}`);
    console.log(`⏱️ [${requestId}] Total time: ${totalTime}ms, FAL time: ${falTime}ms`);
    console.log(`🆔 [${requestId}] FAL Request ID: ${result.requestId}`);

    return NextResponse.json({
      success: true,
      videoUrl: result.data.video.url,
      requestId: result.requestId,
      model: 'veo3-fast-t2v',
      duration: duration,
      prompt: prompt,
      processingTime: totalTime,
      falRequestId: result.requestId
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Veo3 Fast T2V generation error after ${totalTime}ms:`, error);
    console.error(`❌ [${requestId}] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to generate video with Veo3 Fast T2V',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        processingTime: totalTime
      },
      { status: 500 }
    );
  }
}
