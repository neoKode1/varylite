import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { supabaseAdmin } from '@/lib/supabase';

const falKey = process.env.FAL_KEY;
if (!falKey) {
  throw new Error('FAL_KEY environment variable is not set');
}
fal.config({ credentials: falKey });

interface LumaPhotonReframeRequest {
  imageUrl: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '9:21';
  prompt?: string;
  gridPositionX?: number;
  gridPositionY?: number;
  xStart?: number;
  xEnd?: number;
  yStart?: number;
  yEnd?: number;
}

export async function POST(request: NextRequest) {
  console.log('🖼️ [LUMA PHOTON REFRAME] API Route called');
  
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Check authorization header
    console.log('🔐 [LUMA PHOTON REFRAME] Checking authorization header...');
    const authHeader = request.headers.get('authorization');
    console.log('🔐 [LUMA PHOTON REFRAME] Auth header present:', !!authHeader);
    console.log('🔐 [LUMA PHOTON REFRAME] Auth header format:', authHeader ? `${authHeader.substring(0, 20)}...` : 'null');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [LUMA PHOTON REFRAME] No valid authorization header');
      console.error('❌ [LUMA PHOTON REFRAME] Expected format: "Bearer <token>"');
      console.error('❌ [LUMA PHOTON REFRAME] Received:', authHeader || 'null');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('🔐 [LUMA PHOTON REFRAME] Token extracted:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('🔐 [LUMA PHOTON REFRAME] Token length:', token ? token.length : 0);
    console.log('🔐 [LUMA PHOTON REFRAME] Validating token with Supabase...');
    
    let user: any;
    try {
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError || !authUser) {
        console.error('❌ [LUMA PHOTON REFRAME] Token validation failed:', authError);
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }
      
      user = authUser;
      console.log('✅ [LUMA PHOTON REFRAME] User authenticated:', user.id, user.email);
    } catch (tokenError) {
      console.error('❌ [LUMA PHOTON REFRAME] Token validation error:', tokenError);
      return NextResponse.json(
        { error: 'Token validation failed' },
        { status: 401 }
      );
    }

    const body: LumaPhotonReframeRequest = await request.json();
    const { imageUrl, aspectRatio, prompt, gridPositionX, gridPositionY, xStart, xEnd, yStart, yEnd } = body;

    console.log('🖼️ [LUMA PHOTON REFRAME] Request received:', {
      imageUrl: imageUrl ? 'Present' : 'Missing',
      aspectRatio,
      prompt: prompt ? 'Present' : 'Missing',
      hasGridPosition: !!(gridPositionX !== undefined && gridPositionY !== undefined),
      hasCoordinates: !!(xStart !== undefined && xEnd !== undefined && yStart !== undefined && yEnd !== undefined)
    });
    
    console.log('🎯 [LUMA PHOTON REFRAME API] Aspect ratio from user settings:', {
      aspectRatio: aspectRatio,
      prompt: prompt || 'Default: expand the scene',
      hasGridPosition: !!(gridPositionX !== undefined && gridPositionY !== undefined),
      hasCoordinates: !!(xStart !== undefined && xEnd !== undefined && yStart !== undefined && yEnd !== undefined),
      timestamp: new Date().toISOString()
    });

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    if (!aspectRatio) {
      return NextResponse.json({ error: 'Aspect ratio is required' }, { status: 400 });
    }

    // Prepare the input for FAL API
    const input: any = {
      image_url: imageUrl,
      aspect_ratio: aspectRatio,
      prompt: prompt || "expand the scene" // Always provide a prompt, default to "expand the scene"
    };
    if (gridPositionX !== undefined && gridPositionY !== undefined) {
      input.grid_position_x = gridPositionX;
      input.grid_position_y = gridPositionY;
    }
    if (xStart !== undefined && xEnd !== undefined && yStart !== undefined && yEnd !== undefined) {
      input.x_start = xStart;
      input.x_end = xEnd;
      input.y_start = yStart;
      input.y_end = yEnd;
    }

    console.log('🖼️ [LUMA PHOTON REFRAME] Submitting to FAL...');
    console.log('🖼️ [LUMA PHOTON REFRAME] Input:', input);

    // Submit the job to FAL
    const submitResult = await fal.queue.submit('fal-ai/luma-photon/reframe', {
      input
    });

    const request_id = submitResult.request_id;
    console.log('🖼️ [LUMA PHOTON REFRAME] Job submitted with request_id:', request_id);

    // Poll for completion
    let status: any;
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes max (60 * 5 seconds)
    const pollInterval = 5000; // 5 seconds

    const falStartTime = Date.now();

    while (pollCount < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      pollCount++;

      console.log(`🖼️ [LUMA PHOTON REFRAME] Polling attempt ${pollCount}/${maxPolls}`);

      try {
        status = await fal.queue.status('fal-ai/luma-photon/reframe', {
          requestId: request_id,
          logs: true
        });

        const queueTime = Date.now() - falStartTime;
        console.log(`🖼️ [LUMA PHOTON REFRAME] Status: ${status.status}, Queue time: ${Math.round(queueTime / 1000)}s`);

        if (status.status === "COMPLETED") {
          console.log(`🖼️ [LUMA PHOTON REFRAME] Generation completed after ${pollCount} polls`);
          break;
        }

        // Check for any error conditions
        if (status.status !== "COMPLETED" && status.status !== "IN_PROGRESS" && status.status !== "IN_QUEUE") {
          console.error(`🖼️ [LUMA PHOTON REFRAME] Generation failed with status: ${status.status}`);
          const errorMessage = ('logs' in status && (status as any).logs) 
            ? (status as any).logs.map((log: any) => log.message).join(', ')
            : 'Unknown error';
          throw new Error(`Luma Photon Reframe generation failed: ${errorMessage}`);
        }

      } catch (pollError) {
        console.error('🖼️ [LUMA PHOTON REFRAME] Polling error:', pollError);
        if (pollCount >= maxPolls) {
          throw new Error(`Luma Photon Reframe generation timed out after ${maxPolls} polls`);
        }
      }
    }

    if (!status || status.status !== "COMPLETED") {
      throw new Error(`Luma Photon Reframe generation timed out after ${maxPolls} polls (${Math.round((Date.now() - falStartTime) / 1000)}s)`);
    }

    // Retrieve the result
    console.log(`🖼️ [LUMA PHOTON REFRAME] Retrieving result...`);
    const result = await fal.queue.result('fal-ai/luma-photon/reframe', {
      requestId: request_id
    });

    console.log('🖼️ [LUMA PHOTON REFRAME] Full FAL API Response:', JSON.stringify(result, null, 2));
    console.log('🖼️ [LUMA PHOTON REFRAME] Result data structure:', {
      hasData: !!result.data,
      dataKeys: result.data ? Object.keys(result.data) : 'No data',
      hasImages: !!result.data?.images,
      imagesCount: result.data?.images?.length || 0,
      firstImageUrl: result.data?.images?.[0]?.url || 'No image URL'
    });

    if (!result.data?.images || result.data.images.length === 0) {
      throw new Error('No images returned from Luma Photon Reframe');
    }

    const reframedImageUrl = result.data.images[0].url;
    console.log('🖼️ [LUMA PHOTON REFRAME] Reframed image URL:', reframedImageUrl ? 'Present' : 'Missing');

    return NextResponse.json({
      success: true,
      imageUrl: reframedImageUrl,
      requestId: request_id,
      metadata: {
        aspectRatio,
        originalImageUrl: imageUrl,
        processingTime: Math.round((Date.now() - falStartTime) / 1000)
      }
    });

  } catch (error) {
    console.error('🖼️ [LUMA PHOTON REFRAME] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
