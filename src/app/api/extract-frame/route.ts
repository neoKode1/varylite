import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { video_url, frame_type = 'last' } = body;

    console.log('🎬 [ExtractFrame] ===== FRAME EXTRACTION API START =====');
    console.log('🎬 [ExtractFrame] Request parameters:', {
      video_url: video_url?.length > 100 ? video_url.substring(0, 100) + '...' : video_url,
      frame_type,
      timestamp: new Date().toISOString()
    });

    // Validate inputs
    if (!video_url || !video_url.startsWith('http')) {
      return NextResponse.json(
        { success: false, error: 'Invalid video URL provided' },
        { status: 400 }
      );
    }

    if (!['first', 'middle', 'last'].includes(frame_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid frame_type. Must be "first", "middle", or "last"' },
        { status: 400 }
      );
    }

    // Prepare FAL AI request
    const falRequest = {
      model: 'fal-ai/ffmpeg-api/extract-frame',
      prompt: 'Extract frame from video',
      video_url,
      frame_type
    };

    console.log('🎬 [ExtractFrame] Making request to FAL AI...');
    console.log('🎬 [ExtractFrame] FAL request body:', falRequest);

    // Call FAL AI API
    const falResponse = await fetch('https://fal.run/fal-ai/ffmpeg-api/extract-frame', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(falRequest)
    });

    console.log('🎬 [ExtractFrame] FAL AI response status:', {
      status: falResponse.status,
      statusText: falResponse.statusText,
      ok: falResponse.ok
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error('❌ [ExtractFrame] FAL AI error response:', errorText);
      return NextResponse.json(
        { success: false, error: `FAL AI API failed: ${falResponse.status} - ${errorText}` },
        { status: falResponse.status }
      );
    }

    const falResult = await falResponse.json();
    console.log('🎬 [ExtractFrame] FAL AI response:', JSON.stringify(falResult, null, 2));

    // Extract image URL from response
    const imageUrl = falResult.images?.[0]?.url || falResult.image?.url || falResult.url;
    
    if (!imageUrl) {
      console.error('❌ [ExtractFrame] No image URL found in FAL response');
      return NextResponse.json(
        { success: false, error: 'No image URL returned from frame extraction' },
        { status: 500 }
      );
    }

    console.log('✅ [ExtractFrame] Frame extraction successful!', {
      frameUrl: imageUrl.length > 100 ? imageUrl.substring(0, 100) + '...' : imageUrl,
      frame_type
    });
    console.log('🎬 [ExtractFrame] ===== FRAME EXTRACTION API SUCCESS =====');

    return NextResponse.json({
      success: true,
      data: {
        frame_url: imageUrl,
        frame_type,
        video_url: video_url.length > 100 ? video_url.substring(0, 100) + '...' : video_url
      }
    });

  } catch (error) {
    console.error('❌ [ExtractFrame] ===== FRAME EXTRACTION API FAILED =====');
    console.error('❌ [ExtractFrame] Error details:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'N/A'
    });

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
