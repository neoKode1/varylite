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
  const startTime = Date.now();
  const requestId = `minimax-2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`🚀 [${requestId}] Minimax 2.0 I2V - Request started`);
    
    const { prompt, image_url, prompt_optimizer = true } = await request.json();

    console.log(`📋 [${requestId}] Request parameters:`, {
      prompt: prompt?.substring(0, 100) + (prompt?.length > 100 ? '...' : ''),
      image_url: image_url ? 'Provided' : 'Missing',
      prompt_optimizer,
      timestamp: new Date().toISOString()
    });
    
    console.log(`🖼️ [${requestId}] Full image URL received:`, image_url);
    console.log(`🔍 [${requestId}] Image URL type:`, typeof image_url);
    console.log(`🔍 [${requestId}] Image URL starts with:`, image_url?.substring(0, 50));

    if (!prompt || !image_url) {
      console.error(`❌ [${requestId}] Validation failed: Prompt and image_url are required`);
      return NextResponse.json(
        { error: 'Prompt and image_url are required' },
        { status: 400 }
      );
    }

    if (!process.env.FAL_KEY) {
      console.error(`❌ [${requestId}] Configuration failed: FAL API key not configured`);
      return NextResponse.json(
        { error: 'FAL API key not configured' },
        { status: 500 }
      );
    }

    console.log(`🎬 [${requestId}] Starting Minimax 2.0 Pro generation...`);
    console.log(`📝 [${requestId}] Prompt: ${prompt}`);
    console.log(`🖼️ [${requestId}] Image URL: ${image_url}`);
    console.log(`🔧 [${requestId}] Prompt Optimizer: ${prompt_optimizer}`);

    console.log(`🔄 [${requestId}] Submitting to FAL API...`);
    const falStartTime = Date.now();
    
    // Step 1: Submit request to FAL AI
    console.log(`📤 [${requestId}] Submitting to FAL AI with input:`, {
      prompt: prompt?.substring(0, 50) + '...',
      image_url: image_url,
      prompt_optimizer
    });
    
    const requestPayload = {
      input: {
        prompt,
        image_url,
        prompt_optimizer: true
      }
    };
    
    console.log(`📤 [${requestId}] Request payload:`, JSON.stringify(requestPayload, null, 2));
    
    const { request_id } = await fal.queue.submit("fal-ai/minimax/hailuo-02/pro/image-to-video", requestPayload);
    
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
      
      status = await fal.queue.status("fal-ai/minimax/hailuo-02/pro/image-to-video", {
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
    const result = await fal.queue.result("fal-ai/minimax/hailuo-02/pro/image-to-video", {
      requestId: request_id
    });

    if (!result.data || !result.data.video || !result.data.video.url) {
      throw new Error('Minimax 2.0 did not return a video URL.');
    }

    const totalTime = Date.now() - startTime;
    const falTime = Date.now() - falStartTime;
    
    console.log(`✅ [${requestId}] Minimax 2.0 generation completed!`);
    console.log(`🎥 [${requestId}] Video URL: ${result.data.video.url}`);
    console.log(`⏱️ [${requestId}] Total time: ${totalTime}ms, FAL time: ${falTime}ms`);
    console.log(`🆔 [${requestId}] FAL Request ID: ${request_id}`);

    return NextResponse.json({
      success: true,
      videoUrl: result.data.video.url,
      requestId: request_id,
      model: 'minimax-2.0',
      processingTime: totalTime,
      falRequestId: request_id
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Minimax 2.0 generation error after ${totalTime}ms:`, error);
    
    // Log detailed error information
    if (error.status) {
      console.error(`❌ [${requestId}] Error status:`, error.status);
    }
    if (error.body) {
      console.error(`❌ [${requestId}] Error body:`, JSON.stringify(error.body, null, 2));
    }
    if (error.message) {
      console.error(`❌ [${requestId}] Error message:`, error.message);
    }
    
    console.error(`❌ [${requestId}] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        status: error.status,
        body: error.body,
        requestId,
        processingTime: totalTime
      },
      { status: error.status || 500 }
    );
  }
}
