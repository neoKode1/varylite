import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fal } from '@fal-ai/client';
import { 
  checkUserGenerationPermission, 
  trackUserFirstGeneration, 
  deductCreditsForGeneration,
  checkLowBalanceNotification 
} from '@/lib/creditEnforcementService';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY!,
});

// Types
interface VideoVariationRequest {
  images: string[]; // base64 images
  mimeTypes?: string[];
  prompt: string;
  model: 'decart-lucy-14b' | 'minimax-i2v-director' | 'hailuo-02-pro' | 'kling-video-pro' | 'veo3-fast' | 'minimax-2.0' | 'kling-2.1-master' | 'minimax-video-01' | 'stable-video-diffusion-i2v' | 'modelscope-i2v' | 'text2video-zero-i2v' | 'wan-v2-2-a14b-i2v-lora' | 'cogvideo-i2v' | 'zeroscope-t2v';
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

// Cinematic shot types for random selection - Enhanced with Camera Control Logic
const CINEMATIC_SHOTS = [
  {
    name: 'Close-up Push-in',
    prompt: 'slow dolly forward toward character, creating intimate connection with cinematic camera work',
    description: 'Intimate close-up with subtle push-in movement'
  },
  {
    name: 'Tracking Shot',
    prompt: 'smooth tracking shot following character movement, professional camera pursuit',
    description: 'Dynamic tracking movement following action'
  },
  {
    name: 'Pan Left',
    prompt: 'cinematic pan left to right across scene, elegant sweeping movement',
    description: 'Cinematic left pan revealing environment'
  },
  {
    name: 'Pan Right', 
    prompt: 'smooth pan right to left across scene, professional camera sweep',
    description: 'Elegant right pan movement'
  },
  {
    name: 'Pull Out Shot',
    prompt: 'slow dolly backward away from character, revealing wider environment',
    description: 'Dramatic pull-out revealing context'
  },
  {
    name: 'Tilt Up',
    prompt: 'dramatic tilt up to reveal character, ascending cinematic perspective',
    description: 'Upward tilt revealing scale and grandeur'
  },
  {
    name: 'Tilt Down',
    prompt: 'smooth tilt down to reveal character, descending dramatic movement',
    description: 'Downward tilt for dramatic reveal'
  },
  {
    name: 'Dolly In',
    prompt: 'smooth dolly forward toward character, approaching with cinematic purpose',
    description: 'Forward dolly creating intimacy'
  },
  {
    name: 'Dolly Out',
    prompt: 'slow dolly backward away from character, creating dramatic distance',
    description: 'Backward dolly for dramatic distance'
  },
  {
    name: 'Orbital Shot',
    prompt: 'orbital movement around character, circular cinematic motion',
    description: 'Circular movement around the focal point'
  },
  {
    name: 'Crane Shot',
    prompt: 'crane shot moving up and over character, ascending cinematic perspective',
    description: 'Elevated movement revealing scope and scale'
  },
  {
    name: 'Aerial Shot',
    prompt: 'aerial shot from above character, bird\'s eye cinematic perspective',
    description: 'Elevated viewpoint with dramatic scope'
  },
  {
    name: 'Low Angle',
    prompt: 'low angle shot from below character, dramatic upward cinematic view',
    description: 'Powerful upward perspective'
  },
  {
    name: 'Zoom In',
    prompt: 'slow zoom in on character, creating intimate focus with cinematic emphasis',
    description: 'Gradual zoom revealing intricate details'
  },
  {
    name: 'Zoom Out',
    prompt: 'slow zoom out from character, expanding cinematic scope and environment',
    description: 'Expanding perspective revealing context'
  },
  {
    name: 'Handheld',
    prompt: 'handheld camera movement for realistic feel, natural cinematic motion',
    description: 'Authentic camera movement with subtle shake'
  },
  {
    name: 'Steadicam',
    prompt: 'steadicam following character movement, smooth pursuit cinematic motion',
    description: 'Professional smooth tracking movement'
  },
  {
    name: 'Whip Pan',
    prompt: 'whip pan between characters, rapid directional change with cinematic energy',
    description: 'Dynamic rapid camera movement'
  },
  {
    name: 'Spiral In',
    prompt: 'spiral inward toward character, tightening focus with cinematic motion',
    description: 'Converging circular movement'
  },
  {
    name: 'Spiral Out',
    prompt: 'spiral outward from character, expanding perspective with cinematic motion',
    description: 'Diverging circular movement'
  }
];

// Default prompt for empty prompt field - Enhanced with Camera Control Logic
const DEFAULT_PROMPT = "slow dolly forward toward character with subtle camera movement, creating intimate cinematic video";

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
    console.log('🔐 [VIDEO VARIANCE] Token extracted:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('🔐 [VIDEO VARIANCE] Token length:', token ? token.length : 0);
    console.log('🔐 [VIDEO VARIANCE] Validating token with Supabase...');
    
    let user: any;
    try {
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError) {
        console.error('❌ [VIDEO VARIANCE] Supabase auth error:', authError);
        console.error('❌ [VIDEO VARIANCE] Error message:', authError.message);
        console.error('❌ [VIDEO VARIANCE] Error status:', authError.status);
        return NextResponse.json(
          { error: 'Invalid authentication', details: authError.message },
          { status: 401 }
        );
      }
      
      if (!authUser) {
        console.error('❌ [VIDEO VARIANCE] No user returned from Supabase');
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        );
      }
      
      user = authUser;
      console.log('✅ [VIDEO VARIANCE] Token validation successful');
      console.log('👤 [VIDEO VARIANCE] User ID:', user.id);
      console.log('📧 [VIDEO VARIANCE] User email:', user.email);
      console.log('📅 [VIDEO VARIANCE] User created at:', user.created_at);
      
    } catch (error) {
      console.error('❌ [VIDEO VARIANCE] Unexpected error during token validation:', error);
      return NextResponse.json(
        { error: 'Authentication service error' },
        { status: 500 }
      );
    }

    // Track first generation for new users (starts grace period)
    console.log('🆕 [VIDEO VARIANCE] Tracking first generation for user...');
    await trackUserFirstGeneration(user.id);

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

    // Check user's credit permission for this model
    console.log('💰 [VIDEO VARIANCE] Checking user credit permission...');
    const creditCheck = await checkUserGenerationPermission(user.id, model);
    
    if (!creditCheck.allowed) {
      console.log('❌ [VIDEO VARIANCE] Credit check failed:', creditCheck.message);
      return NextResponse.json({
        success: false,
        error: creditCheck.message,
        reason: creditCheck.reason,
        gracePeriodExpiresAt: creditCheck.gracePeriodExpiresAt,
        timeRemaining: creditCheck.timeRemaining
      }, { status: 402 }); // 402 Payment Required
    }
    
    console.log('✅ [VIDEO VARIANCE] Credit check passed:', creditCheck.message);

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

    // Deduct credits for successful generation
    console.log('💰 [VIDEO VARIANCE] Deducting credits for successful generation...');
    const creditDeduction = await deductCreditsForGeneration(user.id, model);
    
    if (!creditDeduction.success) {
      console.error('❌ [VIDEO VARIANCE] Credit deduction failed:', creditDeduction.error);
      // Don't fail the request, just log the error
    } else {
      console.log(`✅ [VIDEO VARIANCE] Successfully deducted ${creditDeduction.creditsUsed} credits`);
      console.log(`💰 [VIDEO VARIANCE] Remaining balance: ${creditDeduction.remainingBalance} credits`);
      
      // Check for low balance notification
      await checkLowBalanceNotification(user.id);
    }

    return NextResponse.json({ 
      success: true, 
      variations,
      metadata: {
        totalVariations: 4,
        successfulVariations: successCount,
        failedVariations: 4 - successCount,
        model: model,
        cinematicShots: selectedShots.map(s => s.name),
        creditsUsed: creditDeduction.creditsUsed,
        remainingBalance: creditDeduction.remainingBalance
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
    // Use Minimax Hailuo 02 Pro endpoint (correct image-to-video model)
    // minimax-video-01 is text-to-video only, so we redirect to the proper image-to-video model
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
  } else if (model === 'veo3-fast') {
    // Use Veo3 Fast endpoint
    endpoint = 'https://fal.run/fal-ai/veo3-fast/image-to-video';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else if (model === 'minimax-2.0') {
    // Use Minimax 2.0 endpoint
    endpoint = 'https://fal.run/fal-ai/minimax/video-01-director/image-to-video';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else if (model === 'kling-2.1-master') {
    // Use Kling 2.1 Master endpoint
    endpoint = 'https://fal.run/fal-ai/kling-video/v1.6/pro/image-to-video';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else {
    console.error(`❌ [VIDEO VARIANCE] Unsupported video model: ${model}`);
    throw new Error(`Unsupported video model: ${model}`);
  }

  // Convert endpoint to FAL model name (remove https://fal.run/ prefix)
  const falModelName = endpoint.replace('https://fal.run/', '');
  
  console.log(`🎯 [VIDEO VARIANCE] ===== CALLING VIDEO MODEL API WITH POLLING =====`);
  console.log(`🎯 [VIDEO VARIANCE] Model: ${model}`);
  console.log(`🔗 [VIDEO VARIANCE] FAL Model: ${falModelName}`);
  console.log(`📦 [VIDEO VARIANCE] Request payload:`, JSON.stringify(requestBody, null, 2));
  console.log(`🔑 [VIDEO VARIANCE] FAL Key present: ${!!process.env.FAL_KEY}`);
  console.log(`🔑 [VIDEO VARIANCE] FAL Key length: ${process.env.FAL_KEY?.length || 0}`);

  console.log(`🚀 [VIDEO VARIANCE] Submitting to FAL API...`);
  const falStartTime = Date.now();
  
  // Step 1: Submit request to FAL AI
  const { request_id } = await fal.queue.submit(falModelName, requestBody);
  
  console.log(`🆔 [VIDEO VARIANCE] FAL Request ID: ${request_id}`);
  
  // Step 2: Poll for status with exponential backoff
  let status = null;
  let pollCount = 0;
  const maxPolls = 30; // Increased for video generation
  const baseDelay = 2000; // Start with 2 seconds
  
  while (pollCount < maxPolls) {
    await new Promise(resolve => setTimeout(resolve, baseDelay));
    pollCount++;
    const pollDelay = Math.min(baseDelay * Math.pow(1.5, pollCount - 1), 10000); // Max 10 seconds
    
    console.log(`🔄 [VIDEO VARIANCE] Polling attempt ${pollCount}/${maxPolls} (delay: ${pollDelay}ms)`);
    
    try {
      status = await fal.queue.status(falModelName, {
        requestId: request_id,
        logs: true
      });
      
      const queueTime = Date.now() - falStartTime;
      console.log(`📊 [VIDEO VARIANCE] Status: ${status.status}, Queue time: ${queueTime}ms`);
      
      if ('logs' in status && status.logs && status.logs.length > 0) {
        console.log(`📝 [VIDEO VARIANCE] Latest logs:`, status.logs.slice(-3).map(log => log.message));
      }
      
      if (status.status === "COMPLETED") {
        console.log(`✅ [VIDEO VARIANCE] Generation completed after ${pollCount} polls`);
        break;
      }
      
      if ((status as any).status === "FAILED") {
        console.error(`❌ [VIDEO VARIANCE] Generation failed:`, 'logs' in status ? (status as any).logs : 'No logs available');
        const errorMessage = ('logs' in status && (status as any).logs) 
          ? (status as any).logs.map((log: any) => log.message).join(', ')
          : 'Unknown error';
        throw new Error(`Video generation failed: ${errorMessage}`);
      }
      
      // Continue polling if still in progress or queued
      if (status.status === "IN_PROGRESS" || status.status === "IN_QUEUE") {
        continue;
      }
      
      // If we get here, it's an unexpected status
      console.warn(`⚠️ [VIDEO VARIANCE] Unexpected status: ${status.status}`);
      continue;
      
    } catch (pollError) {
      console.error(`❌ [VIDEO VARIANCE] Polling error:`, pollError);
      if (pollCount >= maxPolls) {
        throw new Error(`Polling failed after ${maxPolls} attempts: ${pollError}`);
      }
    }
  }
  
  if (!status || status.status !== "COMPLETED") {
    throw new Error(`Video generation timed out after ${maxPolls} polls`);
  }
  
  // Step 3: Retrieve the result
  console.log(`📥 [VIDEO VARIANCE] Retrieving result...`);
  const result = await fal.queue.result(falModelName, {
    requestId: request_id
  });

  const totalTime = Date.now() - falStartTime;
  console.log(`✅ [VIDEO VARIANCE] Video generation successful for ${model} in ${totalTime}ms`);
  console.log(`🎥 [VIDEO VARIANCE] FAL API Result:`, JSON.stringify(result, null, 2));
  console.log(`📊 [VIDEO VARIANCE] Result data keys:`, Object.keys(result.data || {}));
  
  // Handle different response formats from the API
  const videoUrl = result.data?.video?.url || result.data?.video_url || result.data?.url;
  const duration = result.data?.duration || result.data?.video_length || 4;
  const thumbnailUrl = result.data?.thumbnail?.url || result.data?.first_frame?.url || result.data?.preview?.url;
  
  console.log(`🎬 [VIDEO VARIANCE] Extracted video URL: ${videoUrl}`);
  console.log(`⏱️ [VIDEO VARIANCE] Extracted duration: ${duration}`);
  console.log(`🖼️ [VIDEO VARIANCE] Extracted thumbnail: ${thumbnailUrl}`);
  
  if (!videoUrl) {
    throw new Error(`No video URL returned from ${model}`);
  }
  
  return {
    videoUrl,
    duration,
    thumbnailUrl
  };
}
