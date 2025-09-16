import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(request: NextRequest) {
  console.log('🚀 API Route: /api/seedream-4 - Request received');
  
  try {
    const body = await request.json();
    const { images, mimeTypes, prompt, size = "2K", aspect_ratio = "match_input_image", max_images = 1 } = body;

    console.log('✅ Request body parsed successfully');
    console.log(`💬 Prompt: "${prompt}"`);
    console.log(`🖼️ Number of images: ${images ? images.length : 0}`);
    
    console.log('🎯 [SEEDREAM 4 API] Aspect ratio from user settings:', {
      aspect_ratio: aspect_ratio,
      size: size,
      max_images: max_images,
      timestamp: new Date().toISOString()
    });

    if (!images || images.length === 0 || !prompt) {
      console.log('❌ Validation failed: Missing image or prompt');
      return NextResponse.json({
        success: false,
        error: 'At least one image and prompt are required',
        retryable: false
      }, { status: 400 });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      console.log('❌ REPLICATE_API_TOKEN not found in environment variables');
      return NextResponse.json({
        success: false,
        error: 'Replicate API token not configured. Please add REPLICATE_API_TOKEN to your environment variables.',
        retryable: false
      }, { status: 500 });
    }

    // Initialize Replicate client
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Convert base64 images to data URLs for Replicate
    const imageInputs = images.map((imageData: string, index: number) => {
      const mimeType = mimeTypes?.[index] || 'image/jpeg';
      const fullDataUri = imageData.startsWith('data:') 
        ? imageData 
        : `data:${mimeType};base64,${imageData}`;
      return fullDataUri;
    });

    console.log('🎨 Running Seedream 4 with Replicate SDK...');
    
    // Prepare input for Seedream 4
    const input = {
      prompt: prompt,
      image_input: imageInputs,
      size: size,
      aspect_ratio: aspect_ratio,
      sequential_image_generation: "disabled",
      max_images: max_images
    };

    console.log('📝 Input prepared:', input);

    // Run the model using Replicate SDK
    const output = await replicate.run("bytedance/seedream-4", { input });

    console.log(`✅ Seedream 4 generation completed!`);
    console.log(`📊 Output type:`, typeof output);
    console.log(`📊 Output length:`, Array.isArray(output) ? output.length : 'not array');

    // Process the output - Replicate returns an array of objects with .url() method
    if (!output || !Array.isArray(output) || output.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No images were generated',
        retryable: false
      }, { status: 500 });
    }

    // Extract URLs from the output objects
    const imageUrls = output.map((item: any) => {
      // Handle both .url() method and direct URL strings
      return typeof item.url === 'function' ? item.url() : item.url || item;
    });

    console.log(`🖼️ Extracted ${imageUrls.length} image URLs`);

    // Create variations array with the generated images
    const variations = imageUrls.map((imageUrl: string, index: number) => ({
      id: `seedream4-${Date.now()}-${index}`,
      description: prompt,
      angle: `Generated variation ${index + 1}`,
      pose: prompt,
      imageUrl: imageUrl,
      fileType: 'image' as const
    }));

    console.log('🎉 Seedream 4 generation completed successfully!');
    console.log(`📊 Generated ${variations.length} images`);

    return NextResponse.json({
      success: true,
      variations: variations
    });

  } catch (error) {
    console.error('❌ Seedream 4 generation error:', error);
    
    let userMessage = 'An unexpected error occurred';
    let retryable = true;
    
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('service unavailable') || message.includes('503')) {
        userMessage = 'AI service is temporarily overloaded. This is common during peak hours. Please try again in a moment.';
        retryable = true;
      } else if (message.includes('timeout') || message.includes('504')) {
        userMessage = 'Request timed out. The service may be experiencing high demand. Please try again.';
        retryable = true;
      } else if (message.includes('rate limit') || message.includes('429')) {
        userMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
        retryable = true;
      } else if (message.includes('content') && message.includes('moderation')) {
        userMessage = 'Content was flagged by moderation. Please try with a different prompt or image.';
        retryable = false;
      } else if (message.includes('400') || message.includes('bad request')) {
        userMessage = 'Invalid request. Please check your images and prompt.';
        retryable = false;
      } else {
        userMessage = error.message;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: userMessage,
      retryable: retryable
    }, { status: 500 });
  }
}
