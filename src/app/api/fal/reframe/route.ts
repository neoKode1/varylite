import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      imageUrl,
      aspectRatio = '16:9',
      guidanceScale = 3.5,
      numInferenceSteps = 30,
      safetyTolerance = '2',
      outputFormat = 'jpeg',
      seed
    } = body;

    console.log('🚀 [REFRAME] API Route called', {
      imageUrl: imageUrl?.substring(0, 50) + '...',
      aspectRatio,
      guidanceScale,
      numInferenceSteps,
      safetyTolerance,
      outputFormat
    });

    // Validate required fields
    if (!imageUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Image URL is required' 
      }, { status: 400 });
    }

    // Prepare input for Reframe API
    const input = {
      image_url: imageUrl,
      aspect_ratio: aspectRatio,
      guidance_scale: guidanceScale,
      num_inference_steps: numInferenceSteps,
      safety_tolerance: safetyTolerance,
      output_format: outputFormat,
      ...(seed && { seed })
    };

    console.log('🎨 [REFRAME] Calling FAL API with input:', {
      aspect_ratio: input.aspect_ratio,
      guidance_scale: input.guidance_scale,
      num_inference_steps: input.num_inference_steps
    });

    // Call Reframe API
    const result = await fal.subscribe('fal-ai/image-editing/reframe', {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('⏳ [REFRAME] Processing:', update.logs?.map(log => log.message).join(', '));
        }
      },
    });

    console.log('✅ [REFRAME] FAL API Response:', {
      success: true,
      imagesCount: result.data?.images?.length || 0,
      requestId: result.requestId
    });

    // Extract images from response
    const images = result.data?.images || [];
    const extractedImages = images.map((img: any) => ({
      url: img.url,
      width: img.width,
      height: img.height,
      contentType: img.content_type,
      fileName: img.file_name,
      fileSize: img.file_size
    }));

    return NextResponse.json({
      success: true,
      data: {
        images: extractedImages,
        seed: result.data?.seed,
        requestId: result.requestId
      },
      model: 'reframe',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [REFRAME] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process Reframe request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
