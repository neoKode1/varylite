import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY || '',
});

// Model configurations for text-to-speech models
const MODEL_CONFIGS = {
  'elevenlabs-tts-multilingual-v2': {
    endpoint: 'fal-ai/elevenlabs-tts-multilingual-v2',
    maxTextLength: 5000,
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 'ru', 'nl', 'cs', 'ar', 'zh', 'ja', 'hi'],
    supportedVoices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, text, voice = 'alloy', language = 'en', speed = 1.0, seed } = body;

    if (!model || !MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS]) {
      return NextResponse.json({ 
        error: 'Invalid or unsupported model',
        availableModels: Object.keys(MODEL_CONFIGS)
      }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const config = MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS];
    
    // Validate text length
    if (text.length > config.maxTextLength) {
      return NextResponse.json({ 
        error: `Text too long. Maximum ${config.maxTextLength} characters.` 
      }, { status: 400 });
    }

    // Validate language
    if (!config.supportedLanguages.includes(language)) {
      return NextResponse.json({ 
        error: `Unsupported language. Available languages: ${config.supportedLanguages.join(', ')}` 
      }, { status: 400 });
    }

    // Validate voice
    if (!config.supportedVoices.includes(voice)) {
      return NextResponse.json({ 
        error: `Unsupported voice. Available voices: ${config.supportedVoices.join(', ')}` 
      }, { status: 400 });
    }

    console.log(`🚀 FAL Text-to-Speech Request - Model: ${model}`, { 
      text: text.substring(0, 100) + '...', 
      voice, 
      language, 
      speed, 
      seed 
    });

    // Prepare input based on model
    let input: any = {
      text,
      voice,
      language
    };

    // Add model-specific parameters
    if (speed !== undefined && speed !== 1.0) {
      input.speed = speed;
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

    console.log(`✅ FAL Text-to-Speech Response - Model: ${model}`, { 
      requestId: result.requestId,
      hasData: !!result.data 
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      requestId: result.requestId,
      model,
      text: text.substring(0, 100) + '...',
      voice,
      language
    });

  } catch (error) {
    console.error('❌ FAL Text-to-Speech Error:', error);
    
    return NextResponse.json({ 
      error: 'FAL text-to-speech request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
