import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, input, options = {} } = body;

    if (!model) {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }

    if (!input) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    console.log(`🚀 FAL API Request - Model: ${model}`, { input, options });

    // Submit the request to FAL
    const result = await fal.subscribe(model, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log(`📊 FAL Queue Update:`, update.logs?.map(log => log.message));
        }
      },
      ...options
    });

    console.log(`✅ FAL API Response - Model: ${model}`, { 
      requestId: result.requestId,
      hasData: !!result.data 
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      requestId: result.requestId
    });

  } catch (error) {
    console.error('❌ FAL API Error:', error);
    
    return NextResponse.json({ 
      error: 'FAL API request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    console.log(`🔍 FAL Status Check - Request ID: ${requestId}`);

    // Check the status of a FAL request
    const result = await fal.status(requestId);

    console.log(`📊 FAL Status Response:`, { 
      requestId,
      status: result.status,
      hasData: !!result.data 
    });

    return NextResponse.json({
      success: true,
      status: result.status,
      data: result.data,
      logs: result.logs
    });

  } catch (error) {
    console.error('❌ FAL Status Check Error:', error);
    
    return NextResponse.json({ 
      error: 'FAL status check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
