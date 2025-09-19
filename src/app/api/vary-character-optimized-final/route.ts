import { NextRequest, NextResponse } from 'next/server';
import type { CharacterVariationRequest, CharacterVariationResponse, CharacterVariation } from '@/types/gemini';
import { aiServiceManager } from '@/lib/ai-service-manager';
import { circuitBreakerManager } from '@/lib/circuit-breaker';
import { optimizedCreditService } from '@/lib/optimized-credit-service';
import { fileProcessingManager } from '@/lib/file-processing-manager';
import { supabaseAdmin } from '@/lib/optimized-supabase';
import { userCache, modelCache } from '@/lib/cache-manager';

// Circuit breaker for this specific route
const varyCharacterBreaker = circuitBreakerManager.getBreaker('vary-character', {
  failureThreshold: 3,
  recoveryTimeout: 30000,
  monitoringPeriod: 300000,
  halfOpenMaxCalls: 2
});

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 60000, // 1 minute
  maxRequests: 10, // 10 requests per minute per user
  skipSuccessfulRequests: false
};

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Enhanced input validation and sanitization
function validateAndSanitizeRequest(body: CharacterVariationRequest): { 
  valid: boolean; 
  error?: string; 
  sanitizedData?: CharacterVariationRequest 
} {
  try {
    // Check required fields
    if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
      return { valid: false, error: 'At least one image is required' };
    }

    if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
      return { valid: false, error: 'Prompt is required' };
    }

    // Sanitize prompt
    const sanitizedPrompt = body.prompt
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length

    if (sanitizedPrompt.length === 0) {
      return { valid: false, error: 'Prompt cannot be empty after sanitization' };
    }

    // Validate image count
    if (body.images.length > 10) {
      return { valid: false, error: 'Maximum 10 images allowed' };
    }

    // Validate and sanitize image data
    const sanitizedImages: string[] = [];
    for (let i = 0; i < body.images.length; i++) {
      const imageData = body.images[i];
      
      if (!imageData || typeof imageData !== 'string') {
        return { valid: false, error: `Invalid image data at index ${i}` };
      }

      // Check if it's valid base64
      try {
        const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
        if (base64Data.length === 0) {
          return { valid: false, error: `Empty image data at index ${i}` };
        }

        // Validate base64 format
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length === 0) {
          return { valid: false, error: `Invalid base64 data at index ${i}` };
        }

        // Check file size (max 10MB per image)
        if (buffer.length > 10 * 1024 * 1024) {
          return { valid: false, error: `Image ${i + 1} exceeds 10MB limit` };
        }

        sanitizedImages.push(imageData);
      } catch (error) {
        return { valid: false, error: `Invalid base64 data at index ${i}` };
      }
    }

    return {
      valid: true,
      sanitizedData: {
        images: sanitizedImages,
        prompt: sanitizedPrompt
      }
    };

  } catch (error) {
    return { valid: false, error: 'Request validation failed' };
  }
}

// Rate limiting with improved algorithm
function checkRateLimit(userId: string): { 
  allowed: boolean; 
  remaining: number; 
  resetTime: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_CONFIG.windowMs;
  
  // Clean up expired entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }

  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || userLimit.resetTime < now) {
    // New window or expired window
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxRequests - 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs
    };
  }

  if (userLimit.count >= RATE_LIMIT_CONFIG.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: userLimit.resetTime,
      retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
    };
  }

  // Increment counter
  userLimit.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT_CONFIG.maxRequests - userLimit.count,
    resetTime: userLimit.resetTime
  };
}

// Optimized image processing with memory management
async function processImagesOptimized(images: string[]): Promise<string[]> {
  console.log(`🖼️ Processing ${images.length} images with memory optimization`);
  
  // Process images in batches to prevent memory overflow
  const batchSize = 3;
  const results: string[] = [];
  
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (imageData, batchIndex) => {
      try {
        const globalIndex = i + batchIndex;
        const file = fileProcessingManager.base64ToFile(imageData, `image-${globalIndex}.jpg`);
        
        // Process image with memory optimization
        const processedFile = await fileProcessingManager.processImageOptimized(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8,
          format: 'jpeg'
        });
        
        const result = await fileProcessingManager.uploadFile(processedFile);
        
        if (!result.success || !result.url) {
          throw new Error(result.error || 'Upload failed');
        }
        
        return result.url;
      } catch (error) {
        console.error(`❌ Failed to process image ${i + batchIndex}:`, error);
        throw error;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to prevent overwhelming the service
    if (i + batchSize < images.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

// Enhanced Gemini prompt generation with better context
function generateOptimizedPrompt(prompt: string, imageCount: number, isVaryRequest: boolean): string {
  const basePrompt = isVaryRequest 
    ? `You are an expert character analyst specializing in maintaining character consistency across variations. Analyze this single character image and generate 4 new variations with different angles, poses, and perspectives while preserving the character's core identity.`
    : `You are an expert character analyst specializing in character fusion and consistency. Analyze these ${imageCount} character images and generate 4 new variations that intelligently combine the best features from all images while maintaining visual coherence.`;

  return `${basePrompt}

CRITICAL REQUIREMENTS:
1. Generate exactly 4 unique variations
2. Each variation must be from a distinctly different angle/pose
3. Maintain perfect character consistency across all variations
4. Use professional camera angles and cinematic lighting
5. Ensure high-quality, detailed descriptions suitable for AI image generation
6. Preserve clothing, accessories, and distinctive features
7. Maintain consistent art style and quality

USER REQUEST: ${prompt}

RESPONSE FORMAT:
For each variation, provide:
- Angle: [specific professional camera angle]
- Pose: [detailed character pose description]
- Description: [comprehensive visual description for AI generation]

Generate 4 variations now:`;
}

// Enhanced response parsing with multiple fallback strategies
function parseGeminiResponse(text: string): CharacterVariation[] {
  const variations: CharacterVariation[] = [];
  
  try {
    // Strategy 1: Structured parsing
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentVariation: Partial<CharacterVariation> = {};
    let variationIndex = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.toLowerCase().includes('angle:') || trimmedLine.toLowerCase().includes('angle -')) {
        if (currentVariation.angle) {
        // Save previous variation and start new one
        if (currentVariation.angle && currentVariation.pose && currentVariation.description) {
          variations.push({
            id: `variation-${variationIndex}`,
            angle: currentVariation.angle,
            pose: currentVariation.pose,
            description: currentVariation.description
          });
        }
          variationIndex++;
        }
        
        currentVariation.angle = trimmedLine.split(':')[1]?.trim() || trimmedLine.split('-')[1]?.trim() || 'Unknown angle';
      } else if (trimmedLine.toLowerCase().includes('pose:') || trimmedLine.toLowerCase().includes('pose -')) {
        currentVariation.pose = trimmedLine.split(':')[1]?.trim() || trimmedLine.split('-')[1]?.trim() || 'Unknown pose';
      } else if (trimmedLine.toLowerCase().includes('description:') || trimmedLine.toLowerCase().includes('description -')) {
        currentVariation.description = trimmedLine.split(':')[1]?.trim() || trimmedLine.split('-')[1]?.trim() || 'No description';
      }
    }

    // Add the last variation
    if (currentVariation.angle && currentVariation.pose && currentVariation.description) {
      variations.push({
        id: `variation-${variationIndex}`,
        angle: currentVariation.angle,
        pose: currentVariation.pose,
        description: currentVariation.description
      });
    }

    // Strategy 2: If structured parsing failed, try pattern matching
    if (variations.length === 0) {
      console.log('⚠️ Structured parsing failed, trying pattern matching');
      
      const variationPattern = /(?:variation|angle|pose|description)[:\s-]*(.+?)(?=(?:variation|angle|pose|description)[:\s-]|$)/gi;
      const matches = text.match(variationPattern);
      
      if (matches && matches.length >= 4) {
        for (let i = 0; i < 4; i++) {
          const match = matches[i]?.trim();
          if (match) {
            variations.push({
              id: `variation-${i + 1}`,
              angle: `Variation ${i + 1}`,
              pose: 'Character pose',
              description: match
            });
          }
        }
      }
    }

    // Strategy 3: Ultimate fallback
    if (variations.length === 0) {
      console.log('⚠️ All parsing strategies failed, using fallback');
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      for (let i = 0; i < Math.min(4, sentences.length); i++) {
        variations.push({
          id: `variation-${i + 1}`,
          angle: `Variation ${i + 1}`,
          pose: 'Character pose',
          description: sentences[i].trim()
        });
      }
    }

    // Ensure we have exactly 4 variations
    while (variations.length < 4) {
      variations.push({
        id: `variation-${variations.length + 1}`,
        angle: `Variation ${variations.length + 1}`,
        pose: 'Character pose',
        description: 'Additional character variation'
      });
    }

    return variations.slice(0, 4);

  } catch (error) {
    console.error('❌ Error parsing Gemini response:', error);
    // Ultimate fallback
    return [
      { id: 'variation-1', angle: 'Front view', pose: 'Standing pose', description: 'Character from the front' },
      { id: 'variation-2', angle: 'Side profile', pose: 'Profile pose', description: 'Character from the side' },
      { id: 'variation-3', angle: 'Three-quarter view', pose: 'Angled pose', description: 'Character at three-quarter angle' },
      { id: 'variation-4', angle: 'Back view', pose: 'Back pose', description: 'Character from behind' }
    ];
  }
}

// Main optimized POST handler
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `vary-char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`🚀 [${requestId}] Optimized vary-character API called`);

  try {
    // Parse and validate request with enhanced sanitization
    const body: CharacterVariationRequest = await request.json();
    const validation = validateAndSanitizeRequest(body);
    
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        retryable: false
      } as CharacterVariationResponse, { status: 400 });
    }

    const { images, prompt } = validation.sanitizedData!;
    const isVaryRequest = images.length === 1 && prompt.includes('Generate 4 new variations');

    // Extract user ID from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        retryable: false
      } as CharacterVariationResponse, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Check cache first for user data
    let user = userCache.getUser(token);
    if (!user) {
      const { data: { user: authUser }, error: authError } = await supabaseAdmin!.auth.getUser(token);
      
      if (authError || !authUser) {
        return NextResponse.json({
          success: false,
          error: 'Invalid authentication token',
          retryable: false
        } as CharacterVariationResponse, { status: 401 });
      }
      
      user = authUser;
      userCache.setUser(token, user);
    }

    // Rate limiting check
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        retryable: true,
        metadata: {
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime,
          retryAfter: rateLimit.retryAfter
        }
      } as CharacterVariationResponse, { status: 429 });
    }

    // Credit check with caching
    let creditCheck = userCache.getUserCredits(user.id);
    if (creditCheck === null) {
      const creditResult = await optimizedCreditService.checkUserCredits(user.id, 'nano-banana');
      if (!creditResult.hasCredits) {
        return NextResponse.json({
          success: false,
          error: 'Insufficient credits',
          retryable: false,
          metadata: {
            availableCredits: creditResult.availableCredits,
            requiredCredits: creditResult.modelCost
          }
        } as CharacterVariationResponse, { status: 402 });
      }
      userCache.setUserCredits(user.id, creditResult.availableCredits);
    } else if (creditCheck < 1) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient credits',
        retryable: false,
        metadata: {
          availableCredits: creditCheck,
          requiredCredits: 1
        }
      } as CharacterVariationResponse, { status: 402 });
    }

    // Circuit breaker check
    if (!varyCharacterBreaker.canExecute()) {
      return NextResponse.json({
        success: false,
        error: 'Service temporarily unavailable. Please try again in a moment.',
        retryable: true
      } as CharacterVariationResponse, { status: 503 });
    }

    // Process images with memory optimization
    console.log(`🖼️ [${requestId}] Processing ${images.length} images with memory management`);
    const imageUrls = await processImagesOptimized(images);

    // Generate optimized prompt
    const optimizedPrompt = generateOptimizedPrompt(prompt, images.length, isVaryRequest);

    // Get optimal Gemini model with health checking
    const geminiModel = await aiServiceManager.getOptimalGeminiModel();

    // Execute with circuit breaker and enhanced error handling
    const result = await varyCharacterBreaker.execute(async () => {
      return await aiServiceManager.executeWithRetry(async () => {
        const imageParts = imageUrls.map(url => ({
          inlineData: {
            data: url.split(',')[1] || url,
            mimeType: 'image/jpeg'
          }
        }));

        const result = await geminiModel.generateContent([optimizedPrompt, ...imageParts]);
        return await result.response;
      }, 3, 2000); // 3 retries with 2 second base delay
    });

    const responseText = result.text();
    if (!responseText) {
      throw new Error('No response received from Gemini AI');
    }

    // Parse response with enhanced parsing
    const variations = parseGeminiResponse(responseText);

    // Deduct credits atomically
    const creditDeduction = await optimizedCreditService.deductCredits(
      user.id,
      'nano-banana',
      'Character variation generation'
    );

    if (!creditDeduction.success) {
      console.error('❌ Credit deduction failed:', creditDeduction.error);
      // Continue with response but log the error
    } else {
      // Update cache with new credit balance
      userCache.setUserCredits(user.id, creditDeduction.remainingBalance);
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] Request completed in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      variations,
      metadata: {
        creditsUsed: creditDeduction.creditsUsed,
        remainingBalance: creditDeduction.remainingBalance,
        processingTime,
        requestId,
        imagesProcessed: images.length,
        cacheHit: !!userCache.getUser(token)
      }
    } as CharacterVariationResponse);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Request failed after ${processingTime}ms:`, error);

    // Record failure in circuit breaker
    varyCharacterBreaker.onFailure();

    let errorMessage = 'An unexpected error occurred';
    let statusCode = 500;
    let retryable = false;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Enhanced error categorization
      if (error.message.includes('503') || error.message.includes('overloaded')) {
        errorMessage = 'AI service is temporarily overloaded. Please try again in a few moments.';
        statusCode = 503;
        retryable = true;
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
        statusCode = 429;
        retryable = true;
      } else if (error.message.includes('401') || error.message.includes('authentication')) {
        errorMessage = 'Authentication failed. Please check your credentials.';
        statusCode = 401;
      } else if (error.message.includes('content policy') || error.message.includes('blocked')) {
        errorMessage = 'Content blocked due to policy restrictions. Please try a different prompt or image.';
        statusCode = 400;
      } else if (error.message.includes('timeout') || error.message.includes('network')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
        statusCode = 408;
        retryable = true;
      } else if (error.message.includes('memory') || error.message.includes('out of memory')) {
        errorMessage = 'Processing failed due to memory constraints. Please try with fewer or smaller images.';
        statusCode = 413;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      retryable,
      metadata: {
        processingTime,
        requestId,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    } as CharacterVariationResponse, { status: statusCode });
  }
}

// Health check endpoint with comprehensive metrics
export async function GET() {
  const healthMetrics = {
    circuitBreaker: varyCharacterBreaker.getHealthMetrics(),
    aiService: aiServiceManager.getServiceStatus(),
    cache: {
      userCache: userCache.getStats(),
      modelCache: modelCache.getStats()
    },
    rateLimiting: {
      activeUsers: rateLimitStore.size,
      config: RATE_LIMIT_CONFIG
    },
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(healthMetrics);
}
