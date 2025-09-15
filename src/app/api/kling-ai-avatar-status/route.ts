import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { supabaseAdmin } from '@/lib/supabase';

// Configure FAL client
const falKey = process.env.FAL_KEY;
if (!falKey) {
  throw new Error('FAL_KEY environment variable is not set');
}

fal.config({ credentials: falKey });

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [KLING AI AVATAR STATUS] Status check API called');
    
    // Check authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [KLING AI AVATAR STATUS] No valid authorization header');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    let user: any;
    try {
      const { data: { user: authUser }, error: authError } = await supabaseAdmin!.auth.getUser(token);

      if (authError || !authUser) {
        console.error('❌ [KLING AI AVATAR STATUS] Auth error:', authError);
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        );
      }
      
      user = authUser;
      console.log('✅ [KLING AI AVATAR STATUS] User authenticated:', user.id);
      
    } catch (error) {
      console.error('❌ [KLING AI AVATAR STATUS] Auth error:', error);
      return NextResponse.json(
        { error: 'Authentication service error' },
        { status: 500 }
      );
    }

    // Get request_id from query parameters
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId parameter is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [KLING AI AVATAR STATUS] Checking status for request_id:', requestId);

    // Check status with FAL
    const falModelName = 'fal-ai/kling-video/v1/standard/ai-avatar';
    
    try {
      const status = await fal.queue.status(falModelName, {
        requestId: requestId,
        logs: true
      });

      console.log('📊 [KLING AI AVATAR STATUS] Status:', status.status);

      const response: any = {
        success: true,
        status: status.status,
        requestId: requestId
      };

      // Add logs if available
      if ('logs' in status && status.logs && status.logs.length > 0) {
        response.logs = status.logs.slice(-5).map(log => log.message); // Last 5 log messages
      }

      // If completed, get the result
      if (status.status === "COMPLETED") {
        try {
          const result = await fal.queue.result(falModelName, {
            requestId: requestId
          });
          
          console.log('✅ [KLING AI AVATAR STATUS] Full result:', JSON.stringify(result, null, 2));
          console.log('✅ [KLING AI AVATAR STATUS] Result data structure:', {
            hasData: !!result.data,
            dataKeys: result.data ? Object.keys(result.data) : 'No data',
            hasVideo: !!result.data?.video,
            videoKeys: result.data?.video ? Object.keys(result.data.video) : 'No video',
            videoUrl: result.data?.video?.url || 'No video URL'
          });
          
          response.videoUrl = result.data.video?.url;
          response.completed = true;
          
          console.log('✅ [KLING AI AVATAR STATUS] Generation completed, video URL:', response.videoUrl ? 'Present' : 'Missing');
        } catch (resultError) {
          console.error('❌ [KLING AI AVATAR STATUS] Error retrieving result:', resultError);
          response.error = 'Failed to retrieve result';
        }
      }

      // Check for any error conditions (status might be different than expected)
      if (status.status !== "COMPLETED" && status.status !== "IN_PROGRESS" && status.status !== "IN_QUEUE") {
        response.error = 'Generation failed or unknown status';
        if ('logs' in status && (status as any).logs && (status as any).logs.length > 0) {
          response.errorMessage = (status as any).logs.map((log: any) => log.message).join(', ');
        }
      }

      return NextResponse.json(response);

    } catch (falError) {
      console.error('❌ [KLING AI AVATAR STATUS] FAL API error:', falError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to check status',
          details: falError instanceof Error ? falError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [KLING AI AVATAR STATUS] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
