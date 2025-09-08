/**
 * Video frame extraction utilities
 * Uses the FFmpeg frame extraction API to generate thumbnails from videos
 */

export interface VideoFrameExtractionOptions {
  videoUrl: string;
  frameType?: 'first' | 'middle' | 'last';
}

export interface VideoFrameExtractionResult {
  success: boolean;
  frameUrl?: string;
  error?: string;
}

/**
 * Extracts a frame from a video using the FFmpeg API
 */
export async function extractVideoFrame(
  options: VideoFrameExtractionOptions
): Promise<VideoFrameExtractionResult> {
  const { videoUrl, frameType = 'last' } = options;
  const startTime = Date.now();
  
  try {
    console.log('🎬 [VideoFrameExtractor] ===== FRAME EXTRACTION START =====');
    console.log('🎬 [VideoFrameExtractor] Input parameters:', {
      videoUrl: videoUrl.length > 100 ? videoUrl.substring(0, 100) + '...' : videoUrl,
      fullVideoUrl: videoUrl,
      frameType,
      timestamp: new Date().toISOString()
    });

    // Validate inputs
    if (!videoUrl || !videoUrl.startsWith('http')) {
      throw new Error(`Invalid video URL: ${videoUrl}`);
    }

    console.log('🎬 [VideoFrameExtractor] Preparing API request...');
    const requestBody = {
      model: 'fal-ai/ffmpeg-api/extract-frame',
      prompt: 'Extract frame from video', // Required by FAL API
      video_url: videoUrl,
      frame_type: frameType
    };
    console.log('🎬 [VideoFrameExtractor] Request body:', requestBody);

    // Call the FFmpeg frame extraction API
    console.log('🎬 [VideoFrameExtractor] Making API call to /api/extract-frame...');
    const response = await fetch('/api/extract-frame', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('🎬 [VideoFrameExtractor] API response status:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [VideoFrameExtractor] API error response:', errorText);
      throw new Error(`Frame extraction API failed: ${response.status} - ${errorText}`);
    }

    console.log('🎬 [VideoFrameExtractor] Parsing response JSON...');
    const result = await response.json();
    console.log('🎬 [VideoFrameExtractor] Full API response:', JSON.stringify(result, null, 2));

    // Analyze response structure
    console.log('🎬 [VideoFrameExtractor] Response analysis:', {
      hasSuccess: 'success' in result,
      successValue: result.success,
      hasData: 'data' in result,
      dataType: typeof result.data,
      dataKeys: result.data ? Object.keys(result.data) : 'N/A'
    });

    if (result.success && result.data) {
      // FFmpeg extract frame returns images array
      const imageUrl = result.data.images?.[0]?.url || result.data.image?.url || result.data.url;
      
      console.log('🎬 [VideoFrameExtractor] Image URL extraction:', {
        foundInImages: !!result.data.images?.[0]?.url,
        foundInImage: !!result.data.image?.url,
        foundInRoot: !!result.data.url,
        finalImageUrl: imageUrl
      });

      if (imageUrl) {
        const duration = Date.now() - startTime;
        console.log('✅ [VideoFrameExtractor] Frame extraction successful!', {
          frameUrl: imageUrl.length > 100 ? imageUrl.substring(0, 100) + '...' : imageUrl,
          fullFrameUrl: imageUrl,
          duration: `${duration}ms`,
          frameType
        });
        console.log('🎬 [VideoFrameExtractor] ===== FRAME EXTRACTION SUCCESS =====');
        
        return {
          success: true,
          frameUrl: imageUrl
        };
      }
    }
    
    const errorMsg = result.error || 'Frame extraction failed - no image URL returned';
    console.error('❌ [VideoFrameExtractor] No valid image URL found in response');
    throw new Error(errorMsg);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [VideoFrameExtractor] ===== FRAME EXTRACTION FAILED =====');
    console.error('❌ [VideoFrameExtractor] Error details:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'N/A',
      duration: `${duration}ms`,
      videoUrl: videoUrl.substring(0, 100) + '...',
      frameType
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Extracts frame and caches it for a video URL
 * Returns the cached frame if already extracted
 */
export async function getVideoFrameWithCache(
  videoUrl: string,
  frameType: 'first' | 'middle' | 'last' = 'last'
): Promise<string | null> {
  console.log('🎬 [VideoFrameExtractor] ===== CACHE FRAME REQUEST =====');
  const startTime = Date.now();
  
  try {
    const cacheKey = `video_frame_${frameType}_${btoa(videoUrl).substring(0, 20)}`;
    console.log('🎬 [VideoFrameExtractor] Cache operation details:', {
      videoUrl: videoUrl.length > 100 ? videoUrl.substring(0, 100) + '...' : videoUrl,
      frameType,
      cacheKey,
      timestamp: new Date().toISOString()
    });
    
    // Check if frame is already cached
    console.log('🎬 [VideoFrameExtractor] Checking localStorage cache...');
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const duration = Date.now() - startTime;
      console.log('✅ [VideoFrameExtractor] Cache HIT! Using cached frame:', {
        cacheKey,
        frameUrl: cached.length > 100 ? cached.substring(0, 100) + '...' : cached,
        duration: `${duration}ms`
      });
      console.log('🎬 [VideoFrameExtractor] ===== CACHE SUCCESS =====');
      return cached;
    }

    console.log('🎬 [VideoFrameExtractor] Cache MISS - extracting new frame...');
    
    // Extract new frame
    const result = await extractVideoFrame({ videoUrl, frameType });
    
    console.log('🎬 [VideoFrameExtractor] Extraction result for caching:', {
      success: result.success,
      hasFrameUrl: !!result.frameUrl,
      error: result.error || 'none'
    });
    
    if (result.success && result.frameUrl) {
      // Cache the frame
      try {
        console.log('🎬 [VideoFrameExtractor] Attempting to cache frame...');
        localStorage.setItem(cacheKey, result.frameUrl);
        
        // Verify cache was set
        const verification = localStorage.getItem(cacheKey);
        const isVerified = verification === result.frameUrl;
        
        const duration = Date.now() - startTime;
        console.log('✅ [VideoFrameExtractor] Frame cached successfully!', {
          cacheKey,
          frameUrl: result.frameUrl.length > 100 ? result.frameUrl.substring(0, 100) + '...' : result.frameUrl,
          verified: isVerified,
          duration: `${duration}ms`,
          cacheSize: new Blob([result.frameUrl]).size + ' bytes'
        });
        console.log('🎬 [VideoFrameExtractor] ===== CACHE & EXTRACT SUCCESS =====');
      } catch (error) {
        console.warn('⚠️ [VideoFrameExtractor] Failed to cache frame:', {
          error: error instanceof Error ? error.message : String(error),
          cacheKey,
          frameUrlLength: result.frameUrl.length
        });
        console.warn('⚠️ [VideoFrameExtractor] Possible localStorage full or quota exceeded');
      }
      
      return result.frameUrl;
    }

    const duration = Date.now() - startTime;
    console.error('❌ [VideoFrameExtractor] Failed to extract frame for caching:', {
      videoUrl: videoUrl.substring(0, 100) + '...',
      frameType,
      error: result.error,
      duration: `${duration}ms`
    });
    console.log('🎬 [VideoFrameExtractor] ===== CACHE FAILED =====');
    return null;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [VideoFrameExtractor] Cache operation failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'N/A',
      duration: `${duration}ms`
    });
    console.log('🎬 [VideoFrameExtractor] ===== CACHE ERROR =====');
    return null;
  }
}

/**
 * Downloads a video with its extracted frame as two separate files
 */
export async function downloadVideoWithFrame(
  videoUrl: string,
  videoTitle: string,
  extractFrameType: 'first' | 'middle' | 'last' = 'last'
): Promise<void> {
  console.log('📥 [VideoFrameExtractor] ===== DOWNLOAD WITH FRAME START =====');
  const startTime = Date.now();
  
  try {
    console.log('📥 [VideoFrameExtractor] Download parameters:', {
      videoUrl: videoUrl.length > 100 ? videoUrl.substring(0, 100) + '...' : videoUrl,
      fullVideoUrl: videoUrl,
      videoTitle,
      extractFrameType,
      timestamp: new Date().toISOString()
    });

    // Clean filename
    const cleanTitle = sanitizeFilename(videoTitle);
    console.log('📥 [VideoFrameExtractor] Sanitized filename:', {
      original: videoTitle,
      sanitized: cleanTitle
    });
    
    // Extract frame first
    console.log('🎬 [VideoFrameExtractor] Step 1: Extracting frame...');
    const frameStartTime = Date.now();
    const frameResult = await extractVideoFrame({ videoUrl, frameType: extractFrameType });
    const frameExtractionDuration = Date.now() - frameStartTime;
    
    console.log('🎬 [VideoFrameExtractor] Frame extraction completed:', {
      success: frameResult.success,
      duration: `${frameExtractionDuration}ms`,
      hasFrameUrl: !!frameResult.frameUrl,
      error: frameResult.error || 'none'
    });
    
    if (!frameResult.success || !frameResult.frameUrl) {
      throw new Error(`Failed to extract video frame: ${frameResult.error}`);
    }
    
    // Download video
    console.log('📥 [VideoFrameExtractor] Step 2: Downloading video file...');
    const videoDownloadStartTime = Date.now();
    const videoResponse = await fetch(videoUrl);
    
    console.log('📥 [VideoFrameExtractor] Video download response:', {
      status: videoResponse.status,
      statusText: videoResponse.statusText,
      ok: videoResponse.ok,
      contentType: videoResponse.headers.get('content-type'),
      contentLength: videoResponse.headers.get('content-length')
    });
    
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status} - ${videoResponse.statusText}`);
    }
    
    const videoBlob = await videoResponse.blob();
    const videoDownloadDuration = Date.now() - videoDownloadStartTime;
    console.log('📥 [VideoFrameExtractor] Video blob created:', {
      size: `${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`,
      type: videoBlob.type,
      duration: `${videoDownloadDuration}ms`
    });
    
    // Download frame
    console.log('📥 [VideoFrameExtractor] Step 3: Downloading frame image...');
    const frameDownloadStartTime = Date.now();
    const frameResponse = await fetch(frameResult.frameUrl);
    
    console.log('📥 [VideoFrameExtractor] Frame download response:', {
      status: frameResponse.status,
      statusText: frameResponse.statusText,
      ok: frameResponse.ok,
      contentType: frameResponse.headers.get('content-type'),
      contentLength: frameResponse.headers.get('content-length')
    });
    
    if (!frameResponse.ok) {
      throw new Error(`Failed to download frame: ${frameResponse.status} - ${frameResponse.statusText}`);
    }
    
    const frameBlob = await frameResponse.blob();
    const frameDownloadDuration = Date.now() - frameDownloadStartTime;
    console.log('📥 [VideoFrameExtractor] Frame blob created:', {
      size: `${(frameBlob.size / 1024).toFixed(2)} KB`,
      type: frameBlob.type,
      duration: `${frameDownloadDuration}ms`
    });
    
    // Determine file extensions
    const videoExtension = getFileExtension(videoUrl) || 'mp4';
    const frameExtension = getFileExtension(frameResult.frameUrl) || 'jpg';
    
    console.log('📥 [VideoFrameExtractor] File extensions determined:', {
      video: videoExtension,
      frame: frameExtension,
      videoFilename: `${cleanTitle}.${videoExtension}`,
      frameFilename: `${cleanTitle}_${extractFrameType}_frame.${frameExtension}`
    });
    
    // Download video file
    console.log('📥 [VideoFrameExtractor] Step 4: Triggering video file download...');
    const videoDownloadUrl = window.URL.createObjectURL(videoBlob);
    const videoLink = document.createElement('a');
    videoLink.href = videoDownloadUrl;
    videoLink.download = `${cleanTitle}.${videoExtension}`;
    document.body.appendChild(videoLink);
    videoLink.click();
    
    console.log('📥 [VideoFrameExtractor] Video download triggered:', {
      filename: videoLink.download,
      blobUrl: videoDownloadUrl.substring(0, 50) + '...'
    });
    
    // Download frame file (with slight delay to avoid browser blocking)
    console.log('📥 [VideoFrameExtractor] Step 5: Scheduling frame download (500ms delay)...');
    setTimeout(() => {
      console.log('📥 [VideoFrameExtractor] Triggering frame file download...');
      const frameDownloadUrl = window.URL.createObjectURL(frameBlob);
      const frameLink = document.createElement('a');
      frameLink.href = frameDownloadUrl;
      frameLink.download = `${cleanTitle}_${extractFrameType}_frame.${frameExtension}`;
      document.body.appendChild(frameLink);
      frameLink.click();
      
      console.log('📥 [VideoFrameExtractor] Frame download triggered:', {
        filename: frameLink.download,
        blobUrl: frameDownloadUrl.substring(0, 50) + '...'
      });
      
      // Cleanup
      window.URL.revokeObjectURL(frameDownloadUrl);
      document.body.removeChild(frameLink);
      console.log('📥 [VideoFrameExtractor] Frame download cleanup completed');
    }, 500);
    
    // Cleanup video download
    window.URL.revokeObjectURL(videoDownloadUrl);
    document.body.removeChild(videoLink);
    
    const totalDuration = Date.now() - startTime;
    console.log('✅ [VideoFrameExtractor] Download process completed successfully!', {
      totalDuration: `${totalDuration}ms`,
      frameExtractionTime: `${frameExtractionDuration}ms`,
      videoDownloadTime: `${videoDownloadDuration}ms`,
      frameDownloadTime: `${frameDownloadDuration}ms`,
      filesDownloaded: 2,
      videoSize: `${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`,
      frameSize: `${(frameBlob.size / 1024).toFixed(2)} KB`
    });
    console.log('📥 [VideoFrameExtractor] ===== DOWNLOAD WITH FRAME SUCCESS =====');
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error('❌ [VideoFrameExtractor] ===== DOWNLOAD WITH FRAME FAILED =====');
    console.error('❌ [VideoFrameExtractor] Download error details:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'N/A',
      duration: `${totalDuration}ms`,
      videoUrl: videoUrl.substring(0, 100) + '...',
      videoTitle,
      extractFrameType
    });
    throw error;
  }
}

/**
 * Gets file extension from URL
 */
function getFileExtension(url: string): string | null {
  const match = url.match(/\.([^./?#]+)(?:[?#]|$)/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Sanitizes filename for safe filesystem usage
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50); // Limit length
}

/**
 * Clears all cached video frames
 */
export function clearVideoFrameCache(): void {
  console.log('🧹 [VideoFrameExtractor] ===== CLEARING FRAME CACHE =====');
  const startTime = Date.now();
  
  try {
    const keys = Object.keys(localStorage);
    const frameKeys = keys.filter(key => key.startsWith('video_frame_'));
    
    console.log('🧹 [VideoFrameExtractor] Cache analysis:', {
      totalLocalStorageKeys: keys.length,
      frameKeysFound: frameKeys.length,
      frameKeys: frameKeys.slice(0, 5), // Show first 5 keys
      moreKeys: frameKeys.length > 5 ? `... and ${frameKeys.length - 5} more` : 'none'
    });
    
    let successCount = 0;
    let errorCount = 0;
    
    frameKeys.forEach((key, index) => {
      try {
        localStorage.removeItem(key);
        successCount++;
        if (index < 3) { // Log first few for debugging
          console.log(`🧹 [VideoFrameExtractor] Removed cache key: ${key}`);
        }
      } catch (error) {
        errorCount++;
        console.warn(`⚠️ [VideoFrameExtractor] Failed to remove cache key: ${key}`, error);
      }
    });
    
    const duration = Date.now() - startTime;
    console.log('✅ [VideoFrameExtractor] Cache clearing completed:', {
      totalKeysProcessed: frameKeys.length,
      successfullyRemoved: successCount,
      errors: errorCount,
      duration: `${duration}ms`
    });
    console.log('🧹 [VideoFrameExtractor] ===== CACHE CLEARING SUCCESS =====');
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [VideoFrameExtractor] Cache clearing failed:', {
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`
    });
    console.log('🧹 [VideoFrameExtractor] ===== CACHE CLEARING FAILED =====');
  }
}
