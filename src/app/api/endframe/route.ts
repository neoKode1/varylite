import { NextRequest, NextResponse } from 'next/server';

// Types for EndFrame API
interface EndFrameRequest {
  firstImage: string; // base64 encoded first image (start frame)
  secondImage: string; // base64 encoded second image (end frame)
  prompt: string; // description of the transition
  model?: string; // model to use (default: MiniMax-Hailuo-02)
}

interface EndFrameResponse {
  success: boolean;
  videoUrl?: string;
  taskId?: string;
  status?: string;
  error?: string;
  retryable?: boolean;
}

// Helper function to create data URI from base64
function createDataUri(base64Data: string): string {
  return `data:image/jpeg;base64,${base64Data}`;
}

// Helper function to validate image aspect ratio for Minimax API
function validateImageAspectRatio(base64Data: string): { isValid: boolean; message?: string } {
  try {
    // For now, we'll add a simple validation message
    // In a production environment, you might want to use a library like 'sharp' to validate images
    console.log('🔍 Validating image aspect ratio for Minimax API...');
    
    // Minimax typically requires images with reasonable aspect ratios
    // Common video aspect ratios: 16:9, 4:3, 1:1, 9:16
    // We'll let Minimax handle the validation and provide better error messages
    
    return { isValid: true };
  } catch (error) {
    console.warn('⚠️ Image validation failed:', error);
    return { isValid: false, message: 'Image validation failed' };
  }
}

// POST endpoint to generate end frames
export async function POST(request: NextRequest) {
  // DISABLED: This video model route is not in the approved list
  return NextResponse.json(
    { error: 'This video model route has been disabled. Please use approved models: Minimax 2.0, Kling 2.1 Master, or Veo3 Fast.' },
    { status: 410 } // Gone
  );
  console.log('🚀 API Route: /api/endframe - EndFrame generation request received');
  
  try {
    console.log('📝 Parsing request body...');
    const body: EndFrameRequest = await request.json();
    console.log('✅ Request body parsed successfully');
    
    const { firstImage, secondImage, prompt, model = 'MiniMax-Hailuo-02' } = body;
    
    console.log(`📋 Prompt: "${prompt}"`);
    console.log(`🤖 Model: ${model}`);
    
    // Log API key status
    console.log('🔑 Checking API keys...');
    console.log(`🔍 MINIMAX_API_KEY exists: ${!!process.env.MINIMAX_API_KEY}`);
    console.log(`🔍 MINIMAX_API_KEY length: ${process.env.MINIMAX_API_KEY?.length || 0} characters`);
    console.log(`🔍 MINIMAX_API_KEY preview: ${process.env.MINIMAX_API_KEY ? process.env.MINIMAX_API_KEY!.substring(0, 8) + '...' : 'NOT SET'}`);
    
    if (!process.env.MINIMAX_API_KEY) {
      throw new Error('Minimax API key not configured. Please add MINIMAX_API_KEY to your environment variables.');
    }
    
    if (!firstImage || !secondImage) {
      throw new Error('Both first and second images are required');
    }
    
    if (!prompt) {
      throw new Error('No prompt provided');
    }
    
    // Validate image aspect ratios
    const firstImageValidation = validateImageAspectRatio(firstImage);
    const secondImageValidation = validateImageAspectRatio(secondImage);
    
    if (!firstImageValidation.isValid) {
      throw new Error(`First image validation failed: ${firstImageValidation.message}`);
    }
    
    if (!secondImageValidation.isValid) {
      throw new Error(`Second image validation failed: ${secondImageValidation.message}`);
    }
    
    // Create data URIs from base64 images
    const firstImageUri = createDataUri(firstImage);
    const secondImageUri = createDataUri(secondImage);
    console.log('🖼️ Image URIs created successfully');
    
    // Make request to Minimax EndFrame API
    console.log('🔄 Making request to Minimax EndFrame API...');
    
    const requestBody = {
      model: model, // Use the model that supports last_frame_image
      prompt: prompt,
      first_frame_image: firstImageUri, // Use the first image as the starting frame
      last_frame_image: secondImageUri, // Use the second image as the ending frame
      resolution: '768P',
      duration: 6,
      prompt_optimizer: true
    };
    
    console.log('📤 Sending request to Minimax API...');
    console.log(`📋 Request body keys: ${Object.keys(requestBody).join(', ')}`);
    
    // Step 1: Submit generation task
    const response = await fetch('https://api.minimax.io/v1/video_generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Minimax API error: ${response.status} - ${errorText}`);
      throw new Error(`Minimax API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Minimax API response received');
    console.log(`📊 Response keys: ${Object.keys(result).join(', ')}`);
    
    // Check for API errors first
    if (result.base_resp && result.base_resp.status_code !== 0) {
      const errorCode = result.base_resp.status_code;
      const errorMsg = result.base_resp.status_msg;
      
      if (errorCode === 1008) {
        throw new Error('Insufficient balance in your Minimax account. Please add credits to continue.');
      } else {
        throw new Error(`Minimax API error (${errorCode}): ${errorMsg}`);
      }
    }
    
    // Extract task ID from response
    let taskId: string;
    if (result.task_id && result.task_id !== '') {
      taskId = result.task_id;
    } else if (result.id) {
      taskId = result.id;
    } else if (result.taskId) {
      taskId = result.taskId;
    } else {
      console.error('❌ No task ID found in response:', result);
      throw new Error('No task ID found in API response');
    }
    
    console.log(`🎬 Task submitted with ID: ${taskId}`);
    
    return NextResponse.json({
      success: true,
      taskId: taskId
    } as EndFrameResponse);

  } catch (error) {
    console.error('💥 Error in endframe API:', error);
    console.error('💥 Error type:', typeof error);
    console.error('💥 Error name:', error instanceof Error ? (error as Error).name : 'Unknown');
    console.error('💥 Error message:', error instanceof Error ? (error as Error).message : 'Unknown error');
    console.error('💥 Full error stack:', error instanceof Error ? (error as Error).stack : 'No stack trace');

    let errorMessage = 'An unexpected error occurred while generating the end frame.';
    let statusCode = 500;
    let retryable = false;

    if (error instanceof Error) {
      if ((error as Error).message.includes('aspect ratio') || (error as Error).message.includes('2013')) {
        errorMessage = 'Image aspect ratio is not supported. Please use images with standard aspect ratios (16:9, 4:3, 1:1, or 9:16).';
        statusCode = 400;
      } else if ((error as Error).message.includes('content policy') || (error as Error).message.includes('inappropriate')) {
        errorMessage = 'Content policy violation. Please ensure your content complies with Minimax\'s guidelines.';
        statusCode = 400;
      } else if ((error as Error).message.includes('quota exceeded')) {
        errorMessage = 'Minimax API quota exceeded. Please check your account limits.';
        statusCode = 429;
        retryable = true;
      } else if ((error as Error).message.includes('invalid api key') || (error as Error).message.includes('authentication')) {
        errorMessage = 'Minimax API authentication failed. Please check your API key.';
        statusCode = 401;
      } else if ((error as Error).message.includes('timeout') || (error as Error).message.includes('network error')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
        statusCode = 408;
        retryable = true;
      } else if ((error as Error).message.includes('No image URL found')) {
        errorMessage = 'EndFrame generation completed but no image was returned. Please try again.';
        statusCode = 500;
        retryable = true;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      retryable
    } as EndFrameResponse, { status: statusCode });
  }
}

// GET endpoint for polling task status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  
  if (!taskId) {
    return NextResponse.json({
      success: false,
      error: 'Task ID is required'
    }, { status: 400 });
  }
  
  try {
    console.log(`🔍 Polling task status for ID: ${taskId}`);
    
    // Step 2: Poll for task completion
    const response = await fetch(`https://api.minimax.io/v1/query/video_generation?task_id=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Minimax polling error: ${response.status} - ${errorText}`);
      console.error(`🔍 Polling URL used: https://api.minimax.io/v1/query/video_generation?task_id=${taskId}`);
      throw new Error(`Minimax polling error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Task status retrieved');
    console.log(`📊 Response keys: ${Object.keys(result).join(', ')}`);
    console.log(`📊 Task status: ${result.status || 'unknown'}`);
    
    // Check for API errors first (status codes from Minimax documentation)
    if (result.base_resp && result.base_resp.status_code !== 0) {
      const errorCode = result.base_resp.status_code;
      const errorMsg = result.base_resp.status_msg;
      
      if (errorCode === 1002) {
        throw new Error('Rate limit exceeded. Please contact sales representative.');
      } else if (errorCode === 1004) {
        throw new Error('Account authentication failed. Please check your API key.');
      } else if (errorCode === 1027) {
        throw new Error('Video generated involves sensitive content.');
      } else if (errorCode === 2013) {
        throw new Error('Image aspect ratio is not supported. Please use images with standard aspect ratios (16:9, 4:3, 1:1, or 9:16).');
      } else {
        throw new Error(`Minimax API error (${errorCode}): ${errorMsg}`);
      }
    }
    
    // Check if task is completed
    // According to Minimax docs: Success = task is successful
    if (result.status === 'Success') {
      // Step 3: Get video URL
      // According to Minimax docs: file_id is returned when status = Success
      let videoUrl: string;
      if (result.file_id) {
        // Try the retrieve endpoint first, but fallback to direct download if it fails
        console.log(`🔍 Attempting to retrieve download URL for file_id: ${result.file_id}`);
        
        try {
          const groupId = '1873557518391709839'; // Your Minimax GroupId
                     const retrieveResponse = await fetch(`https://api.minimax.io/v1/files/retrieve?GroupId=${groupId}&file_id=${result.file_id}`, {
             method: 'GET',
             headers: {
               'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
               'Content-Type': 'application/json',
             }
           });
          
          if (retrieveResponse.ok) {
            const retrieveResult = await retrieveResponse.json();
            console.log('✅ Download URL retrieved:', retrieveResult);
            
            // Check for API errors in retrieve response
            if (retrieveResult.base_resp && retrieveResult.base_resp.status_code !== 0) {
              const errorCode = retrieveResult.base_resp.status_code;
              const errorMsg = retrieveResult.base_resp.status_msg;
              throw new Error(`Minimax retrieve error (${errorCode}): ${errorMsg}`);
            }
            
            // Get the download URL from the response
            if (retrieveResult.file && retrieveResult.file.download_url) {
              videoUrl = retrieveResult.file.download_url;
              console.log(`🎬 Using download URL: ${videoUrl}`);
            } else if (retrieveResult.file && retrieveResult.file.backup_download_url) {
              videoUrl = retrieveResult.file.backup_download_url;
              console.log(`🎬 Using backup download URL: ${videoUrl}`);
            } else {
              throw new Error('No download URL found in retrieve response');
            }
          } else {
            throw new Error(`Retrieve endpoint returned ${retrieveResponse.status}`);
          }
        } catch (retrieveError) {
          const errorMessage = retrieveError instanceof Error ? retrieveError.message : 'Unknown error';
          console.warn(`⚠️ Retrieve endpoint failed: ${errorMessage}`);
          console.log(`🔄 Falling back to direct download approach`);
          
          // Fallback: Use proxy endpoint to handle authentication
          videoUrl = `/api/minimax-video?fileId=${result.file_id}`;
          console.log(`🎬 Using proxy download URL: ${videoUrl}`);
        }
      } else if (result.video_url) {
        videoUrl = result.video_url;
      } else if (result.output && result.output.video_url) {
        videoUrl = result.output.video_url;
      } else if (result.data && result.data.video_url) {
        videoUrl = result.data.video_url;
      } else if (result.url) {
        videoUrl = result.url;
      } else {
        console.error('❌ No file_id or video URL found in completed task:', result);
        throw new Error('No file_id or video URL found in completed task');
      }
      
      console.log(`🎬 Video ready: ${videoUrl}`);
      
      return NextResponse.json({
        success: true,
        status: 'completed',
        videoUrl: videoUrl
      } as EndFrameResponse);
    } else if (result.status === 'Fail') {
      console.error('❌ Task failed:', result);
      return NextResponse.json({
        success: false,
        status: 'failed',
        error: result.error || 'Task failed'
      } as EndFrameResponse);
    } else {
      // Task is still processing
      // According to Minimax docs: Queueing, Preparing, Processing are all processing states
      console.log(`⏳ Task still processing: ${result.status}`);
      console.log(`📊 Task details:`, {
        task_id: result.task_id,
        status: result.status,
        file_id: result.file_id || 'not_ready_yet'
      });
      
      return NextResponse.json({
        success: true,
        status: result.status || 'processing'
      } as EndFrameResponse);
    }
    
  } catch (error) {
    console.error('💥 Error polling task:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Polling failed'
    } as EndFrameResponse, { status: 500 });
  }
}
