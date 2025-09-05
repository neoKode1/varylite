import { NextRequest, NextResponse } from 'next/server';
import RunwayML from '@runwayml/sdk';

// Initialize Runway client
const client = new RunwayML();

// Types for Runway API
type VideoToVideoRatio = '1280:720' | '720:1280' | '1104:832' | '960:960' | '832:1104' | '1584:672' | '848:480' | '640:480';
type ImageToVideoRatio = '1280:720' | '720:1280' | '1104:832' | '960:960' | '832:1104' | '1584:672' | '1280:768' | '768:1280';

interface RunwayVideoRequest {
  files: string[]; // base64 encoded files
  prompt: string;
  model: 'gen4_turbo' | 'gen3a_turbo' | 'gen4_aleph' | 'gen4_image' | 'gen4_image_turbo' | 'upscale_v1' | 'act_two';
  ratio: VideoToVideoRatio | ImageToVideoRatio;
  duration?: number;
  promptText?: string;
  seed?: number;
  references?: Array<{
    type: 'image';
    uri: string;
  }>;
}

interface RunwayVideoResponse {
  success: boolean;
  taskId?: string;
  error?: string;
  retryable?: boolean;
}

interface RunwayTaskResponse {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  error?: string;
  output?: {
    video?: string;
    image?: string;
  };
  progress?: number;
  failure?: string;
  failureCode?: string;
  failureReason?: string;
  logs?: any[];
}

// Helper function to create data URI from base64
function createDataUri(base64Data: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64Data}`;
}

// Helper function to get MIME type from base64 data
function getMimeType(base64Data: string): string {
  // Check for common image formats
  if (base64Data.startsWith('/9j/') || base64Data.startsWith('iVBORw0KGgo')) {
    return 'image/jpeg';
  } else if (base64Data.startsWith('iVBORw0KGgo')) {
    return 'image/png';
  }
  // Check for common video formats
  else if (base64Data.startsWith('UklGR')) {
    return 'video/webm';
  } else if (base64Data.startsWith('AAAAIGZ0eXA')) {
    return 'video/mp4';
  } else if (base64Data.startsWith('GkXfo')) {
    return 'video/webm';
  } else if (base64Data.startsWith('moov')) {
    return 'video/mp4';
  }
  // Default fallback - assume video for now
  return 'video/mp4';
}

// POST endpoint to create video editing tasks
export async function POST(request: NextRequest) {
  console.log('🚀 API Route: /api/runway-video - Video editing request received');
  
  try {
    console.log('📝 Parsing request body...');
    const body: RunwayVideoRequest = await request.json();
    console.log('✅ Request body parsed successfully');
    
    const { files, prompt, model, ratio = '1280:720', duration, promptText, seed, references } = body;
    
    console.log(`📋 Prompt: "${prompt}"`);
    console.log(`🤖 Model: ${model}`);
    console.log(`📐 Ratio: ${ratio}`);
    console.log(`🖼️ Number of files: ${files.length}`);
    
    // Log API key status
    console.log('🔑 Checking API keys...');
    console.log(`🔍 GOOGLE_API_KEY exists: ${!!process.env.GOOGLE_API_KEY}`);
    console.log(`🔍 GOOGLE_API_KEY length: ${process.env.GOOGLE_API_KEY?.length || 0} characters`);
    console.log(`🔍 GOOGLE_API_KEY preview: ${process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.substring(0, 8) + '...' : 'NOT SET'}`);
    console.log(`🔍 FAL_KEY exists: ${!!process.env.FAL_KEY}`);
    console.log(`🔍 FAL_KEY length: ${process.env.FAL_KEY?.length || 0} characters`);
    console.log(`🔍 FAL_KEY preview: ${process.env.FAL_KEY ? process.env.FAL_KEY.substring(0, 8) + '...' : 'NOT SET'}`);
    console.log(`🔍 RUNWAYML_API_SECRET exists: ${!!process.env.RUNWAYML_API_SECRET}`);
    console.log(`🔍 RUNWAYML_API_SECRET length: ${process.env.RUNWAYML_API_SECRET?.length || 0} characters`);
    console.log(`🔍 RUNWAYML_API_SECRET preview: ${process.env.RUNWAYML_API_SECRET ? process.env.RUNWAYML_API_SECRET.substring(0, 8) + '...' : 'NOT SET'}`);
    
    if (!process.env.RUNWAYML_API_SECRET) {
      throw new Error('Runway API key not configured. Please add RUNWAYML_API_SECRET to your environment variables.');
    }
    
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }
    
    // Trust the model parameter from frontend instead of trying to detect from base64
    console.log(`🔍 Using model: ${model} (trusting frontend file type detection)`);
    
    // Make request to Runway API using SDK
    console.log('🔄 Making request to Runway API using SDK...');
    
    let task;
    try {
      if (model === 'gen4_aleph') {
        // Video to video editing
        const primaryVideo = createDataUri(files[0], getMimeType(files[0]));
        
        task = await (client.videoToVideo as any).create({
          model: 'gen4_aleph',
          videoUri: primaryVideo,
          promptText: promptText || prompt,
          ratio: ratio as VideoToVideoRatio,
          ...(seed && { seed }),
          ...(references && { references })
        });
        
        console.log(`🎬 Video-to-video editing with gen4_aleph model`);
        console.log(`📝 Prompt: "${promptText || prompt}"`);
      } else if (model === 'gen4_turbo') {
        // Image to video generation
        const primaryImage = createDataUri(files[0], getMimeType(files[0]));
        
        task = await (client.imageToVideo as any).create({
          model: 'gen4_turbo',
          imageUri: primaryImage,
          promptText: promptText || prompt,
          ratio: ratio as ImageToVideoRatio,
          ...(duration && { duration }),
          ...(seed && { seed }),
          ...(references && { references })
        });
        
        console.log(`🎬 Image-to-video generation with gen4_turbo model`);
        console.log(`📝 Prompt: "${promptText || prompt}"`);
      } else {
        throw new Error(`Unsupported model: ${model}`);
      }
      
      console.log('✅ Runway video editing task created successfully');
      console.log(`📋 Task ID: ${task.id}`);
    } catch (error) {
      console.error('❌ Runway API error:', error);
      throw new Error(`Runway API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return NextResponse.json({
      success: true,
      taskId: task.id
    } as RunwayVideoResponse);

  } catch (error) {
    console.error('💥 Error in runway-video API:', error);
    console.error('💥 Error type:', typeof error);
    console.error('💥 Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('💥 Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('💥 Full error stack:', error instanceof Error ? error.stack : 'No stack trace');

    let errorMessage = 'An unexpected error occurred while processing your request.';
    let statusCode = 500;
    let retryable = false;

    if (error instanceof Error) {
      if (error.message.includes('content policy') || error.message.includes('inappropriate')) {
        errorMessage = 'Content policy violation. Please ensure your content complies with Runway\'s guidelines.';
        statusCode = 400;
      } else if (error.message.includes('quota exceeded')) {
        errorMessage = 'Runway API quota exceeded. Please check your account limits.';
        statusCode = 429;
        retryable = true;
      } else if (error.message.includes('invalid api key') || error.message.includes('authentication')) {
        errorMessage = 'Runway API authentication failed. Please check your API key.';
        statusCode = 401;
      } else if (error.message.includes('timeout') || error.message.includes('network error')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
        statusCode = 408;
        retryable = true;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      retryable
    } as RunwayVideoResponse, { status: statusCode });
  }
}

// GET endpoint to check task status
export async function GET(request: NextRequest) {
  console.log('🔍 API Route: /api/runway-video - Task status check');
  
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: 'Task ID is required'
      }, { status: 400 });
    }

    if (!process.env.RUNWAYML_API_SECRET) {
      console.log('❌ Runway API key not found in environment variables');
      return NextResponse.json({
        success: false,
        error: 'Runway API key not configured'
      }, { status: 500 });
    }

    console.log(`🔍 Checking status for task: ${taskId}`);

    // Use raw fetch for task status since SDK method might be different
    const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.RUNWAYML_API_SECRET}`,
        'X-Runway-Version': '2024-11-06',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Runway API error: ${response.status} - ${errorText}`);
      throw new Error(`Runway API error: ${response.status} - ${errorText}`);
    }

    const taskData = await response.json();
    console.log(`📊 Task status: ${taskData.status}`);
    console.log(`📋 Task ID: ${taskData.id}`);
    console.log(`📋 Task progress: ${taskData.progress || 'N/A'}`);
    console.log(`📋 Task error: ${taskData.error || 'None'}`);
    
    // Log failure details if task failed
    if (taskData.status === 'FAILED') {
      console.log(`❌ Task failed - detailed error info:`);
      console.log(`📋 Failure: ${taskData.failure || 'None'}`);
      console.log(`📋 Failure Code: ${taskData.failureCode || 'None'}`);
      console.log(`📋 Failure Reason: ${taskData.failureReason || 'None'}`);
      console.log(`📋 Logs: ${taskData.logs ? JSON.stringify(taskData.logs, null, 2) : 'None'}`);
      console.log(`📋 Full task data:`, JSON.stringify(taskData, null, 2));
    }
    
    // Log output structure for debugging
    if (taskData.output) {
      console.log(`📋 Output type: ${typeof taskData.output}`);
      if (Array.isArray(taskData.output)) {
        console.log(`📋 Output array length: ${taskData.output.length}`);
        if (taskData.output.length > 0) {
          console.log(`📋 First output item: ${taskData.output[0]}`);
        }
      } else {
        console.log(`📋 Output keys:`, Object.keys(taskData.output));
      }
    } else {
      console.log(`📋 No output yet`);
    }
    
    // Log video output specifically
    if (taskData.output && taskData.output.video) {
      console.log(`🎬 Video output URL: ${taskData.output.video}`);
    } else if (taskData.output) {
      console.log(`📋 Output keys:`, Object.keys(taskData.output));
    }

    return NextResponse.json({
      success: true,
      task: taskData
    });

  } catch (error) {
    console.error('💥 Error checking task status:', error);
    
    let errorMessage = 'Failed to check task status.';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        errorMessage = 'Task not found.';
        statusCode = 404;
      } else if (error.message.includes('authentication') || error.message.includes('401')) {
        errorMessage = 'Authentication failed.';
        statusCode = 401;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: statusCode });
  }
}