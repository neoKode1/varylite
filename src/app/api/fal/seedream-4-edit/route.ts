import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
const falKey = process.env.FAL_KEY || '';
if (falKey) {
  fal.config({ credentials: falKey });
}

export async function POST(request: NextRequest) {
  console.log('🚀 [SEEDREAM 4 EDIT] API Route called');
  
  try {
    const body = await request.json();
    const { 
      prompt, 
      imageUrls, 
      imageSize = 'square_hd',
      numImages = 1,
      maxImages = 4,
      seed,
      enableSafetyChecker = true
    } = body;

    console.log('📥 [SEEDREAM 4 EDIT] Request body:', {
      prompt: prompt?.substring(0, 100) + '...',
      imageUrlsCount: imageUrls?.length || 0,
      imageSize,
      numImages,
      maxImages,
      seed,
      enableSafetyChecker
    });

    // Validate required fields
    if (!prompt) {
      console.error('❌ [SEEDREAM 4 EDIT] Missing prompt');
      return NextResponse.json({ 
        success: false, 
        error: 'Prompt is required' 
      }, { status: 400 });
    }

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      console.error('❌ [SEEDREAM 4 EDIT] Missing or invalid imageUrls');
      return NextResponse.json({ 
        success: false, 
        error: 'Image URLs are required' 
      }, { status: 400 });
    }

    // Limit to 10 images as per API spec
    const limitedImageUrls = imageUrls.slice(0, 10);
    console.log(`📸 [SEEDREAM 4 EDIT] Using ${limitedImageUrls.length} input images`);

    // Prepare input for Seedream 4.0 Edit
    const input = {
      prompt: prompt.trim(),
      image_urls: limitedImageUrls,
      image_size: imageSize,
      num_images: numImages,
      max_images: maxImages,
      enable_safety_checker: enableSafetyChecker,
      ...(seed && { seed })
    };

    console.log('🎨 [SEEDREAM 4 EDIT] Calling FAL API with input:', {
      prompt: input.prompt.substring(0, 50) + '...',
      image_urls_count: input.image_urls.length,
      image_size: input.image_size,
      num_images: input.num_images,
      max_images: input.max_images
    });

    // Call Seedream 4.0 Edit API
    const result = await fal.subscribe('fal-ai/bytedance/seedream/v4/edit', {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('⏳ [SEEDREAM 4 EDIT] Processing:', update.logs?.map(log => log.message).join(', '));
        }
      },
    });

    console.log('✅ [SEEDREAM 4 EDIT] FAL API Response:', {
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

    console.log(`🖼️ [SEEDREAM 4 EDIT] Extracted ${extractedImages.length} images`);

    return NextResponse.json({
      success: true,
      data: {
        images: extractedImages,
        seed: result.data?.seed,
        requestId: result.requestId
      },
      model: 'seedream-4-edit',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [SEEDREAM 4 EDIT] Error:', error);
    
    // Handle specific FAL errors
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return NextResponse.json({
          success: false,
          error: 'FAL API authentication failed. Please check your FAL_KEY environment variable.',
          details: error.message
        }, { status: 401 });
      }
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return NextResponse.json({
          success: false,
          error: 'Rate limit exceeded. Please try again in a few moments.',
          details: error.message
        }, { status: 429 });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to process Seedream 4.0 Edit request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
