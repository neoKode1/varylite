import { NextRequest, NextResponse } from 'next/server';
import { CreditService } from '@/lib/creditService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, output, error, urls } = body;

    console.log('🔔 Replicate Webhook Received:', {
      id,
      status,
      hasOutput: !!output,
      hasError: !!error,
      hasUrls: !!urls
    });

    // Handle different prediction statuses
    if (status === 'succeeded' && output) {
      console.log('✅ LipSync 2 Pro completed successfully:', id);
      
      // Extract video URL from output
      const videoUrl = Array.isArray(output) ? output[0] : output;
      
      // Log the completion for tracking
      console.log('🎬 LipSync 2 Pro output:', {
        predictionId: id,
        videoUrl,
        status: 'completed'
      });

      // You could store the result in a database here if needed
      // For now, we'll just log the completion

    } else if (status === 'failed') {
      console.error('❌ LipSync 2 Pro failed:', {
        predictionId: id,
        error: error || 'Unknown error'
      });

      // If the prediction failed, you might want to refund credits
      // This would require storing the original request details
      
    } else if (status === 'canceled') {
      console.log('🚫 LipSync 2 Pro canceled:', id);
      
    } else {
      console.log('⏳ LipSync 2 Pro status update:', {
        predictionId: id,
        status
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Replicate Webhook Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
