import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Types
interface VideoVariationRequest {
  images: string[]; // base64 images
  mimeTypes?: string[];
  prompt: string;
  model: 'decart-lucy-14b' | 'minimax-i2v-director' | 'hailuo-02-pro' | 'kling-video-pro';
}

interface VideoVariation {
  id: string;
  description: string;
  angle: string;
  pose: string;
  videoUrl?: string;
  fileType: 'video';
  duration?: number;
  thumbnailUrl?: string;
  cinematicShot: string;
}

// Cinematic shot types for random selection
const CINEMATIC_SHOTS = [
  {
    name: 'Close-up Push-in',
    prompt: 'slow push-in close-up shot',
    description: 'Intimate close-up with subtle push-in movement'
  },
  {
    name: 'Tracking Shot',
    prompt: 'smooth tracking shot following the subject',
    description: 'Dynamic tracking movement following action'
  },
  {
    name: 'Pan Left',
    prompt: 'slow pan to the left revealing scene',
    description: 'Cinematic left pan revealing environment'
  },
  {
    name: 'Pan Right', 
    prompt: 'smooth pan to the right',
    description: 'Elegant right pan movement'
  },
  {
    name: 'Pull Out Shot',
    prompt: 'slow pull out shot revealing wider scene',
    description: 'Dramatic pull-out revealing context'
  },
  {
    name: 'Tilt Up',
    prompt: 'slow tilt up movement',
    description: 'Upward tilt revealing scale and grandeur'
  },
  {
    name: 'Tilt Down',
    prompt: 'smooth tilt down shot',
    description: 'Downward tilt for dramatic reveal'
  },
  {
    name: 'Dolly In',
    prompt: 'smooth dolly in movement toward subject',
    description: 'Forward dolly creating intimacy'
  },
  {
    name: 'Dolly Out',
    prompt: 'slow dolly out movement away from subject',
    description: 'Backward dolly for dramatic distance'
  },
  {
    name: 'Orbital Shot',
    prompt: 'slow orbital movement around subject',
    description: 'Circular movement around the focal point'
  },
  {
    name: 'Static with Parallax',
    prompt: 'subtle parallax movement with depth',
    description: 'Gentle parallax creating dimensional depth'
  },
  {
    name: 'Zoom In',
    prompt: 'slow zoom in focusing on details',
    description: 'Gradual zoom revealing intricate details'
  }
];

// Default prompt for empty prompt field
const DEFAULT_PROMPT = "add subtle variation and movement to the image for smooth dynamic video";

// Shuffle and select 4 unique cinematic shots
function getRandomCinematicShots() {
  const shuffled = [...CINEMATIC_SHOTS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 4);
}

// Combine user prompt with cinematic shot
function buildVariationPrompt(userPrompt: string, cinematicShot: typeof CINEMATIC_SHOTS[0]) {
  const basePrompt = userPrompt.trim() || DEFAULT_PROMPT;
  return `${basePrompt}, ${cinematicShot.prompt}`;
}

// Upload image to Supabase storage using service key
async function uploadImageToSupabase(base64Data: string, mimeType: string = 'image/jpeg'): Promise<string> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    // Convert base64 to buffer
    const base64String = base64Data.split(',')[1] || base64Data;
    const buffer = Buffer.from(base64String, 'base64');
    const uint8Array = new Uint8Array(buffer);

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = mimeType.split('/')[1] || 'jpg';
    const fileName = `video-inputs/${timestamp}-${randomId}.${fileExtension}`;

    console.log('📤 Uploading image to Supabase for video generation:', fileName);

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('images')
      .upload(fileName, uint8Array, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('images')
      .getPublicUrl(data.path);

    console.log('✅ Image uploaded to Supabase:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error) {
    console.error('❌ Failed to upload image to Supabase:', error);
    throw error;
  }
}

// Upload video to Supabase storage
async function uploadVideoToSupabase(videoUrl: string, fileName: string): Promise<string> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    // Download video from external URL
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const videoBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(videoBuffer);

    console.log('📤 Uploading video to Supabase:', fileName);

    // Upload to Supabase Storage - try videos bucket first, fallback to images
    let bucketName = 'videos';
    let { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, uint8Array, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false
      });

    // If videos bucket doesn't exist, try images bucket
    if (error && error.message.includes('not found')) {
      console.log('⚠️ Videos bucket not found, trying images bucket...');
      bucketName = 'images';
      const retryResult = await supabaseAdmin.storage
        .from(bucketName)
        .upload(fileName, uint8Array, {
          contentType: 'video/mp4',
          cacheControl: '3600',
          upsert: false
        });
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      throw new Error(`Supabase video upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(data?.path || '');

    console.log('✅ Video uploaded to Supabase:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error) {
    console.error('❌ Failed to upload video to Supabase:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  console.log('🎬 [VIDEO VARIANCE] ===== STARTING VIDEO VARIANCE GENERATION REQUEST =====');
  console.log('📅 [VIDEO VARIANCE] Request timestamp:', new Date().toISOString());
  
  try {
    console.log('🔍 [VIDEO VARIANCE] Checking database connection...');
    if (!supabaseAdmin) {
      console.error('❌ [VIDEO VARIANCE] Database connection not available');
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }
    console.log('✅ [VIDEO VARIANCE] Database connection available');

    // Check authorization header
    console.log('🔐 [VIDEO VARIANCE] Checking authorization header...');
    const authHeader = request.headers.get('authorization');
    console.log('🔐 [VIDEO VARIANCE] Auth header present:', !!authHeader);
    console.log('🔐 [VIDEO VARIANCE] Auth header starts with Bearer:', authHeader?.startsWith('Bearer '));
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [VIDEO VARIANCE] No valid authorization header');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('🔐 [VIDEO VARIANCE] Token extracted, length:', token?.length);
    console.log('🔐 [VIDEO VARIANCE] Validating token with Supabase...');
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ [VIDEO VARIANCE] Token validation failed:', authError);
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }
    
    console.log('✅ [VIDEO VARIANCE] Token validation successful');
    console.log('👤 [VIDEO VARIANCE] User ID:', user.id);
    console.log('📧 [VIDEO VARIANCE] User email:', user.email);

    // Check if user has secret access OR is admin
    console.log('🔍 [VIDEO VARIANCE] Checking user access permissions...');
    const isAdmin = user.email === '1deeptechnology@gmail.com';
    console.log('👑 [VIDEO VARIANCE] Is admin:', isAdmin);
    
    console.log('🔍 [VIDEO VARIANCE] Checking secret access via RPC...');
    const { data: hasAccess, error: accessError } = await supabaseAdmin.rpc('user_has_secret_access', {
      user_uuid: user.id
    });
    
    console.log('🔐 [VIDEO VARIANCE] Secret access check result:', {
      hasAccess: hasAccess,
      accessError: accessError,
      isAdmin: isAdmin,
      hasPermission: isAdmin || hasAccess
    });

    if (!isAdmin && (accessError || !hasAccess)) {
      console.error('❌ [VIDEO VARIANCE] User lacks secret access permission');
      return NextResponse.json(
        { error: 'Secret Level access required for video variants. Please enter a promo code in your profile.' },
        { status: 403 }
      );
    }
    
    console.log('✅ [VIDEO VARIANCE] User has required permissions');

    console.log('📥 [VIDEO VARIANCE] Parsing request JSON...');
    const { images, mimeTypes, prompt, model }: VideoVariationRequest = await request.json();

    console.log('📋 [VIDEO VARIANCE] Request details:', {
      imageCount: images?.length || 0,
      model: model,
      promptLength: prompt?.length || 0,
      hasMimeTypes: !!mimeTypes,
      mimeTypesCount: mimeTypes?.length || 0
    });

    // Log each image being processed
    if (images) {
      images.forEach((image, index) => {
        console.log(`🖼️ [VIDEO VARIANCE] Image ${index + 1}:`, {
          hasData: !!image,
          dataLength: image?.length || 0,
          mimeType: mimeTypes?.[index] || 'unknown'
        });
      });
    }

    console.log('🔍 [VIDEO VARIANCE] Starting validation...');
    // Validation
    if (!images || images.length === 0) {
      console.error('❌ [VIDEO VARIANCE] No images provided');
      return NextResponse.json({ 
        success: false, 
        error: 'No images provided' 
      }, { status: 400 });
    }
    console.log('✅ [VIDEO VARIANCE] Images validation passed');

    if (!model) {
      console.error('❌ [VIDEO VARIANCE] No model specified');
      return NextResponse.json({ 
        success: false, 
        error: 'No model specified' 
      }, { status: 400 });
    }
    console.log('✅ [VIDEO VARIANCE] Model validation passed');

    console.log(`🎬 [VIDEO VARIANCE] Generating video variations with model: ${model}`);
    console.log(`📝 [VIDEO VARIANCE] User prompt: "${prompt || 'None (using default)'}"`);

    console.log('📤 [VIDEO VARIANCE] Starting image upload to Supabase storage...');
    // Upload images to Supabase storage
    const imageUrls = await Promise.all(
      images.map(async (imageData, index) => {
        const mimeType = mimeTypes?.[index] || 'image/jpeg';
        console.log(`📤 [VIDEO VARIANCE] Uploading image ${index + 1}/${images.length} to Supabase...`);
        console.log(`📊 [VIDEO VARIANCE] Image ${index + 1} data length: ${imageData.length} characters`);
        console.log(`📊 [VIDEO VARIANCE] Image ${index + 1} mime type: ${mimeType}`);
        
        const url = await uploadImageToSupabase(imageData, mimeType);
        console.log(`✅ [VIDEO VARIANCE] Image ${index + 1} uploaded successfully: ${url}`);
        return url;
      })
    );

    console.log(`📸 [VIDEO VARIANCE] Successfully uploaded ${imageUrls.length} images to Supabase storage`);
    console.log('🔗 [VIDEO VARIANCE] Image URLs:', imageUrls);

    console.log('🎭 [VIDEO VARIANCE] Selecting random cinematic shots...');
    // Get 4 random cinematic shots
    const selectedShots = getRandomCinematicShots();
    console.log('🎭 [VIDEO VARIANCE] Selected cinematic shots:', selectedShots.map(s => s.name));
    selectedShots.forEach((shot, index) => {
      console.log(`🎬 [VIDEO VARIANCE] Shot ${index + 1}: ${shot.name} - ${shot.description}`);
    });

    // Generate 4 video variations with different cinematic shots
    console.log(`🎬 [VIDEO VARIANCE] ===== STARTING PARALLEL VIDEO GENERATION =====`);
    console.log(`🎬 [VIDEO VARIANCE] Model: ${model}`);
    console.log(`🎭 [VIDEO VARIANCE] Selected cinematic shots:`, selectedShots.map(s => s.name));
    console.log(`🖼️ [VIDEO VARIANCE] Using image URL: ${imageUrls[0]}`);
    
    const variations = await Promise.all(
      selectedShots.map(async (cinematicShot, index) => {
        try {
          console.log(`🎬 [VIDEO VARIANCE] ===== STARTING VARIATION ${index + 1}/4 =====`);
          console.log(`🎬 [VIDEO VARIANCE] Variation ${index + 1} - Shot: ${cinematicShot.name}`);
          console.log(`🎬 [VIDEO VARIANCE] Variation ${index + 1} - Description: ${cinematicShot.description}`);
          
          const variationPrompt = buildVariationPrompt(prompt, cinematicShot);
          
          console.log(`🎥 [VIDEO VARIANCE] Generating variation ${index + 1}/4: ${cinematicShot.name}`);
          console.log(`📜 [VIDEO VARIANCE] Variation prompt: "${variationPrompt}"`);
          console.log(`🖼️ [VIDEO VARIANCE] Using image URL: ${imageUrls[0]}`);

          console.log(`🚀 [VIDEO VARIANCE] Variation ${index + 1} - Calling video model API...`);
          // Call video model API
          const result = await callVideoModel(model, {
            image_url: imageUrls[0], // Use first (and typically only) image
            prompt: variationPrompt,
            variation_index: index
          });
          
          console.log(`✅ [VIDEO VARIANCE] Variation ${index + 1} - Video model API call successful!`);
          console.log(`🎬 [VIDEO VARIANCE] Variation ${index + 1} - Video URL: ${result.videoUrl}`);
          console.log(`⏱️ [VIDEO VARIANCE] Variation ${index + 1} - Duration: ${result.duration}`);
          console.log(`🖼️ [VIDEO VARIANCE] Variation ${index + 1} - Thumbnail: ${result.thumbnailUrl}`);

          // Upload generated video to Supabase
          console.log(`📤 [VIDEO VARIANCE] Variation ${index + 1} - Uploading video to Supabase...`);
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 15);
          const videoFileName = `video-variations/${timestamp}-${randomId}-${index + 1}.mp4`;
          console.log(`📁 [VIDEO VARIANCE] Variation ${index + 1} - Video filename: ${videoFileName}`);
          
          const supabaseVideoUrl = await uploadVideoToSupabase(result.videoUrl, videoFileName);
          console.log(`✅ [VIDEO VARIANCE] Variation ${index + 1} - Video uploaded to Supabase: ${supabaseVideoUrl}`);

          return {
            id: `video-variation-${index + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description: variationPrompt,
            angle: cinematicShot.name,
            pose: cinematicShot.description,
            videoUrl: supabaseVideoUrl,
            fileType: 'video' as const,
            duration: result.duration,
            thumbnailUrl: result.thumbnailUrl,
            cinematicShot: cinematicShot.name
          };

        } catch (error) {
          console.error(`❌ [VIDEO VARIANCE] Variation ${index + 1} failed:`, error);
          console.error(`🔍 [VIDEO VARIANCE] Variation ${index + 1} error type:`, typeof error);
          console.error(`🔍 [VIDEO VARIANCE] Variation ${index + 1} error message:`, error instanceof Error ? error.message : 'Unknown error');
          
          // Return error variation that frontend can handle
          return {
            id: `video-variation-error-${index + 1}-${Date.now()}`,
            description: `Failed: ${cinematicShot.name}`,
            angle: cinematicShot.name,
            pose: `Error generating ${cinematicShot.description.toLowerCase()}`,
            fileType: 'video' as const,
            cinematicShot: cinematicShot.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    console.log(`🎬 [VIDEO VARIANCE] ===== PARALLEL GENERATION COMPLETE =====`);
    const successCount = variations.filter(v => v.videoUrl).length;
    const failedCount = variations.filter(v => v.error).length;
    console.log(`📊 [VIDEO VARIANCE] Total variations: ${variations.length}`);
    console.log(`✅ [VIDEO VARIANCE] Successful variations: ${successCount}`);
    console.log(`❌ [VIDEO VARIANCE] Failed variations: ${failedCount}`);
    
    // Log each final variation
    variations.forEach((variation, index) => {
      if (variation.error) {
        console.log(`❌ [VIDEO VARIANCE] Final variation ${index + 1} - ERROR: ${variation.error}`);
      } else {
        console.log(`✅ [VIDEO VARIANCE] Final variation ${index + 1} - SUCCESS: ${variation.angle} - ${variation.videoUrl}`);
      }
    });

    return NextResponse.json({ 
      success: true, 
      variations,
      metadata: {
        totalVariations: 4,
        successfulVariations: successCount,
        failedVariations: 4 - successCount,
        model: model,
        cinematicShots: selectedShots.map(s => s.name)
      }
    });

  } catch (error) {
    console.error('💥 Video variation generation failed:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Video model integration function for supported video models
async function callVideoModel(
  model: string, 
  input: { 
    image_url: string; 
    prompt: string; 
    variation_index: number;
  }
): Promise<{ 
  videoUrl: string; 
  duration?: number; 
  thumbnailUrl?: string;
}> {
  
  const { image_url, prompt, variation_index } = input;

  // Add variation to seed/parameters to ensure different outputs
  const variationSeed = Math.floor(Math.random() * 1000000) + variation_index * 10000;

  let endpoint: string;
  let requestBody: any;

  if (model === 'decart-lucy-14b') {
    // Use the decart/lucy-14b/image-to-video endpoint
    endpoint = 'https://fal.run/decart/lucy-14b/image-to-video';
    requestBody = {
      image_url,
      prompt,
      seed: variationSeed,
      fps: 25,
      duration: 4,
      aspect_ratio: '16:9'
    };
  } else if (model === 'minimax-video-01') {
    // Use Minimax Video 01 endpoint - this is text-to-video only, not image-to-video
    // For image-to-video, we need to use a different model
    throw new Error('minimax-video-01 is text-to-video only. Please use a different model for image-to-video generation.');
  } else if (model === 'minimax-video-generation') {
    // Use Minimax Hailuo 02 Pro endpoint (correct image-to-video model)
    endpoint = 'https://fal.run/fal-ai/minimax/hailuo-02/pro/image-to-video';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else if (model === 'decart-lucy-14b') {
    // Use Decart Lucy 14B endpoint
    endpoint = 'https://fal.run/fal-ai/decart/lucy-14b/image-to-video';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else if (model === 'kling-video-pro') {
    // Use Kling Video Pro endpoint
    endpoint = 'https://fal.run/fal-ai/kling-video/v2.1/master/image-to-video';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else if (model === 'stable-video-diffusion-i2v') {
    // Use Stable Video Diffusion I2V endpoint
    endpoint = 'https://fal.run/fal-ai/stable-video-diffusion/image-to-video';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else if (model === 'modelscope-i2v') {
    // Use Modelscope I2V endpoint
    endpoint = 'https://fal.run/fal-ai/modelscope/image-to-video';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else if (model === 'text2video-zero-i2v') {
    // Use Text2Video Zero I2V endpoint
    endpoint = 'https://fal.run/fal-ai/text2video-zero/image-to-video';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else if (model === 'wan-v2-2-a14b-i2v-lora') {
    // Use Wan V2.2 LoRA endpoint
    endpoint = 'https://fal.run/fal-ai/wan-v2-2-a14b/image-to-video-lora';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else if (model === 'cogvideo-i2v') {
    // Use CogVideo I2V endpoint
    endpoint = 'https://fal.run/fal-ai/cogvideo/image-to-video';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else if (model === 'zeroscope-t2v') {
    // Use Zeroscope T2V endpoint
    endpoint = 'https://fal.run/fal-ai/zeroscope/text-to-video';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else {
    console.error(`❌ [VIDEO VARIANCE] Unsupported video model: ${model}`);
    throw new Error(`Unsupported video model: ${model}`);
  }

  console.log(`🎯 [VIDEO VARIANCE] ===== CALLING VIDEO MODEL API =====`);
  console.log(`🎯 [VIDEO VARIANCE] Model: ${model}`);
  console.log(`🔗 [VIDEO VARIANCE] Endpoint: ${endpoint}`);
  console.log(`📦 [VIDEO VARIANCE] Request body:`, JSON.stringify(requestBody, null, 2));
  console.log(`🔑 [VIDEO VARIANCE] FAL Key present: ${!!process.env.FAL_KEY}`);
  console.log(`🔑 [VIDEO VARIANCE] FAL Key length: ${process.env.FAL_KEY?.length || 0}`);

  console.log(`🚀 [VIDEO VARIANCE] Sending request to FAL API...`);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${process.env.FAL_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  console.log(`📡 [VIDEO VARIANCE] FAL API Response received!`);
  console.log(`📡 [VIDEO VARIANCE] Response status: ${response.status} ${response.statusText}`);
  console.log(`📡 [VIDEO VARIANCE] Response ok: ${response.ok}`);
  console.log(`📡 [VIDEO VARIANCE] Response headers:`, Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    console.error(`❌ [VIDEO VARIANCE] FAL API request failed!`);
    const errorText = await response.text();
    console.error(`❌ [VIDEO VARIANCE] Error response: ${errorText}`);
    console.error(`❌ [VIDEO VARIANCE] Status: ${response.status} ${response.statusText}`);
    throw new Error(`Video generation API failed: ${response.status} ${errorText}`);
  }

  console.log(`📥 [VIDEO VARIANCE] Parsing FAL API response JSON...`);
  const result = await response.json();
  console.log(`✅ [VIDEO VARIANCE] Video generation successful for ${model}`);
  console.log(`🎥 [VIDEO VARIANCE] FAL API Result:`, JSON.stringify(result, null, 2));
  console.log(`📊 [VIDEO VARIANCE] Result data keys:`, Object.keys(result));
  
  // Handle different response formats from the API
  const videoUrl = result.video?.url || result.video_url || result.url;
  const duration = result.duration || result.video_length || 4;
  const thumbnailUrl = result.thumbnail?.url || result.first_frame?.url || result.preview?.url;
  
  console.log(`🎬 [VIDEO VARIANCE] Extracted video URL: ${videoUrl}`);
  console.log(`⏱️ [VIDEO VARIANCE] Extracted duration: ${duration}`);
  console.log(`🖼️ [VIDEO VARIANCE] Extracted thumbnail: ${thumbnailUrl}`);
  
  return {
    videoUrl,
    duration,
    thumbnailUrl
  };
}
