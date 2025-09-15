import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { 
  checkUserGenerationPermission, 
  trackUserFirstGeneration, 
  deductCreditsForGeneration,
  checkLowBalanceNotification 
} from '@/lib/creditEnforcementService';
import { supabaseAdmin } from '@/lib/supabase';

// Configure FAL client
const falKey = process.env.FAL_KEY;
if (!falKey) {
  throw new Error('FAL_KEY environment variable is not set');
}

fal.config({ credentials: falKey });

export async function POST(request: NextRequest) {
  try {
    console.log('🎭 [KLING AI AVATAR] API Route called');
    
    // Check authorization header
    console.log('🔐 [KLING AI AVATAR] Checking authorization header...');
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [KLING AI AVATAR] No valid authorization header');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('🔐 [KLING AI AVATAR] Token extracted:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('🔐 [KLING AI AVATAR] Token length:', token ? token.length : 0);
    console.log('🔐 [KLING AI AVATAR] Validating token with Supabase...');
    
    let user: any;
    try {
      const { data: { user: authUser }, error: authError } = await supabaseAdmin!.auth.getUser(token);

      if (authError) {
        console.error('❌ [KLING AI AVATAR] Supabase auth error:', authError);
        console.error('❌ [KLING AI AVATAR] Error message:', authError.message);
        console.error('❌ [KLING AI AVATAR] Error status:', authError.status);
        return NextResponse.json(
          { error: 'Invalid authentication', details: authError.message },
          { status: 401 }
        );
      }
      
      if (!authUser) {
        console.error('❌ [KLING AI AVATAR] No user returned from Supabase');
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        );
      }
      
      user = authUser;
      console.log('✅ [KLING AI AVATAR] Token validation successful');
      console.log('👤 [KLING AI AVATAR] User ID:', user.id);
      console.log('📧 [KLING AI AVATAR] User email:', user.email);
      console.log('📅 [KLING AI AVATAR] User created at:', user.created_at);
      
    } catch (error) {
      console.error('❌ [KLING AI AVATAR] Unexpected error during token validation:', error);
      return NextResponse.json(
        { error: 'Authentication service error' },
        { status: 500 }
      );
    }

    // Track first generation for new users (starts grace period)
    await trackUserFirstGeneration(user.id);

    // Check user's credit permission for kling-ai-avatar model
    console.log('💰 [KLING AI AVATAR] Checking user credit permission...');
    const creditCheck = await checkUserGenerationPermission(user.id, 'kling-ai-avatar');
    
    if (!creditCheck.allowed) {
      console.log('❌ [KLING AI AVATAR] Credit check failed:', creditCheck.message);
      return NextResponse.json({
        success: false,
        error: creditCheck.message,
        reason: creditCheck.reason,
        gracePeriodExpiresAt: creditCheck.gracePeriodExpiresAt,
        timeRemaining: creditCheck.timeRemaining
      }, { status: 402 }); // 402 Payment Required
    }
    
    console.log('✅ [KLING AI AVATAR] Credit check passed:', creditCheck.message);
    
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

    // Submit Kling AI Avatar job to queue
    const falModelName = 'fal-ai/kling-video/v1/standard/ai-avatar';
    console.log('🎭 [KLING AI AVATAR] Submitting job to FAL queue...');
    console.log('🎭 [KLING AI AVATAR] Using endpoint:', falModelName);
    console.log('🎭 [KLING AI AVATAR] Input params:', {
      imageUrl: imageUrl ? 'Present' : 'Missing',
      audioUrl: audioUrl ? 'Present' : 'Missing',
      prompt: prompt || 'Default prompt'
    });
    
    const submitResult = await fal.queue.submit(falModelName, {
      input: {
        image_url: imageUrl,
        audio_url: audioUrl,
        prompt: prompt || 'Generate AI avatar video'
      }
    });

    const request_id = submitResult.request_id;
    console.log('🎭 [KLING AI AVATAR] Job submitted with request_id:', request_id);

    // Poll for completion with longer intervals for Kling AI Avatar
    let status: any;
    let pollCount = 0;
    const maxPolls = 360; // 360 polls * 10 seconds = 60 minutes max
    const baseDelay = 10000; // Start with 10 seconds for Kling AI Avatar
    const maxDelay = 30000; // Max 30 seconds between polls
    
    const falStartTime = Date.now();
    
    while (pollCount < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, baseDelay));
      pollCount++;
      
      // Exponential backoff with jitter
      const pollDelay = Math.min(maxDelay, baseDelay * Math.pow(1.2, Math.min(pollCount / 10, 3)));
      
      console.log(`🔄 [KLING AI AVATAR] Polling attempt ${pollCount}/${maxPolls} (delay: ${pollDelay}ms)`);
      
      try {
        status = await fal.queue.status(falModelName, {
          requestId: request_id,
          logs: true
        });
        
        const queueTime = Date.now() - falStartTime;
        console.log(`📊 [KLING AI AVATAR] Status: ${status.status}, Queue time: ${Math.round(queueTime / 1000)}s`);
        
        if ('logs' in status && (status as any).logs && (status as any).logs.length > 0) {
          console.log(`📝 [KLING AI AVATAR] Latest logs:`, (status as any).logs.slice(-3).map((log: any) => log.message));
        }
        
        if (status.status === "COMPLETED") {
          console.log(`✅ [KLING AI AVATAR] Generation completed after ${pollCount} polls`);
          break;
        }
        
        // Check for any error conditions (status might be different than expected)
        if (status.status !== "COMPLETED" && status.status !== "IN_PROGRESS" && status.status !== "IN_QUEUE") {
          console.error(`❌ [KLING AI AVATAR] Generation failed with status: ${status.status}`, 'logs' in status ? (status as any).logs : 'No logs available');
          const errorMessage = ('logs' in status && (status as any).logs) 
            ? (status as any).logs.map((log: any) => log.message).join(', ')
            : 'Unknown error';
          throw new Error(`Kling AI Avatar generation failed: ${errorMessage}`);
        }
        
        // Continue polling if still in progress or queued
        if (status.status === "IN_PROGRESS" || status.status === "IN_QUEUE") {
          continue;
        }
        
        // If we get here, it's an unexpected status
        console.warn(`⚠️ [KLING AI AVATAR] Unexpected status: ${status.status}`);
        continue;
        
      } catch (pollError) {
        console.error(`❌ [KLING AI AVATAR] Polling error:`, pollError);
        if (pollCount >= maxPolls) {
          throw new Error(`Kling AI Avatar polling failed after ${maxPolls} attempts: ${pollError}`);
        }
      }
    }
    
    if (!status || status.status !== "COMPLETED") {
      throw new Error(`Kling AI Avatar generation timed out after ${maxPolls} polls (${Math.round((Date.now() - falStartTime) / 1000)}s)`);
    }
    
    // Retrieve the result
    console.log(`📥 [KLING AI AVATAR] Retrieving result...`);
    const result = await fal.queue.result(falModelName, {
      requestId: request_id
    });

    console.log('✅ [KLING AI AVATAR] Full FAL API Response:', JSON.stringify(result, null, 2));
    console.log('✅ [KLING AI AVATAR] Result data structure:', {
      hasData: !!result.data,
      dataKeys: result.data ? Object.keys(result.data) : 'No data',
      hasVideo: !!result.data?.video,
      videoKeys: result.data?.video ? Object.keys(result.data.video) : 'No video',
      videoUrl: result.data?.video?.url || 'No video URL',
      requestId: result.requestId
    });

    // Deduct credits after successful generation
    console.log('💰 [KLING AI AVATAR] Starting credit deduction for successful generation...');
    console.log('💰 [KLING AI AVATAR] User ID:', user.id);
    console.log('💰 [KLING AI AVATAR] Model: kling-ai-avatar');
    console.log('💰 [KLING AI AVATAR] Video URL generated:', result.data.video?.url ? 'Yes' : 'No');
    
    const creditDeduction = await deductCreditsForGeneration(user.id, 'kling-ai-avatar');
    
    if (!creditDeduction.success) {
      console.error('❌ [KLING AI AVATAR] Credit deduction failed:', creditDeduction.error);
      console.error('❌ [KLING AI AVATAR] This is a critical error - generation succeeded but credits not deducted');
    } else {
      console.log(`✅ [KLING AI AVATAR] Credit deduction successful!`);
      console.log(`✅ [KLING AI AVATAR] Credits deducted: ${creditDeduction.creditsUsed}`);
      console.log(`💰 [KLING AI AVATAR] Remaining balance: ${creditDeduction.remainingBalance} credits`);
      console.log(`💰 [KLING AI AVATAR] User can generate ~${Math.floor(creditDeduction.remainingBalance / (creditDeduction.creditsUsed || 1))} more AI avatars`);
      
      // Check for low balance notification
      console.log('🔔 [KLING AI AVATAR] Checking for low balance notification...');
      await checkLowBalanceNotification(user.id);
    }

    return NextResponse.json({
      success: true,
      videoUrl: result.data.video?.url,
      requestId: request_id,
      metadata: {
        creditsUsed: creditDeduction.creditsUsed,
        remainingBalance: creditDeduction.remainingBalance
      }
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
