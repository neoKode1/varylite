import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { getBalanceStatus } from '@/lib/fal-balance-monitor';

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

    console.log('🎬 Starting Veo3 Fast generation...');
    console.log('📝 Prompt:', prompt);
    console.log('🖼️ Image URL:', image_url);

    // Use FAL client for Veo3 Fast with explicit polling
    console.log('🔄 Submitting to FAL API...');
    const falStartTime = Date.now();
    
    // Step 1: Submit request to FAL AI
    const { request_id } = await fal.queue.submit("fal-ai/veo3/fast/image-to-video", {
      input: {
        prompt,
        image_url,
        duration,
        generate_audio,
        resolution
      }
    });

    // Step 2: Poll for status with exponential backoff
    let status = null;
    let pollCount = 0;
    const maxPolls = 60; // Maximum 5 minutes of polling
    const baseDelay = 1000; // Start with 1 second

    while (pollCount < maxPolls) {
      pollCount++;
      const pollDelay = Math.min(baseDelay * Math.pow(1.5, pollCount - 1), 10000); // Max 10 seconds
      
      console.log(`🔄 Polling attempt ${pollCount}/${maxPolls} (delay: ${pollDelay}ms)`);
      
      try {
        status = await fal.queue.status("fal-ai/veo3/fast/image-to-video", {
          requestId: request_id,
          logs: true
        });
        
        const queueTime = Date.now() - falStartTime;
        console.log(`🔄 Queue update - Status: ${status.status}, Queue time: ${queueTime}ms`);
        
        if (status.status === "COMPLETED") {
          console.log('✅ FAL API completed successfully');
          break;
        } else if ((status as any).status === "FAILED" || (status as any).error) {
          console.error('❌ FAL API failed:', status);
          throw new Error(`FAL API failed: ${(status as any).error || 'Unknown error'}`);
        } else if (status.status === "IN_PROGRESS" || status.status === "IN_QUEUE") {
          console.log('🔄 Veo3 Fast generation in progress...');
          if ((status as any).logs) {
            (status as any).logs.map((log: any) => log.message).forEach(console.log);
          }
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollDelay));
        
      } catch (error) {
        console.error('❌ Polling error:', error);
        if (pollCount >= maxPolls) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, pollDelay));
      }
    }

    if (!status || status.status !== "COMPLETED") {
      throw new Error(`Generation timed out after ${maxPolls} polling attempts`);
    }

    // Step 3: Retrieve the result
    const result = await fal.queue.result("fal-ai/veo3/fast/image-to-video", {
      requestId: request_id
    });

    if (!result.data || !result.data.video || !result.data.video.url) {
      throw new Error('Veo3 Fast did not return a video URL.');
    }

    console.log('✅ Veo3 Fast generation completed');

    // Get balance status for response
    const balanceStatus = await getBalanceStatus();

    return NextResponse.json({
      success: true,
      videoUrl: result.data.video.url,
      requestId: result.requestId,
      model: 'veo3-fast',
      balanceStatus: balanceStatus.status,
      balanceError: balanceStatus.lastError,
      balanceLastChecked: balanceStatus.lastChecked
    });

  } catch (error) {
    console.error('❌ Veo3 Fast generation error:', error);
    
    // Get balance status even on error to help diagnose issues
    const balanceStatus = await getBalanceStatus();
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        balanceStatus: balanceStatus.status,
        balanceError: balanceStatus.lastError,
        balanceLastChecked: balanceStatus.lastChecked
      },
      { status: 500 }
    );
  }
}
