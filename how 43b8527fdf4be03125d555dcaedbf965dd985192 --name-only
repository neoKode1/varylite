import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fal } from '@fal-ai/client';
import type { CharacterVariationRequest, CharacterVariationResponse, CharacterVariation } from '@/types/gemini';

// Function to upload image using Fal AI client's built-in upload
async function uploadImageToTempUrl(base64Data: string): Promise<string> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create a File object from the buffer
    const file = new File([buffer], 'image.jpg', { type: 'image/jpeg' });
    
    // Use Fal AI client's built-in upload functionality
    const url = await fal.storage.upload(file);
    
    console.log(`✅ Uploaded image to Fal AI: ${url}`);
    return url;
  } catch (error) {
    console.error('❌ Failed to upload image to Fal AI:', error);
    // Fallback to data URI - Nano Banana should accept this according to docs
    const dataUri = `data:image/jpeg;base64,${base64Data}`;
    console.log(`⚠️ Using data URI directly: ${dataUri.substring(0, 50)}...`);
    return dataUri;
  }
}

// Enhanced retry configuration for API calls
const RETRY_CONFIG = {
  maxRetries: 5, // Increased from 3 to handle the 18% failure rate
  baseDelay: 2000, // Increased to 2 seconds for better spacing
  maxDelay: 15000, // Increased to 15 seconds
  backoffMultiplier: 2,
  timeout: 45000, // Increased to 45 seconds for nano-banana's longer processing times
};

// Success rate tracking
let apiStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  lastReset: Date.now()
};

// Reset stats every hour
function resetStatsIfNeeded() {
  const now = Date.now();
  if (now - apiStats.lastReset > 3600000) { // 1 hour
    apiStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastReset: now
    };
  }
}

// Timeout wrapper function
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}

// Exponential backoff retry function
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = RETRY_CONFIG.maxRetries,
  baseDelay: number = RETRY_CONFIG.baseDelay,
  maxDelay: number = RETRY_CONFIG.maxDelay,
  backoffMultiplier: number = RETRY_CONFIG.backoffMultiplier
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(operation(), RETRY_CONFIG.timeout);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Check if this is a retryable error
      if (!isRetryableError(lastError)) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );
      
      const errorInfo = categorizeError(lastError);
      console.log(`⚠️ Attempt ${attempt + 1} failed (${errorInfo.category}), retrying in ${delay}ms...`);
      console.log(`📊 Error: ${lastError.message}`);
      console.log(`💬 User message: ${errorInfo.userMessage}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Enhanced error categorization
function categorizeError(error: Error): { category: string; retryable: boolean; userMessage: string } {
  const message = error.message.toLowerCase();
  
  // Network/Infrastructure errors (retryable)
  if (message.includes('503') || message.includes('service unavailable')) {
    return {
      category: 'infrastructure',
      retryable: true,
      userMessage: 'Service temporarily unavailable. Retrying...'
    };
  }
  
  if (message.includes('502') || message.includes('bad gateway')) {
    return {
      category: 'infrastructure',
      retryable: true,
      userMessage: 'Server error. Retrying...'
    };
  }
  
  if (message.includes('504') || message.includes('gateway timeout')) {
    return {
      category: 'timeout',
      retryable: true,
      userMessage: 'Request timed out. Retrying...'
    };
  }
  
  if (message.includes('429') || message.includes('too many requests') || message.includes('rate limit exceeded')) {
    return {
      category: 'rate_limit',
      retryable: true,
      userMessage: 'Rate limit reached. Waiting before retry...'
    };
  }
  
  if (message.includes('timeout') || message.includes('econnreset') || message.includes('enotfound') || message.includes('etimedout') || message.includes('network error')) {
    return {
      category: 'network',
      retryable: true,
      userMessage: 'Network issue. Retrying...'
    };
  }
  
  if (message.includes('overloaded') || message.includes('quota exceeded')) {
    return {
      category: 'capacity',
      retryable: true,
      userMessage: 'Service overloaded. Retrying...'
    };
  }
  
  // Content/API errors (not retryable)
  if (message.includes('400') || message.includes('bad request')) {
    return {
      category: 'invalid_request',
      retryable: false,
      userMessage: 'Invalid request. Please check your input.'
    };
  }
  
  if (message.includes('401') || message.includes('unauthorized')) {
    return {
      category: 'auth',
      retryable: false,
      userMessage: 'Authentication failed. Please check API keys.'
    };
  }
  
  if (message.includes('content') && message.includes('moderation')) {
    return {
      category: 'content_moderation',
      retryable: false,
      userMessage: 'Content flagged by moderation. Please try a different prompt.'
    };
  }
  
  // Default case
  return {
    category: 'unknown',
    retryable: true,
    userMessage: 'Unexpected error. Retrying...'
  };
}

// Check if an error is retryable
function isRetryableError(error: Error): boolean {
  return categorizeError(error).retryable;
}

// Try alternative models if the primary one fails
async function tryAlternativeModels(
  genAI: GoogleGenerativeAI,
  prompt: string,
  imageParts: any[]
): Promise<any> {
  const models = [
    { name: 'gemini-1.5-pro', description: 'Gemini 1.5 Pro' },
    { name: 'gemini-1.5-flash', description: 'Gemini 1.5 Flash' },
    { name: 'gemini-pro', description: 'Gemini Pro' }
  ];
  
  for (const modelConfig of models) {
    try {
      console.log(`🔄 Trying alternative model: ${modelConfig.description}`);
      const model = genAI.getGenerativeModel({ model: modelConfig.name });
      const result = await model.generateContent([prompt, ...imageParts]);
      console.log(`✅ Successfully used ${modelConfig.description}`);
      return result;
    } catch (error) {
      console.log(`❌ ${modelConfig.description} failed:`, (error as Error).message);
      continue;
    }
  }
  
  throw new Error('All available Gemini models are currently unavailable');
}

// Minimal prompt processing to preserve user intent
function sanitizePrompt(description: string, angle: string, originalPrompt?: string): string {
  // Only do minimal content policy filtering - preserve user's original intent
  const problematicPatterns = [
    /\b(sexy|sensual|provocative|erotic|adult|mature|intimate)\b/gi,
    /\b(revealing|exposed|naked|nude|undressed)\b/gi,
  ];
  
  let sanitized = description;
  problematicPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, 'character');
  });
  
  // Use the user's original prompt as much as possible
  // Only add minimal context for the specific angle
  return `${originalPrompt || description} - ${angle.toLowerCase()} view`;
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Circuit breaker state
let circuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  isOpen: false,
  threshold: 5,
  timeout: 60000, // 1 minute
};

// Circuit breaker function
function shouldAllowRequest(): boolean {
  if (!circuitBreakerState.isOpen) return true;
  
  const now = Date.now();
  if (now - circuitBreakerState.lastFailureTime > circuitBreakerState.timeout) {
    console.log('🔄 Circuit breaker timeout reached, allowing requests again');
    circuitBreakerState.isOpen = false;
    circuitBreakerState.failures = 0;
    return true;
  }
  
  return false;
}

function recordFailure(): void {
  circuitBreakerState.failures++;
  circuitBreakerState.lastFailureTime = Date.now();
  
  if (circuitBreakerState.failures >= circuitBreakerState.threshold) {
    console.log('🚨 Circuit breaker opened due to repeated failures');
    circuitBreakerState.isOpen = true;
  }
}

function recordSuccess(): void {
  circuitBreakerState.failures = 0;
  if (circuitBreakerState.isOpen) {
    console.log('✅ Circuit breaker closed due to successful request');
    circuitBreakerState.isOpen = false;
  }
}

// Configure Fal AI
if (process.env.FAL_KEY) {
  console.log('🔧 Configuring Fal AI with key...');
  fal.config({
    credentials: process.env.FAL_KEY
  });
  console.log('✅ Fal AI configured successfully');
} else {
  console.log('❌ No FAL_KEY found for configuration');
}

export async function POST(request: NextRequest) {
  console.log('🚀 API Route: /api/vary-character - Request received');
  
  // Reset stats if needed
  resetStatsIfNeeded();
  apiStats.totalRequests++;
  
  // Check circuit breaker
  if (!shouldAllowRequest()) {
    console.log('🚨 Circuit breaker is open, rejecting request');
    apiStats.failedRequests++;
    console.log(`📊 Current success rate: ${((apiStats.successfulRequests / apiStats.totalRequests) * 100).toFixed(1)}%`);
    return NextResponse.json({
      success: false,
      error: 'Service temporarily unavailable due to repeated failures. Please try again in a moment.',
      retryable: true
    } as CharacterVariationResponse, { status: 503 });
  }
  
  try {
    console.log('📝 Parsing request body...');
    const body: CharacterVariationRequest = await request.json();
    const { images, prompt } = body;

    console.log('✅ Request body parsed successfully');
    console.log(`💬 Prompt: "${prompt}"`);
    console.log(`🖼️ Number of images: ${images ? images.length : 0}`);
    console.log(`🖼️ Image data lengths: ${images ? images.map(img => img.length) : []}`);

    if (!images || images.length === 0 || !prompt) {
      console.log('❌ Validation failed: Missing image or prompt');
      return NextResponse.json({
        success: false,
        error: 'At least one image and prompt are required',
        retryable: false
      } as CharacterVariationResponse, { status: 400 });
    }

    console.log('🔍 Checking API keys...');
    console.log(`🔑 GOOGLE_API_KEY exists: ${!!process.env.GOOGLE_API_KEY}`);
    console.log(`🔑 GOOGLE_API_KEY length: ${process.env.GOOGLE_API_KEY?.length || 0} characters`);
    console.log(`🔑 FAL_KEY exists: ${!!process.env.FAL_KEY}`);
    console.log(`🔑 FAL_KEY length: ${process.env.FAL_KEY?.length || 0} characters`);

    if (!process.env.GOOGLE_API_KEY) {
      console.log('❌ Google API key not found in environment variables');
      return NextResponse.json({
        success: false,
        error: 'Google API key not configured. Please add GOOGLE_API_KEY to your environment variables.',
        retryable: false
      } as CharacterVariationResponse, { status: 500 });
    }

    const hasFalKey = !!process.env.FAL_KEY;
    if (!hasFalKey) {
      console.log('⚠️ Fal AI key not found - will return descriptions only');
    }

    console.log('🤖 Initializing Gemini AI model...');
    // Get the generative model - using Gemini 2.0 Flash for better performance
    // Fallback to Gemini 1.5 Pro if 2.0 Flash is overloaded
    let model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    console.log('✅ Gemini 2.0 Flash model initialized successfully');

    console.log('📝 Creating enhanced prompt...');
    
    // Determine if this is a "vary" request (single image from URL) vs multi-image upload
    const isVaryRequest = images.length === 1 && prompt.includes('Generate 4 new variations');
    console.log(`🔄 Request type: ${isVaryRequest ? 'VARY existing image' : 'MULTI-IMAGE upload'}`);
    
    // Analyze the original prompt for specific instructions
    const hasBackgroundRemoval = prompt.toLowerCase().includes('remove background') || 
                                prompt.toLowerCase().includes('background removed') ||
                                prompt.toLowerCase().includes('no background') ||
                                prompt.toLowerCase().includes('transparent background');
    
    console.log(`🔍 Background removal detected: ${hasBackgroundRemoval}`);
    console.log(`💬 Original prompt analysis: "${prompt}"`);
    
    let enhancedPrompt;
    
    // Preserve user's original prompt intent with enhanced camera angle understanding
    enhancedPrompt = `Generate 4 high-quality character variations based on the user's specific request: "${prompt}"

CRITICAL CAMERA ANGLE INSTRUCTIONS:
- For "worm's eye view": Camera must be at GROUND LEVEL looking dramatically upward at the character, showing floor/ground in foreground, character towering above with converging vertical lines
- For "bird's eye view": Camera must be HIGH ABOVE looking down at the character, showing character from above with ground/floor visible below
- For "dutch angle": Camera must be TILTED at an angle, creating diagonal composition
- For "low angle": Camera positioned BELOW the character's eye level looking up
- For "high angle": Camera positioned ABOVE the character's eye level looking down
- For "eye level": Camera at the character's eye level, straight-on perspective

ENVIRONMENTAL CONTEXT REQUIREMENTS:
- Include appropriate environmental elements that support the camera angle (floor, ground, ceiling, walls, etc.)
- Show the relationship between character and environment based on the requested perspective
- Use lighting that reinforces the camera position and angle

CRITICAL INSTRUCTIONS:
- PRESERVE the user's exact specifications including camera angles, poses, settings, and interactions
- DO NOT add generic camera angles like "3/4 view", "side profile", "back view" unless specifically requested
- DO NOT override the user's specific requests with standard variations
- Focus on the user's unique vision and enhance quality without changing the core concept

For each variation, provide:
- The user's requested viewing angle with proper environmental context
- Character description that matches the user's vision
- Quality enhancements that support the user's specific request

QUALITY ENHANCEMENTS (only if they support the user's vision):
- Maintain high detail in character features, textures, and environmental elements
- Use appropriate lighting and composition for the user's specific request
- Ensure character consistency across variations
- Enhance visual quality without changing the core concept

CRITICAL: Each variation should show a SINGLE character only - no duplicates, no multiple versions of the same person in one image.

RESPECT THE USER'S CREATIVE VISION - do not standardize or genericize their specific requests.`;

    // Convert all base64 images to the format expected by Gemini
    const imageParts = images.map((imageData, index) => {
      console.log(`🖼️ Processing image ${index + 1} for Gemini`);
      return {
        inlineData: {
          data: imageData,
          mimeType: 'image/jpeg' // Assume JPEG, could be enhanced to detect actual type
        }
      };
    });

    console.log('🚀 Sending request to Gemini API...');
    console.log(`📊 Circuit breaker state: ${circuitBreakerState.isOpen ? 'OPEN' : 'CLOSED'} (failures: ${circuitBreakerState.failures})`);
    
    // Generate content with text and all images using retry mechanism with model fallback
    let result;
    try {
      result = await retryWithBackoff(async () => {
        console.log('🔄 Attempting Gemini API call...');
        return await model.generateContent([enhancedPrompt, ...imageParts]);
      });
    } catch (error) {
      console.log('⚠️ Primary model failed, trying alternative models...');
      console.log(`📊 Error details: ${(error as Error).message}`);
      result = await tryAlternativeModels(genAI, enhancedPrompt, imageParts);
    }
    console.log('📥 Received response from Gemini API');
    
    const response = await result.response;
    const text = response.text();
    console.log(`📊 Response text length: ${text ? text.length : 0} characters`);
    
    if (isVaryRequest) {
      console.log('🔍 Enhanced character analysis completed for Vary request');
      console.log(`📊 Analysis preview: ${text.substring(0, 200)}...`);
    }
    console.log('💬 First 200 characters of response:', text ? text.substring(0, 200) + '...' : 'No text received');

    if (!text) {
      return NextResponse.json({
        success: false,
        error: 'No response received from Gemini AI'
      } as CharacterVariationResponse, { status: 500 });
    }

    console.log('🔄 Parsing Gemini response...');
    // Parse the response to extract variations
    const variations = parseGeminiResponse(text);
    console.log(`✅ Parsed ${variations.length} variations successfully`);

    if (variations.length === 0) {
      console.log('❌ No variations could be parsed from the response');
      return NextResponse.json({
        success: false,
        error: 'Failed to parse character variations from AI response'
      } as CharacterVariationResponse, { status: 500 });
    }

    let variationsWithImages = variations;

    if (hasFalKey) {
      console.log('🎨 Generating images with Nano Banana...');
      // Upload all images to get proper URLs for Nano Banana
      const imageUrls = await Promise.all(
        images.map(async (imageData, index) => {
          console.log(`📤 Uploading image ${index + 1}/${images.length} to Fal AI...`);
          return await uploadImageToTempUrl(imageData);
        })
      );
      console.log(`🖼️ Uploaded ${imageUrls.length} images for Nano Banana processing`);
      
      // Generate images for each variation using Nano Banana
      variationsWithImages = await Promise.all(
        variations.map(async (variation, index) => {
          try {
            console.log(`🖼️ Generating image ${index + 1}/4 for: ${variation.angle}`);
            
            // Use the user's original prompt with enhanced quality instructions
            let nanoBananaPrompt = `${prompt} - ${variation.angle.toLowerCase()}`;
            
            // Add quality enhancements based on the specific angle
            if (variation.angle.toLowerCase().includes('worm') && variation.angle.toLowerCase().includes('eye')) {
              nanoBananaPrompt += ', dramatic low-angle perspective, strong upward lighting, cinematic composition';
            }
            if (variation.angle.toLowerCase().includes('self-examination')) {
              nanoBananaPrompt += ', detailed hand inspection, intense concentration, close-up focus on fingers';
            }
            if (variation.angle.toLowerCase().includes('sprawled')) {
              nanoBananaPrompt += ', relaxed confident pose, proper body positioning, comfortable sprawl';
            }
            
            // Add general quality improvements
            nanoBananaPrompt += ', high detail, realistic textures, professional photography, sharp focus';
            
            // Add subtle negative prompts to prevent character duplication
            nanoBananaPrompt += ', single character only, no duplicates, no multiple versions of the same person';
            
            console.log(`🎨 Enhanced Nano Banana prompt for ${variation.angle}:`, nanoBananaPrompt);
            
            const result = await retryWithBackoff(async () => {
              console.log(`🔄 Attempting Nano Banana image generation for ${variation.angle}...`);
              
              // Use Nano Banana for image editing with multiple input images
              const modelName = "fal-ai/nano-banana/edit";
              console.log(`🤖 Using Nano Banana model: ${modelName}`);
              
              return await fal.subscribe(modelName, {
              input: {
                  prompt: nanoBananaPrompt,
                  image_urls: imageUrls, // Use all uploaded image URLs for character + scene combination
                num_images: 1,
                output_format: "jpeg"
              },
              logs: true,
              onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                  console.log(`📊 Generation progress for ${variation.angle}:`, update.logs?.map(log => log.message).join(', '));
                }
              },
              });
            });

            console.log(`✅ Image ${index + 1} generated successfully`);
            
            return {
              ...variation,
              imageUrl: result.data.images[0]?.url || undefined,
              fileType: 'image' // Nano Banana generates images, not videos
            };
          } catch (error) {
            console.error(`❌ Failed to generate image for ${variation.angle}:`, error);
            if (error instanceof Error && 'body' in error) {
              console.error('❌ Full error body:', (error as any).body);
              
              // Check for content policy violation
              const errorBody = (error as any).body;
              if (errorBody?.detail?.[0]?.type === 'content_policy_violation') {
                console.log(`⚠️ Content policy violation for ${variation.angle} - returning text description only`);
                return {
                  ...variation,
                  description: `${variation.description} (Note: Image generation was blocked by content policy - text description only)`
                };
              }
            }
            return {
              ...variation,
              fileType: 'image' // Even if generation fails, this is still an image request
            }; // Return without image URL if generation fails
          }
        })
      );
    } else {
      console.log('📝 Returning descriptions only (no FAL_KEY configured)');
      // Set fileType to image for all variations when no FAL_KEY is configured
      variationsWithImages = variations.map(variation => ({
        ...variation,
        fileType: 'image' as const
      }));
    }

    console.log('🎉 API request completed successfully!');
    console.log('📊 Variations with images generated:', variationsWithImages.map(v => v.angle).join(', '));
    
    // Record success for circuit breaker
    recordSuccess();
    apiStats.successfulRequests++;
    
    const successRate = ((apiStats.successfulRequests / apiStats.totalRequests) * 100).toFixed(1);
    console.log(`✅ Request completed successfully. Success rate: ${successRate}% (${apiStats.successfulRequests}/${apiStats.totalRequests})`);
    
    return NextResponse.json({
      success: true,
      variations: variationsWithImages
    } as CharacterVariationResponse);

  } catch (error) {
    console.error('💥 Error in vary-character API:', error);
    console.error('💥 Error type:', typeof error);
    console.error('💥 Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('💥 Error message:', error instanceof Error ? error.message : String(error));
    
    // Record failure for circuit breaker
    recordFailure();
    apiStats.failedRequests++;
    
    const successRate = ((apiStats.successfulRequests / apiStats.totalRequests) * 100).toFixed(1);
    console.log(`❌ Request failed. Success rate: ${successRate}% (${apiStats.successfulRequests}/${apiStats.totalRequests})`);
    
    let errorMessage = 'An unexpected error occurred';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('💥 Full error stack:', error.stack);
      
      // Provide more specific error messages for common failure scenarios
      if (error.message.includes('503 Service Unavailable') || error.message.includes('model is overloaded')) {
        errorMessage = 'The AI service is currently overloaded. Please try again in a few moments.';
        statusCode = 503;
      } else if (error.message.includes('rate limit exceeded') || error.message.includes('quota exceeded')) {
        errorMessage = 'API rate limit exceeded. Please try again later.';
        statusCode = 429;
      } else if (error.message.includes('invalid api key') || error.message.includes('authentication')) {
        errorMessage = 'Authentication failed. Please check your API configuration.';
        statusCode = 401;
      } else if (error.message.includes('content policy violation')) {
        errorMessage = 'The request was blocked due to content policy violations.';
        statusCode = 400;
      } else if (error.message.includes('timeout') || error.message.includes('network error')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
        statusCode = 408;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      retryable: statusCode === 503 || statusCode === 429 || statusCode === 408
    } as CharacterVariationResponse, { status: statusCode });
  }
}

function parseGeminiResponse(text: string): CharacterVariation[] {
  const variations: CharacterVariation[] = [];
  
  try {
    // Split the response into sections (looking for numbered variations or clear separators)
    const sections = text.split(/(?:\d+\.|Variation \d+|###|\n\n\n)/g)
      .filter(section => section.trim().length > 50); // Filter out short/empty sections

    let variationCount = 0;
    const maxVariations = 4;

    for (const section of sections) {
      if (variationCount >= maxVariations) break;
      
      const trimmedSection = section.trim();
      if (trimmedSection.length < 50) continue; // Skip very short sections

      // Extract angle/view information (look for common angle terms and preserve user's specific requests)
      const angleKeywords = ['side', 'front', 'back', 'profile', 'angle', 'view', 'perspective', 'pose', 'stance', 'worm', 'eye', 'low', 'high', 'bird', 'dutch', 'ground', 'floor', 'towering', 'looking', 'self-examination', 'sprawled', 'dramatic', 'cinematic', 'lighting'];
      const lines = trimmedSection.split('\n').filter(line => line.trim());
      
      let angle = 'Character View';
      let pose = 'Standard Pose';
      
      // Try to find angle and pose in the first few lines, preserving user's specific requests
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i].toLowerCase();
        const originalLine = lines[i].trim();
        
        // First, check if the line contains specific camera angle requests (preserve these exactly)
        if (originalLine.length > 0 && (
          line.includes('worm') || line.includes('bird') || line.includes('dutch') ||
          line.includes('low angle') || line.includes('high angle') || line.includes('eye level') ||
          line.includes('self-examination') || line.includes('sprawled') || line.includes('cinematic') ||
          line.includes('dramatic') || line.includes('action') || line.includes('dynamic') ||
          line.includes('luxurious') || line.includes('hot pool') || line.includes('threesome') ||
          line.includes('ground level') || line.includes('floor') || line.includes('towering') ||
          line.includes('looking up') || line.includes('looking down') || line.includes('perspective')
        )) {
          // Preserve the original user request exactly
          angle = originalLine;
          pose = originalLine;
          break;
        }
        
        // Only use generic fallbacks if no specific user request is found
        if (angleKeywords.some(keyword => line.includes(keyword))) {
          if (line.includes('side') || line.includes('profile')) {
            angle = 'Side Profile View';
          } else if (line.includes('back')) {
            angle = 'Back View';
          } else if (line.includes('front')) {
            angle = 'Front View';
          } else if (line.includes('3/4') || line.includes('quarter')) {
            angle = '3/4 Angle View';
          } else {
            // Use the original line if it's meaningful
            angle = originalLine.length > 0 ? originalLine : angle;
          }
          break;
        }
      }

      // If we couldn't determine a specific angle, preserve the user's original prompt
      if (angle === 'Character View') {
        // Don't override with generic fallbacks - preserve user intent
        angle = `Variation ${variationCount + 1}`;
      }

      variations.push({
        id: `variation-${variationCount + 1}`,
        description: trimmedSection,
        angle: angle,
        pose: pose,
        fileType: 'image' as const
      });

      variationCount++;
    }

    // If we didn't get enough variations, try a different parsing approach
    if (variations.length < 2) {
      // Fallback: split by paragraphs and take the longest ones
      const paragraphs = text.split('\n\n')
        .filter(p => p.trim().length > 100)
        .slice(0, 4);

      variations.length = 0; // Clear previous attempts

      paragraphs.forEach((paragraph, index) => {
        // Preserve user's original prompt instead of using generic fallbacks
        variations.push({
          id: `variation-${index + 1}`,
          description: paragraph.trim(),
          angle: `Variation ${index + 1}`,
          pose: `Custom Pose ${index + 1}`,
          fileType: 'image' as const
        });
      });
    }

    // Ensure we have at least 4 variations, even if we need to create fallbacks
    while (variations.length < 4) {
      const index = variations.length;
      
      variations.push({
        id: `variation-${index + 1}`,
        description: `Character variation ${index + 1}: Show the same character with different styling while maintaining all original design elements, clothing, and features.`,
        angle: `Variation ${index + 1}`,
        pose: `Custom Pose ${index + 1}`,
        fileType: 'image' as const
      });
    }

    return variations.slice(0, 4); // Ensure exactly 4 variations

  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    
    // Return fallback variations if parsing completely fails
    return [
      {
        id: 'variation-1',
        description: 'Character variation 1: Show the same character with different styling while maintaining all original design elements, clothing, and features.',
        angle: 'Variation 1',
        pose: 'Custom Pose 1',
        fileType: 'image' as const
      },
      {
        id: 'variation-2',
        description: 'Character variation 2: Show the same character with different styling while maintaining all original design elements, clothing, and features.',
        angle: 'Variation 2',
        pose: 'Custom Pose 2',
        fileType: 'image' as const
      },
      {
        id: 'variation-3',
        description: 'Character variation 3: Show the same character with different styling while maintaining all original design elements, clothing, and features.',
        angle: 'Variation 3',
        pose: 'Custom Pose 3',
        fileType: 'image' as const
      },
      {
        id: 'variation-4',
        description: 'Character variation 4: Show the same character with different styling while maintaining all original design elements, clothing, and features.',
        angle: 'Variation 4',
        pose: 'Custom Pose 4',
        fileType: 'image' as const
      }
    ];
  }
}
