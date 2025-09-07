import { NextRequest, NextResponse } from 'next/server';

const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1/text_to_image';
const RUNWAY_API_KEY = process.env.RUNWAYML_API_SECRET;

export interface RunwayT2IRequest {
  prompt: string;
  styleReference?: string; // Base64 encoded image
  model?: string;
  ratio?: string;
  seed?: number;
}

export interface RunwayT2IResponse {
  success: boolean;
  taskId?: string;
  error?: string;
}

export interface RunwayT2ITaskResponse {
  success: boolean;
  status?: string;
  imageUrl?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!RUNWAY_API_KEY) {
      console.log('❌ Runway API key not found in environment variables');
      return NextResponse.json(
        { success: false, error: 'Runway API key not configured' },
        { status: 500 }
      );
    }

    // Debug logging for API key
    console.log(`🔍 RUNWAYML_API_SECRET exists: ${!!process.env.RUNWAYML_API_SECRET}`);
    console.log(`🔍 RUNWAYML_API_SECRET length: ${process.env.RUNWAYML_API_SECRET?.length || 0} characters`);
    console.log(`🔍 RUNWAYML_API_SECRET preview: ${process.env.RUNWAYML_API_SECRET ? process.env.RUNWAYML_API_SECRET.substring(0, 8) + '...' : 'NOT SET'}`);

    const body: RunwayT2IRequest = await request.json();
    const { prompt, styleReference, model = 'gen4_image', ratio = '1024:1024', seed } = body;

    if (!prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('🎨 Runway T2I request:', { 
      prompt: prompt.substring(0, 100) + '...', 
      hasStyleReference: !!styleReference,
      model,
      ratio
    });

    // Prepare the request payload for Runway ML
    const runwayPayload: any = {
      model,
      promptText: prompt.trim(),
      ratio
    };

    // Add seed if provided
    if (seed) {
      runwayPayload.seed = seed;
    }

    // Add style reference if provided
    if (styleReference) {
      runwayPayload.referenceImages = [{
        uri: `data:image/jpeg;base64,${styleReference}`,
        tag: 'style'
      }];
    }

    console.log('🚀 Sending request to Runway ML...');
    console.log('📤 Request payload:', JSON.stringify(runwayPayload, null, 2));
    console.log('🔗 API URL:', RUNWAY_API_URL);

    const response = await fetch(RUNWAY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify(runwayPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Runway T2I API error:', response.status, errorText);
      console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
      
      let errorMessage = 'Failed to generate image';
      if (response.status === 401) {
        errorMessage = 'Invalid API credentials - please check your RUNWAYML_API_SECRET';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request parameters';
      } else if (response.status === 404) {
        errorMessage = 'API endpoint not found - please check the endpoint URL';
      }

      return NextResponse.json(
        { success: false, error: errorMessage, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Runway T2I task created:', data);

    // Extract the task ID from the response
    const taskId = data.id;
    
    if (!taskId) {
      console.error('❌ No task ID in response:', data);
      return NextResponse.json(
        { success: false, error: 'No task ID received' },
        { status: 500 }
      );
    }

    console.log('🎨 Task ID:', taskId);

    return NextResponse.json({
      success: true,
      taskId
    });

  } catch (error) {
    console.error('❌ Runway T2I error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to poll task status
export async function GET(request: NextRequest) {
  try {
    if (!RUNWAY_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Runway API key not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Polling Runway T2I task: ${taskId}`);

    const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RUNWAY_API_KEY}`,
        'X-Runway-Version': '2024-11-06',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Runway T2I task polling error:', response.status, errorText);
      
      return NextResponse.json(
        { success: false, error: 'Failed to poll task status' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Runway T2I task status:', data);

    // Check task status
    if (data.status === 'SUCCEEDED' && data.output && data.output.length > 0) {
      // Extract image URL from output array
      const imageUrl = data.output[0];
      
      if (imageUrl) {
        console.log('✅ Runway T2I completed:', imageUrl);
        return NextResponse.json({
          success: true,
          status: 'completed',
          imageUrl
        });
      }
    }

    // Return current status
    return NextResponse.json({
      success: true,
      status: data.status || 'unknown'
    });

  } catch (error) {
    console.error('❌ Runway T2I polling error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to cancel/delete tasks
export async function DELETE(request: NextRequest) {
  try {
    if (!RUNWAY_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Runway API key not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Canceling Runway T2I task: ${taskId}`);

    const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${RUNWAY_API_KEY}`,
        'X-Runway-Version': '2024-11-06',
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      console.error('❌ Runway T2I task cancellation error:', response.status, errorText);
      
      return NextResponse.json(
        { success: false, error: 'Failed to cancel task' },
        { status: response.status }
      );
    }

    console.log('✅ Runway T2I task canceled/deleted');

    return NextResponse.json({
      success: true,
      message: 'Task canceled successfully'
    });

  } catch (error) {
    console.error('❌ Runway T2I cancellation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
