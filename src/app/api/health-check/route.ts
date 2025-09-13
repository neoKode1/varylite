import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Health check requested');
    
    const healthStatus = {
      timestamp: new Date().toISOString(),
      services: {
        googleAI: {
          status: 'unknown' as string,
          error: null as string | null,
          apiKeyPresent: !!process.env.GOOGLE_API_KEY,
          apiKeyLength: process.env.GOOGLE_API_KEY?.length || 0
        },
        falAI: {
          status: 'unknown' as string,
          error: null as string | null,
          apiKeyPresent: !!process.env.FAL_KEY,
          apiKeyLength: process.env.FAL_KEY?.length || 0
        }
      }
    };

    // Test Google AI API
    if (process.env.GOOGLE_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        // Simple test request
        const result = await model.generateContent('Hello');
        await result.response;
        
        healthStatus.services.googleAI.status = 'healthy';
        console.log('✅ Google AI API is healthy');
      } catch (error) {
        healthStatus.services.googleAI.status = 'unhealthy';
        healthStatus.services.googleAI.error = (error as Error).message;
        console.log('❌ Google AI API is unhealthy:', (error as Error).message);
      }
    } else {
      healthStatus.services.googleAI.status = 'not_configured';
      healthStatus.services.googleAI.error = 'API key not found';
      console.log('⚠️ Google AI API key not configured');
    }

    // Test Fal AI API (if configured)
    if (process.env.FAL_KEY) {
      try {
        // Simple test - just check if we can make a basic request
        const response = await fetch('https://fal.run/fal-ai/flux-dev', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${process.env.FAL_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: 'test',
            image_url: 'https://example.com/test.jpg',
            num_inference_steps: 1
          })
        });
        
        // We expect this to fail with a 400 (bad request) but that means the API is reachable
        if (response.status === 400 || response.status === 422) {
          healthStatus.services.falAI.status = 'healthy';
          console.log('✅ Fal AI API is reachable');
        } else {
          healthStatus.services.falAI.status = 'unhealthy';
          healthStatus.services.falAI.error = `Unexpected status: ${response.status}`;
          console.log('❌ Fal AI API returned unexpected status:', response.status);
        }
      } catch (error) {
        healthStatus.services.falAI.status = 'unhealthy';
        healthStatus.services.falAI.error = (error as Error).message;
        console.log('❌ Fal AI API is unhealthy:', (error as Error).message);
      }
    } else {
      healthStatus.services.falAI.status = 'not_configured';
      healthStatus.services.falAI.error = 'API key not found';
      console.log('⚠️ Fal AI API key not configured');
    }

    const overallStatus = Object.values(healthStatus.services).every(
      service => service.status === 'healthy' || service.status === 'not_configured'
    ) ? 'healthy' : 'unhealthy';

    return NextResponse.json({
      status: overallStatus,
      ...healthStatus
    }, { 
      status: overallStatus === 'healthy' ? 200 : 503 
    });

  } catch (error) {
    console.error('💥 Health check failed:', error);
    return NextResponse.json({
      status: 'error',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
