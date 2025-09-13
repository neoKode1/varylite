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
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Check authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check if user has secret access OR is admin
    const isAdmin = user.email === '1deeptechnology@gmail.com';
    const { data: hasAccess, error: accessError } = await supabaseAdmin.rpc('user_has_secret_access', {
      user_uuid: user.id
    });

    if (!isAdmin && (accessError || !hasAccess)) {
      return NextResponse.json(
        { error: 'Secret Level access required for video variants. Please enter a promo code in your profile.' },
        { status: 403 }
      );
    }

    const { images, mimeTypes, prompt, model }: VideoVariationRequest = await request.json();

    // Validation
    if (!images || images.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No images provided' 
      }, { status: 400 });
    }

    if (!model) {
      return NextResponse.json({ 
        success: false, 
        error: 'No model specified' 
      }, { status: 400 });
    }

    console.log(`🎬 Generating video variations with ${model}`);
    console.log(`📝 User prompt: "${prompt || 'None (using default)'}"`);

    // Upload images to Supabase storage
    const imageUrls = await Promise.all(
      images.map(async (imageData, index) => {
        const mimeType = mimeTypes?.[index] || 'image/jpeg';
        return await uploadImageToSupabase(imageData, mimeType);
      })
    );

    console.log(`📸 Uploaded ${imageUrls.length} images to Supabase storage`);

    // Get 4 random cinematic shots
    const selectedShots = getRandomCinematicShots();
    console.log('🎭 Selected cinematic shots:', selectedShots.map(s => s.name));

    // Generate 4 video variations with different cinematic shots
    const variations = await Promise.all(
      selectedShots.map(async (cinematicShot, index) => {
        try {
          const variationPrompt = buildVariationPrompt(prompt, cinematicShot);
          
          console.log(`🎥 Generating variation ${index + 1}: ${cinematicShot.name}`);
          console.log(`📜 Full prompt: "${variationPrompt}"`);

          // Call video model API
          const result = await callVideoModel(model, {
            image_url: imageUrls[0], // Use first (and typically only) image
            prompt: variationPrompt,
            variation_index: index
          });

          // Upload generated video to Supabase
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 15);
          const videoFileName = `video-variations/${timestamp}-${randomId}-${index + 1}.mp4`;
          
          const supabaseVideoUrl = await uploadVideoToSupabase(result.videoUrl, videoFileName);

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
          console.error(`❌ Failed to generate variation ${index + 1}:`, error);
          
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

    const successCount = variations.filter(v => v.videoUrl).length;
    console.log(`✅ Successfully generated ${successCount}/4 video variations`);

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
  } else if (model === 'minimax-i2v-director') {
    // Use the MiniMax I2V Director endpoint with camera control
    endpoint = 'https://fal.run/fal-ai/minimax/video-01-director/image-to-video';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else if (model === 'hailuo-02-pro') {
    // Use the Hailuo 02 Pro endpoint
    endpoint = 'https://fal.run/fal-ai/minimax/hailuo-02/pro/image-to-video';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else if (model === 'kling-video-pro') {
    // Use the Kling Video Pro endpoint
    endpoint = 'https://fal.run/fal-ai/kling-video/v1.6/pro/image-to-video';
    requestBody = {
      image_url,
      prompt,
      prompt_optimizer: true
    };
  } else {
    throw new Error(`Unsupported video model: ${model}`);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${process.env.FAL_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Video generation API failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  
  // Handle different response formats from the API
  return {
    videoUrl: result.video?.url || result.video_url || result.url,
    duration: result.duration || result.video_length || 4,
    thumbnailUrl: result.thumbnail?.url || result.first_frame?.url || result.preview?.url
  };
}
