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
      seed = null, 
      size = 'regular', 
      width = 2048, 
      height = 2048, 
      aspectRatio = '16:9', 
      guidanceScale = 2.5,
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

    console.log('🚀 Replicate Seedream 3 Request:', { 
      prompt: prompt.substring(0, 100) + '...', 
      size, 
      width, 
      height, 
      aspectRatio, 
      guidanceScale, 
      userId 
    });

    // Check user credits before processing
    const creditCheck = await CreditService.checkUserCredits(userId, 'bytedance/seedream-3');
    if (!creditCheck.hasCredits) {
      return NextResponse.json({
        success: false,
        error: creditCheck.error || 'Insufficient credits for Seedream 3'
      }, { status: 402 });
    }

    // Prepare input for Replicate
    const input = {
      prompt,
      seed,
      size,
      width,
      height,
      aspect_ratio: aspectRatio,
      guidance_scale: guidanceScale
    };

    // Run the prediction using Replicate API
    const prediction = await replicate.predictions.create({
      version: "bytedance/seedream-3:latest", // Use latest version
      input,
      webhook: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhooks/replicate`,
      webhook_events_filter: ["completed"]
    });

    console.log('✅ Replicate Seedream 3 Prediction Created:', { predictionId: prediction.id, status: prediction.status });

    // If the prediction is already completed (unlikely but possible)
    if (prediction.status === 'succeeded' && prediction.output) {
      const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      
      // Deduct credits
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const creditResult = await CreditService.useCredits(userId, 'bytedance/seedream-3', 'image');
      if (!creditResult.success) {
        console.warn('Credit deduction failed:', creditResult.error);
      }

      return NextResponse.json({
        success: true,
        imageUrl: outputUrl,
        requestId: prediction.id,
        model: 'seedream-3',
        userId,
      });
    }

    // For async predictions, return the prediction ID for polling
    return NextResponse.json({
      success: true,
      predictionId: prediction.id,
      status: prediction.status,
      model: 'seedream-3',
      userId,
    });

  } catch (error) {
    console.error('❌ Replicate Seedream 3 API Error:', error);
    return NextResponse.json({
      error: 'Failed to process Seedream 3 request',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
