import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY || '',
});

// Model configurations for lip sync models
const MODEL_CONFIGS = {
  'wav2lip': {
    endpoint: 'fal-ai/wav2lip',
    maxVideoDuration: 60,
    supportedFormats: ['mp4', 'avi', 'mov'],
    supportedAudioFormats: ['wav', 'mp3', 'm4a']
  },
  'latentsync': {
    endpoint: 'fal-ai/latentsync',
    maxVideoDuration: 60,
    supportedFormats: ['mp4', 'avi', 'mov'],
    supportedAudioFormats: ['wav', 'mp3', 'm4a']
  },
  'sync-fondo': {
    endpoint: 'fal-ai/sync-fondo',
    maxVideoDuration: 60,
    supportedFormats: ['mp4', 'avi', 'mov'],
    supportedAudioFormats: ['wav', 'mp3', 'm4a']
  },
  'musetalk': {
    endpoint: 'fal-ai/musetalk',
    maxVideoDuration: 60,
    supportedFormats: ['mp4', 'avi', 'mov'],
    supportedAudioFormats: ['wav', 'mp3', 'm4a']
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, videoUrl, audioUrl, quality = 'high', fps = 25, seed } = body;

    if (!model || !MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS]) {
      return NextResponse.json({ 
        error: 'Invalid or unsupported model',
        availableModels: Object.keys(MODEL_CONFIGS)
      }, { status: 400 });
    }

    if (!videoUrl) {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
    }

    if (!audioUrl) {
      return NextResponse.json({ error: 'Audio URL is required' }, { status: 400 });
    }

    const config = MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS];

    console.log(`🚀 FAL Lip Sync Request - Model: ${model}`, { 
      videoUrl, 
      audioUrl, 
      quality, 
      fps, 
      seed 
    });

    // Prepare input based on model
    let input: any = {
      video_url: videoUrl,
      audio_url: audioUrl
    };

    // Add model-specific parameters
    if (quality) {
      input.quality = quality;
    }

    if (fps) {
      input.fps = fps;
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

    console.log(`✅ FAL Lip Sync Response - Model: ${model}`, { 
      requestId: result.requestId,
      hasData: !!result.data 
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      requestId: result.requestId,
      model,
      videoUrl,
      audioUrl,
      quality
    });

  } catch (error) {
    console.error('❌ FAL Lip Sync Error:', error);
    
    return NextResponse.json({ 
      error: 'FAL lip sync request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
