import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    // Check for user's API key in headers (fallback only)
    const userApiKey = request.headers.get('X-Fal-API-Key');
    const apiKeyToUse = userApiKey || process.env.FAL_KEY;
    
    if (!apiKeyToUse) {
      console.error('❌ No FAL API key available');
      return NextResponse.json({ error: 'No FAL API key configured' }, { status: 500 });
    }
    
    // Configure Fal.ai client with the appropriate key
    fal.config({
      credentials: apiKeyToUse,
    });
    
    if (userApiKey) {
      console.log('🔑 Using user-provided Fal.ai API key as fallback for Kling Avatar');
    } else {
      console.log('🔑 Using configured server Fal.ai API key for Kling Avatar');
    }
    
    const body = await request.json();
    const { 
      image_url, 
      audio_url, 
      prompt = '' 
    } = body;

    // Validate required fields based on schema
    if (!image_url) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    if (!audio_url) {
      return NextResponse.json({ error: 'Audio URL is required' }, { status: 400 });
    }

    console.log(`🚀 FAL Kling Avatar Request`, { 
      image_url: image_url ? 'Present' : 'Missing',
      audio_url: audio_url ? 'Present' : 'Missing',
      prompt: prompt ? prompt.substring(0, 100) + '...' : 'Empty'
    });

    // Prepare input based on FAL schema
    const input = {
      image_url,
      audio_url,
      prompt
    };

    // Submit the request to FAL using the correct endpoint
    const result = await fal.subscribe('fal-ai/kling-video/v1/standard/ai-avatar', {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log(`📊 FAL Queue Update:`, update.logs?.map(log => log.message));
        }
      }
    });

    console.log(`✅ FAL Kling Avatar Response`, { 
      requestId: result.requestId,
      hasData: !!result.data 
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      requestId: result.requestId,
      image_url,
      audio_url,
      prompt
    });

  } catch (error) {
    console.error('❌ FAL Kling Avatar Error:', error);
    
    return NextResponse.json({ 
      error: 'FAL Kling Avatar request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
