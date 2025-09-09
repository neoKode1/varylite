import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `minimax-t2v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`🚀 [${requestId}] Minimax 2.0 T2V - Request started`);
    
    const body = await request.json();
    const { prompt, duration = "5", aspect_ratio = "16:9", negative_prompt = "blur, distort, and low quality", cfg_scale = 0.5 } = body;

    console.log(`📋 [${requestId}] Request parameters:`, {
      prompt: prompt?.substring(0, 100) + (prompt?.length > 100 ? '...' : ''),
      duration,
      aspect_ratio,
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

    console.log(`🎬 [${requestId}] Starting Minimax 2.0 text-to-video generation...`);
    console.log(`📝 [${requestId}] Prompt: ${prompt}`);
    console.log(`⏱️ [${requestId}] Duration: ${duration}`);
    console.log(`📐 [${requestId}] Aspect Ratio: ${aspect_ratio}`);
    console.log(`🎛️ [${requestId}] CFG Scale: ${cfg_scale}`);

    console.log(`🔄 [${requestId}] Submitting to FAL API...`);
    const falStartTime = Date.now();
    
    // Step 1: Submit request to FAL AI
    const { request_id } = await fal.queue.submit("fal-ai/minimax/video-01", {
      input: {
        prompt,
        duration,
        aspect_ratio,
        negative_prompt,
        cfg_scale
      }
    });
    
    console.log(`🆔 [${requestId}] FAL Request ID: ${request_id}`);
    
    // Step 2: Poll for status with exponential backoff
    let status = null;
    let pollCount = 0;
    const maxPolls = 60; // Maximum 5 minutes of polling
    const baseDelay = 1000; // Start with 1 second
    
    while (pollCount < maxPolls) {
      pollCount++;
      const pollDelay = Math.min(baseDelay * Math.pow(1.5, pollCount - 1), 10000); // Max 10 seconds
      
      console.log(`🔄 [${requestId}] Polling attempt ${pollCount}/${maxPolls} (delay: ${pollDelay}ms)`);
      
      status = await fal.queue.status("fal-ai/minimax/video-01", {
        requestId: request_id,
        logs: true
      });
      
      const queueTime = Date.now() - falStartTime;
      console.log(`📊 [${requestId}] Status: ${status.status}, Queue time: ${queueTime}ms`);
      
      if ((status as any).logs && (status as any).logs.length > 0) {
        (status as any).logs.forEach((log: any) => {
          console.log(`📝 [${requestId}] FAL Log: ${log.message}`);
        });
      }
      
      if (status.status === "COMPLETED") {
        console.log(`✅ [${requestId}] FAL API completed successfully`);
        break;
      } else if ((status as any).status === "FAILED") {
        throw new Error(`FAL API request failed: ${(status as any).error || 'Unknown error'}`);
      } else if (status.status === "IN_PROGRESS" || status.status === "IN_QUEUE") {
        console.log(`🔄 [${requestId}] Generation in progress, waiting ${pollDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, pollDelay));
      } else {
        console.log(`📊 [${requestId}] Unknown status: ${status.status}, waiting ${pollDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, pollDelay));
      }
    }
    
    if (!status || status.status !== "COMPLETED") {
      throw new Error(`FAL API request timed out after ${maxPolls} polls`);
    }
    
    // Step 3: Retrieve the result
    const result = await fal.queue.result("fal-ai/minimax/video-01", {
      requestId: request_id
    });

    if (!result.data || !result.data.video || !result.data.video.url) {
      throw new Error('Minimax 2.0 T2V did not return a video URL.');
    }

    const totalTime = Date.now() - startTime;
    const falTime = Date.now() - falStartTime;
    
    console.log(`✅ [${requestId}] Minimax 2.0 T2V generation completed!`);
    console.log(`🎥 [${requestId}] Video URL: ${result.data.video.url}`);
    console.log(`⏱️ [${requestId}] Total time: ${totalTime}ms, FAL time: ${falTime}ms`);
    console.log(`🆔 [${requestId}] FAL Request ID: ${request_id}`);

    return NextResponse.json({
      success: true,
      videoUrl: result.data.video.url,
      requestId: request_id,
      model: 'minimax-2-t2v',
      duration: duration,
      prompt: prompt,
      processingTime: totalTime,
      falRequestId: request_id
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Minimax 2.0 T2V generation error after ${totalTime}ms:`, error);
    console.error(`❌ [${requestId}] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to generate video with Minimax 2.0 T2V',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        processingTime: totalTime
      },
      { status: 500 }
    );
  }
}
