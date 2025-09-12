import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';
import { CreditService } from '@/lib/creditService';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      image = null,
      duration = 5,
      resolution = '1080p',
      aspectRatio = '16:9',
      fps = 24,
      cameraFixed = false,
      seed = null,
      userId 
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('REPLICATE_API_TOKEN is not set');
      return NextResponse.json({ error: 'Server configuration error: Replicate API token missing' }, { status: 500 });
    }

    console.log('🚀 Replicate Seedance 1 Pro Request:', { 
      prompt: prompt.substring(0, 100) + '...', 
      image: !!image,
      duration, 
      resolution, 
      aspectRatio, 
      fps, 
      cameraFixed, 
      userId 
    });

    // Check user credits before processing
    const creditCheck = await CreditService.checkUserCredits(userId, 'bytedance/seedance-1-pro');
    if (!creditCheck.hasCredits) {
      return NextResponse.json({
        success: false,
        error: creditCheck.error || 'Insufficient credits for Seedance 1 Pro'
      }, { status: 402 });
    }

    // Prepare input for Replicate
    const input = {
      prompt,
      image,
      duration,
      resolution,
      aspect_ratio: aspectRatio,
      fps,
      camera_fixed: cameraFixed,
      seed
    };

    // Run the prediction using Replicate API
    const prediction = await replicate.predictions.create({
      version: "bytedance/seedance-1-pro:latest", // Use latest version
      input,
      webhook: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhooks/replicate`,
      webhook_events_filter: ["completed"]
    });

    console.log('✅ Replicate Seedance 1 Pro Prediction Created:', { predictionId: prediction.id, status: prediction.status });

    // If the prediction is already completed (unlikely but possible)
    if (prediction.status === 'succeeded' && prediction.output) {
      const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      
      // Deduct credits
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const creditResult = await CreditService.useCredits(userId, 'bytedance/seedance-1-pro', 'video');
      if (!creditResult.success) {
        console.warn('Credit deduction failed:', creditResult.error);
      }

      return NextResponse.json({
        success: true,
        videoUrl: outputUrl,
        requestId: prediction.id,
        model: 'seedance-1-pro',
        userId,
      });
    }

    // For async predictions, return the prediction ID for polling
    return NextResponse.json({
      success: true,
      predictionId: prediction.id,
      status: prediction.status,
      model: 'seedance-1-pro',
      userId,
    });

  } catch (error) {
    console.error('❌ Replicate Seedance 1 Pro API Error:', error);
    return NextResponse.json({
      error: 'Failed to process Seedance 1 Pro request',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
