import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY || '',
});

// Model configurations for image editing models
const MODEL_CONFIGS = {
  'nano-banana-edit': {
    endpoint: 'fal-ai/nano-banana-edit',
    maxPromptLength: 200,
    supportedOperations: ['edit', 'inpaint', 'outpaint']
  },
  'qwen-image-edit': {
    endpoint: 'fal-ai/qwen-image-edit',
    maxPromptLength: 200,
    supportedOperations: ['edit', 'inpaint', 'outpaint']
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, imageUrl, prompt, operation = 'edit', maskUrl, strength = 0.8, seed } = body;

    if (!model || !MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS]) {
      return NextResponse.json({ 
        error: 'Invalid or unsupported model',
        availableModels: Object.keys(MODEL_CONFIGS)
      }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
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

    // Validate operation
    if (!config.supportedOperations.includes(operation)) {
      return NextResponse.json({ 
        error: `Unsupported operation. Available operations: ${config.supportedOperations.join(', ')}` 
      }, { status: 400 });
    }

    console.log(`🚀 FAL Image Edit Request - Model: ${model}`, { 
      imageUrl, 
      prompt, 
      operation, 
      maskUrl, 
      strength, 
      seed 
    });

    // Prepare input based on model
    let input: any = {
      image_url: imageUrl,
      prompt,
      operation
    };

    // Add model-specific parameters
    if (maskUrl && (operation === 'inpaint' || operation === 'outpaint')) {
      input.mask_url = maskUrl;
    }

    if (strength !== undefined) {
      input.strength = strength;
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

    console.log(`✅ FAL Image Edit Response - Model: ${model}`, { 
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
      operation
    });

  } catch (error) {
    console.error('❌ FAL Image Edit Error:', error);
    
    return NextResponse.json({ 
      error: 'FAL image edit request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
