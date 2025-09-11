import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY || '',
});

// Model configurations for text-to-video models
const MODEL_CONFIGS = {
  'minimax-video-01': {
    endpoint: 'fal-ai/minimax-video-01',
    maxDuration: 5,
    maxPromptLength: 200
  },
  'minimax-video-generation': {
    endpoint: 'fal-ai/minimax-video-generation',
    maxDuration: 5,
    maxPromptLength: 200
  },
  'veo3-standard': {
    endpoint: 'fal-ai/veo3-standard',
    maxDuration: 5,
    maxPromptLength: 200
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, prompt, duration = 5, aspectRatio = '16:9', seed } = body;

    if (!model || !MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS]) {
      return NextResponse.json({ 
        error: 'Invalid or unsupported model',
        availableModels: Object.keys(MODEL_CONFIGS)
      }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const config = MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS];
    
    // Validate prompt length
    if (prompt.length > config.maxPromptLength) {
      return NextResponse.json({ 
        error: `Prompt too long. Maximum ${config.maxPromptLength} characters.` 
      }, { status: 400 });
    }

    // Validate duration
    if (duration > config.maxDuration) {
      return NextResponse.json({ 
        error: `Duration too long. Maximum ${config.maxDuration} seconds.` 
      }, { status: 400 });
    }

    console.log(`🚀 FAL Text-to-Video Request - Model: ${model}`, { 
      prompt, 
      duration, 
      aspectRatio, 
      seed 
    });

    // Prepare input based on model
    let input: any = {
      prompt,
      duration: duration
    };

    // Add model-specific parameters
    if (aspectRatio) {
      input.aspect_ratio = aspectRatio;
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

    console.log(`✅ FAL Text-to-Video Response - Model: ${model}`, { 
      requestId: result.requestId,
      hasData: !!result.data 
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      requestId: result.requestId,
      model,
      prompt,
      duration
    });

  } catch (error) {
    console.error('❌ FAL Text-to-Video Error:', error);
    
    return NextResponse.json({ 
      error: 'FAL text-to-video request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
