import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY || '',
});

// Model configurations for text-to-image models
const MODEL_CONFIGS = {
  'bytedance-dreamina-v3-1-text-to-image': {
    endpoint: 'bytedance/dreamina-v3-1-text-to-image',
    maxPromptLength: 120,
    supportedSizes: ['512x512', '768x768', '1024x1024', '1536x1536', '2048x2048']
  },
  'fast-sdxl': {
    endpoint: 'fal-ai/fast-sdxl',
    maxPromptLength: 200,
    supportedSizes: ['512x512', '768x768', '1024x1024']
  },
  'stable-diffusion-v35-large': {
    endpoint: 'fal-ai/stable-diffusion-v3-5-large',
    maxPromptLength: 200,
    supportedSizes: ['512x512', '768x768', '1024x1024', '1536x1536']
  },
  'flux-krea': {
    endpoint: 'fal-ai/flux-krea',
    maxPromptLength: 200,
    supportedSizes: ['512x512', '768x768', '1024x1024']
  },
  'flux-pro-kontext': {
    endpoint: 'fal-ai/flux-pro-kontext',
    maxPromptLength: 200,
    supportedSizes: ['512x512', '768x768', '1024x1024']
  },
  'imagen4-preview': {
    endpoint: 'fal-ai/imagen4-preview',
    maxPromptLength: 200,
    supportedSizes: ['512x512', '768x768', '1024x1024']
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, prompt, size = '1024x1024', style, seed } = body;

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

    // Validate size
    if (!config.supportedSizes.includes(size)) {
      return NextResponse.json({ 
        error: `Unsupported size. Available sizes: ${config.supportedSizes.join(', ')}` 
      }, { status: 400 });
    }

    console.log(`🚀 FAL Text-to-Image Request - Model: ${model}`, { prompt, size, style, seed });

    // Prepare input based on model
    let input: any = {
      prompt,
      image_size: size
    };

    // Add model-specific parameters
    if (style && (model === 'flux-krea' || model === 'flux-pro-kontext')) {
      input.style = style;
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

    console.log(`✅ FAL Text-to-Image Response - Model: ${model}`, { 
      requestId: result.requestId,
      hasData: !!result.data 
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      requestId: result.requestId,
      model,
      prompt,
      size
    });

  } catch (error) {
    console.error('❌ FAL Text-to-Image Error:', error);
    
    return NextResponse.json({ 
      error: 'FAL text-to-image request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
