import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY || '',
});

// Model configurations for image-to-video models
const MODEL_CONFIGS = {
  'lucy-14b-image-to-video': {
    endpoint: 'decart/lucy-14b/image-to-video',
    maxDuration: 5,
    supportedFormats: ['mp4']
  },
  'bytedance-seedance-v1-pro-image-to-video': {
    endpoint: 'bytedance/seedance-v1-pro-image-to-video',
    maxDuration: 5,
    supportedFormats: ['mp4']
  },
  'kling-video-v2-1-master-image-to-video': {
    endpoint: 'fal-ai/kling-video-v2-1-master-image-to-video',
    maxDuration: 5,
    supportedFormats: ['mp4']
  },
  'minimax-hailuo-02-pro-image-to-video': {
    endpoint: 'fal-ai/minimax-hailuo-02-pro-image-to-video',
    maxDuration: 5,
    supportedFormats: ['mp4']
  },
  'veo3-fast-image-to-video': {
    endpoint: 'fal-ai/veo3-fast-image-to-video',
    maxDuration: 5,
    supportedFormats: ['mp4']
  },
  'veo3-image-to-video': {
    endpoint: 'fal-ai/veo3-image-to-video',
    maxDuration: 5,
    supportedFormats: ['mp4']
  },
  'wan-v2-2-a14b-image-to-video-lora': {
    endpoint: 'fal-ai/wan-v2-2-a14b-image-to-video-lora',
    maxDuration: 5,
    supportedFormats: ['mp4']
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, imageUrl, prompt, duration = 5, motionStrength = 0.5, seed } = body;

    if (!model || !MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS]) {
      return NextResponse.json({ 
        error: 'Invalid or unsupported model',
        availableModels: Object.keys(MODEL_CONFIGS)
      }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    const config = MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS];
    
    // Validate duration
    if (duration > config.maxDuration) {
      return NextResponse.json({ 
        error: `Duration too long. Maximum ${config.maxDuration} seconds.` 
      }, { status: 400 });
    }

    console.log(`🚀 FAL Image-to-Video Request - Model: ${model}`, { 
      imageUrl, 
      prompt, 
      duration, 
      motionStrength, 
      seed 
    });

    // Prepare input based on model
    let input: any = {
      image_url: imageUrl,
      duration: duration
    };

    // Add model-specific parameters
    if (prompt) {
      input.prompt = prompt;
    }

    if (motionStrength !== undefined) {
      input.motion_strength = motionStrength;
    }

    if (seed) {
      input.seed = seed;
    }

    // Submit the request to FAL
    const result = await fal.subscribe(config.endpoint, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log(`📊 FAL Queue Update:`, update.logs?.map(log => log.message));
        }
      }
    });

    console.log(`✅ FAL Image-to-Video Response - Model: ${model}`, { 
      requestId: result.requestId,
      hasData: !!result.data 
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      requestId: result.requestId,
      model,
      imageUrl,
      prompt,
      duration
    });

  } catch (error) {
    console.error('❌ FAL Image-to-Video Error:', error);
    
    return NextResponse.json({ 
      error: 'FAL image-to-video request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
