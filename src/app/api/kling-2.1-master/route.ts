import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `kling-master-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`🚀 [${requestId}] Kling 2.1 Master I2V - Request started`);
    
    const body = await request.json();
    const { prompt, image_url, duration = "5", negative_prompt = "blur, distort, and low quality", cfg_scale = 0.5 } = body;

    console.log(`📋 [${requestId}] Request parameters:`, {
      prompt: prompt?.substring(0, 100) + (prompt?.length > 100 ? '...' : ''),
      image_url: image_url ? 'Provided' : 'Missing',
      duration,
      negative_prompt,
      cfg_scale,
      timestamp: new Date().toISOString()
    });

    if (!prompt) {
      console.error(`❌ [${requestId}] Validation failed: Prompt is required`);
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!image_url) {
      console.error(`❌ [${requestId}] Validation failed: Image URL is required`);
      return NextResponse.json(
        { error: 'Image URL is required for image-to-video generation' },
        { status: 400 }
      );
    }

    console.log(`🎬 [${requestId}] Starting Kling 2.1 Master image-to-video generation...`);
    console.log(`📝 [${requestId}] Prompt: ${prompt}`);
    console.log(`🖼️ [${requestId}] Image URL: ${image_url}`);
    console.log(`⏱️ [${requestId}] Duration: ${duration}`);
    console.log(`🎛️ [${requestId}] CFG Scale: ${cfg_scale}`);

    console.log(`🔄 [${requestId}] Submitting to FAL API...`);
    const falStartTime = Date.now();
    
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
        const queueTime = Date.now() - falStartTime;
        console.log(`🔄 [${requestId}] Queue update - Status: ${update.status}, Queue time: ${queueTime}ms`);
        
        if (update.status === "IN_PROGRESS") {
          console.log(`🔄 [${requestId}] Kling 2.1 Master generation in progress...`);
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
    
    console.log(`✅ [${requestId}] Kling 2.1 Master generation completed!`);
    console.log(`🎥 [${requestId}] Video URL: ${result.data.video.url}`);
    console.log(`⏱️ [${requestId}] Total time: ${totalTime}ms, FAL time: ${falTime}ms`);
    console.log(`🆔 [${requestId}] FAL Request ID: ${result.requestId}`);

    return NextResponse.json({
      success: true,
      videoUrl: result.data.video.url,
      requestId: result.requestId,
      model: 'kling-2.1-master',
      duration: duration,
      prompt: prompt,
      processingTime: totalTime,
      falRequestId: result.requestId
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Kling 2.1 Master generation error after ${totalTime}ms:`, error);
    console.error(`❌ [${requestId}] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to generate video with Kling 2.1 Master',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        processingTime: totalTime
      },
      { status: 500 }
    );
  }
}