import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { CreditService } from '@/lib/creditService';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export interface LipSyncRequest {
  videoUrl: string;
  audioUrl: string;
  syncMode?: 'loop' | 'bounce' | 'cut_off' | 'silence' | 'remap';
  temperature?: number;
  activeSpeaker?: boolean;
  userId: string;
}

export interface LipSyncResponse {
  success: boolean;
  videoUrl?: string;
  error?: string;
  requestId?: string;
  cost?: number;
  duration?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse<LipSyncResponse>> {
  try {
    const body: LipSyncRequest = await request.json();
    const { videoUrl, audioUrl, syncMode = 'loop', temperature = 0.5, activeSpeaker = false, userId } = body;

    // Validate required fields
    if (!videoUrl) {
      return NextResponse.json({
        success: false,
        error: 'Video URL is required'
      }, { status: 400 });
    }

    if (!audioUrl) {
      return NextResponse.json({
        success: false,
        error: 'Audio URL is required'
      }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'Replicate API token not configured'
      }, { status: 500 });
    }

    console.log('🎬 LipSync 2 Pro Request:', {
      videoUrl,
      audioUrl,
      syncMode,
      temperature,
      activeSpeaker,
      userId
    });

    // Check user credits before processing
    const creditCheck = await CreditService.checkUserCredits(userId, 'sync/lipsync-2-pro');
    if (!creditCheck.hasCredits) {
      return NextResponse.json({
        success: false,
        error: creditCheck.error || 'Insufficient credits for LipSync 2 Pro'
      }, { status: 402 });
    }

    // Prepare input for Replicate
    const input = {
      video: videoUrl,
      audio: audioUrl,
      sync_mode: syncMode,
      temperature: temperature,
      active_speaker: activeSpeaker
    };

    console.log('🚀 Submitting to Replicate LipSync 2 Pro...');

    // Run the prediction using Replicate API
    const prediction = await replicate.predictions.create({
      version: "sync/lipsync-2-pro:latest", // Use latest version
      input,
      webhook: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhooks/replicate`,
      webhook_events_filter: ["completed"]
    });

    console.log('✅ Replicate prediction created:', {
      id: prediction.id,
      status: prediction.status
    });

    // If the prediction is already completed (unlikely but possible)
    if (prediction.status === 'succeeded' && prediction.output) {
      const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      
      // Deduct credits
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const creditResult = await CreditService.useCredits(userId, 'sync/lipsync-2-pro', 'video');
      if (!creditResult.success) {
        console.warn('Credit deduction failed:', creditResult.error);
      }

      return NextResponse.json({
        success: true,
        videoUrl: outputUrl,
        requestId: prediction.id,
        cost: 0.08325, // $0.08325 per second of output video
        duration: 0 // Will be calculated when we get the actual video
      });
    }

    // For async processing, return the prediction ID
    return NextResponse.json({
      success: true,
      requestId: prediction.id,
      cost: 0.08325, // Estimated cost per second
      duration: 0 // Will be updated when processing completes
    });

  } catch (error) {
    console.error('❌ LipSync 2 Pro Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get('id');

    if (!predictionId) {
      return NextResponse.json({
        success: false,
        error: 'Prediction ID is required'
      }, { status: 400 });
    }

    console.log('🔍 Checking LipSync 2 Pro prediction status:', predictionId);

    const prediction = await replicate.predictions.get(predictionId);

    if (prediction.status === 'succeeded' && prediction.output) {
      const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      
      return NextResponse.json({
        success: true,
        videoUrl: outputUrl,
        status: prediction.status,
        requestId: predictionId,
        cost: 0.08325,
        duration: 0 // Could be calculated from video metadata
      });
    }

    return NextResponse.json({
      success: false,
      status: prediction.status,
      error: prediction.error || 'Prediction not completed',
      requestId: predictionId
    });

  } catch (error) {
    console.error('❌ LipSync 2 Pro Status Check Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
