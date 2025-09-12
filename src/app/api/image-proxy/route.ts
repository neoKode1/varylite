import { NextRequest, NextResponse } from 'next/server';

// OPTIONS endpoint for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}

// GET endpoint to proxy any image URL to avoid CORS blocking
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');
  
  if (!imageUrl) {
    return NextResponse.json({
      error: 'Image URL is required'
    }, { status: 400 });
  }

  // Validate URL to prevent SSRF attacks
  try {
    const url = new URL(imageUrl);
    const allowedHosts = [
      'api.minimax.io',
      'cdn.fal.ai',
      'v3.fal.media',
      'storage.googleapis.com',
      's3.amazonaws.com',
      'cdn.runwayml.com',
      'inference_output',
      'localhost',
      '127.0.0.1',
      // Add the specific CDN domains that are being blocked
      'public-cdn-video-data-algeng.oss-cn-wulanchabu.aliyuncs.com',
      'dnznrvs05pmza.cloudfront.net',
      'oss-cn-wulanchabu.aliyuncs.com',
      'cloudfront.net'
    ];
    
    const isAllowed = allowedHosts.some(host => 
      url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
    
    if (!isAllowed) {
      console.warn(`🚫 Blocked request to unauthorized host: ${url.hostname}`);
      return NextResponse.json({
        error: 'Unauthorized host'
      }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Invalid URL format'
    }, { status: 400 });
  }
  
  try {
    console.log(`🖼️ Proxying image from: ${imageUrl}`);
    
    // Fetch the image with proper headers
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; vARI-Ai/1.0)',
        'Accept': 'image/*,*/*;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      console.error(`❌ Image fetch failed: ${response.status} - ${response.statusText}`);
      return NextResponse.json({
        error: `Failed to fetch image: ${response.status} ${response.statusText}`
      }, { status: response.status });
    }
    
    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    
    // Get content type from the response
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    console.log(`✅ Image proxied successfully, size: ${imageBuffer.byteLength} bytes, type: ${contentType}`);
    
    // Return the image with proper headers to avoid CORS blocking
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400', // 24 hours
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        // Add headers to prevent CORS blocking
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      }
    });
    
  } catch (error) {
    console.error('💥 Error proxying image:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json({
          error: 'Image request timed out'
        }, { status: 408 });
      }
      
      if (error.message.includes('fetch')) {
        return NextResponse.json({
          error: 'Failed to fetch image from source'
        }, { status: 502 });
      }
    }
    
    return NextResponse.json({
      error: 'Failed to proxy image'
    }, { status: 500 });
  }
}
