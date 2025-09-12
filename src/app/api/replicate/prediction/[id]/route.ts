import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: predictionId } = await params;

    if (!predictionId) {
      return NextResponse.json({ error: 'Prediction ID is required' }, { status: 400 });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('REPLICATE_API_TOKEN is not set');
      return NextResponse.json({ error: 'Server configuration error: Replicate API token missing' }, { status: 500 });
    }

    console.log('🔍 Checking Replicate prediction status:', predictionId);

    const prediction = await replicate.predictions.get(predictionId);

    console.log('📊 Prediction status:', { 
      id: prediction.id, 
      status: prediction.status,
      hasOutput: !!prediction.output 
    });

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
      logs: prediction.logs,
      urls: prediction.urls
    });

  } catch (error) {
    console.error('❌ Error checking Replicate prediction:', error);
    return NextResponse.json({
      error: 'Failed to check prediction status',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
