import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fal } from '@fal-ai/client';
import type { CharacterVariationRequest, CharacterVariationResponse, CharacterVariation } from '@/types/gemini';

// Retry configuration for API calls
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  timeout: 30000, // 30 seconds timeout
};

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
      
      console.log(`⚠️ Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      console.log(`📊 Error: ${lastError.message}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Check if an error is retryable
function isRetryableError(error: Error): boolean {
  const retryableErrors = [
    '503 Service Unavailable',
    'The model is overloaded',
    'rate limit exceeded',
    'quota exceeded',
    'internal server error',
    'bad gateway',
    'service unavailable',
    'timeout',
    'network error'
  ];
  
  const errorMessage = error.message.toLowerCase();
  return retryableErrors.some(retryableError => 
    errorMessage.includes(retryableError.toLowerCase())
  );
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

// Sanitize prompts to avoid content policy violations while preserving character details
function sanitizePrompt(description: string, angle: string, originalPrompt?: string): string {
  // Remove potentially problematic words and replace with safer alternatives
  const problematicPatterns = [
    /\b(sexy|sensual|provocative|erotic|adult|mature|intimate)\b/gi,
    /\b(revealing|exposed|naked|nude|undressed)\b/gi,
    /\b(weapon|sword|gun|knife|blade|combat|fighting|violence)\b/gi,
  ];
  
  let sanitized = description;
  problematicPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, 'character');
  });
  
  // Extract key character details while keeping it safe
  const safeDescription = sanitized
    .replace(/\b(tight|form-fitting|skin-tight)\b/gi, 'fitted')
    .replace(/\b(dark|gothic|edgy)\b/gi, 'stylized');
  
  // Check if the original prompt contains background removal instructions
  const hasBackgroundRemoval = originalPrompt?.toLowerCase().includes('remove background') || 
                              originalPrompt?.toLowerCase().includes('background removed') ||
                              originalPrompt?.toLowerCase().includes('no background') ||
                              originalPrompt?.toLowerCase().includes('transparent background');
  
  // Check for other important image processing instructions
  const hasImageProcessing = originalPrompt?.toLowerCase().includes('enhance') ||
                            originalPrompt?.toLowerCase().includes('improve') ||
                            originalPrompt?.toLowerCase().includes('clean up') ||
                            originalPrompt?.toLowerCase().includes('fix') ||
                            originalPrompt?.toLowerCase().includes('adjust');
  
  let enhancedPrompt = `Professional character portrait from ${angle.toLowerCase()} angle. ${safeDescription}. Maintain exact character design consistency with appropriate, family-friendly styling.`;
  
  // Add background removal instruction if it was in the original prompt
  if (hasBackgroundRemoval) {
    enhancedPrompt += ` IMPORTANT: Remove all background elements and create a clean, transparent background. Focus only on the character with no environmental details.`;
  }
  
  // Add general image processing instructions if present
  if (hasImageProcessing) {
    enhancedPrompt += ` Apply high-quality image processing to enhance clarity and detail.`;
  }
  
  return enhancedPrompt;
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
  
  // Check circuit breaker
  if (!shouldAllowRequest()) {
    console.log('🚨 Circuit breaker is open, rejecting request');
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
    console.log(`📋 Prompt: "${prompt}"`);
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
    console.log(`📋 Original prompt analysis: "${prompt}"`);
    
    let enhancedPrompt;
    
    if (isVaryRequest) {
      // For "Vary" requests - focus on detailed character analysis first
      enhancedPrompt = `
Analyze this character image in extreme detail and generate 4 distinct new variations based on this request: "${prompt}"

STEP 1 - DETAILED CHARACTER ANALYSIS:
First, carefully examine and document EVERY aspect of this character:
- Facial features: eye color, shape, nose, mouth, jawline, cheekbones
- Hair: style, color, length, texture, any accessories
- Clothing: exact garments, colors, patterns, textures, fit
- Body type: height, build, proportions
- Skin tone and any markings, tattoos, or scars
- Accessories: jewelry, equipment, props
- Art style: realistic, anime, cartoon, etc.
- Color palette used throughout the design

STEP 2 - VARIATION GENERATION:
Create 4 NEW variations that maintain 100% character consistency:
- Use the EXACT same character analysis from Step 1
- Only change the viewing angle or pose
- Keep IDENTICAL facial features, hair, clothing, and colors
- Maintain the same art style and proportions${hasBackgroundRemoval ? '\n- IMPORTANT: All variations should have backgrounds removed for clean, professional presentation' : ''}

Each variation must include:
1. Cinematic shot type (e.g., "Close-up Portrait", "Wide Establishing Shot", "Dutch Angle", "Low Hero Shot", "Over-the-Shoulder", "Dramatic Silhouette", "Medium Shot", "Extreme Close-up", "High Angle", "Bird's Eye View", "Worm's Eye View", "Profile Shot", "Three-Quarter Shot", "Full Body Shot", "Cinematic Wide Shot")
2. Lighting setup (e.g., "Rembrandt lighting", "Rim lighting", "Soft key light", "Dramatic chiaroscuro", "Golden hour lighting", "Neon accent lighting", "Three-point lighting", "High-key lighting", "Low-key lighting", "Split lighting", "Butterfly lighting", "Loop lighting", "Side lighting", "Back lighting", "Practical lighting", "Mood lighting")
3. Styling elements (e.g., "Cinematic depth of field", "Motion blur", "Color grading", "Atmospheric effects", "Professional studio lighting", "Film grain texture", "Vintage color palette", "High contrast", "Soft focus", "Bokeh effects", "Lens flare", "Vignetting", "Desaturated tones", "Warm color temperature", "Cool color temperature", "Dramatic shadows")
4. Pose and composition (e.g., "Dynamic action pose", "Contemplative stance", "Power pose", "Casual interaction", "Dramatic gesture", "Confident stride", "Thoughtful expression", "Heroic stance", "Relaxed posture", "Intense focus", "Graceful movement", "Commanding presence", "Intimate moment", "Epic pose", "Natural candid", "Striking silhouette")
5. Complete character description maintaining ALL details from the analysis${hasBackgroundRemoval ? '\n6. Note: Background should be clean/transparent for professional use' : ''}

Format: Provide detailed character analysis first, then the 4 variations with perfect consistency.
`;
    } else {
      // For multi-image uploads - use the existing comprehensive analysis
      enhancedPrompt = `
Analyze these ${images.length} character images and generate 4 distinct variations based on the user's request: "${prompt}"

You are a character design expert. Create 4 different views of this EXACT SAME character, maintaining perfect character consistency while showing different angles or perspectives.

CRITICAL REQUIREMENTS for character consistency:
- Use ALL provided images to understand the complete character design
- Keep IDENTICAL facial features, expression, and proportions from all angles
- Maintain the EXACT SAME clothing, accessories, and outfit details
- Preserve the SAME hair style, color, and length
- Use the IDENTICAL color palette throughout
- Keep the SAME body type, height, and build
- Maintain any distinctive markings, scars, or unique features
- Cross-reference between images to ensure consistency${hasBackgroundRemoval ? '\n- IMPORTANT: All variations should have backgrounds removed for clean, professional presentation' : ''}

For each of the 4 variations, provide:
1. Cinematic shot type (e.g., "Close-up Portrait", "Wide Establishing Shot", "Dutch Angle", "Low Hero Shot", "Over-the-Shoulder", "Dramatic Silhouette", "Medium Shot", "Extreme Close-up", "High Angle", "Bird's Eye View", "Worm's Eye View", "Profile Shot", "Three-Quarter Shot", "Full Body Shot", "Cinematic Wide Shot")
2. Professional lighting setup (e.g., "Rembrandt lighting", "Rim lighting", "Soft key light", "Dramatic chiaroscuro", "Golden hour lighting", "Neon accent lighting", "Three-point lighting", "High-key lighting", "Low-key lighting", "Split lighting", "Butterfly lighting", "Loop lighting", "Side lighting", "Back lighting", "Practical lighting", "Mood lighting")
3. Cinematic styling elements (e.g., "Cinematic depth of field", "Motion blur", "Color grading", "Atmospheric effects", "Professional studio lighting", "Film grain texture", "Vintage color palette", "High contrast", "Soft focus", "Bokeh effects", "Lens flare", "Vignetting", "Desaturated tones", "Warm color temperature", "Cool color temperature", "Dramatic shadows")
4. Dynamic pose and composition (e.g., "Dynamic action pose", "Contemplative stance", "Power pose", "Casual interaction", "Dramatic gesture", "Confident stride", "Thoughtful expression", "Heroic stance", "Relaxed posture", "Intense focus", "Graceful movement", "Commanding presence", "Intimate moment", "Epic pose", "Natural candid", "Striking silhouette")
5. A comprehensive visual description that preserves ALL character details while showing the new perspective${hasBackgroundRemoval ? '\n6. Note: Background should be clean/transparent for professional use' : ''}

The 4 variations should cover different angles while keeping the character absolutely identical in design:
- Front/side profile views
- Back/rear perspective  
- 3/4 diagonal angles
- Action poses or dynamic views (if requested)

Format each variation clearly with the angle, pose, and detailed character description that maintains perfect consistency.
`;
    }

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
    console.log('📬 Received response from Gemini API');
    
    const response = await result.response;
    const text = response.text();
    console.log(`📄 Response text length: ${text ? text.length : 0} characters`);
    
    if (isVaryRequest) {
      console.log('🔍 Enhanced character analysis completed for Vary request');
      console.log(`📊 Analysis preview: ${text.substring(0, 200)}...`);
    }
    console.log('📋 First 200 characters of response:', text ? text.substring(0, 200) + '...' : 'No text received');

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
      console.log('🎨 Generating images with Fal AI...');
      // Use only the first image as primary reference to avoid payload size issues
      const primaryImageDataUri = `data:image/jpeg;base64,${images[0]}`;
      console.log(`🖼️ Using primary image for generation (${images.length} total images uploaded)`);
      
      // Generate images for each variation using Fal AI
      variationsWithImages = await Promise.all(
        variations.map(async (variation, index) => {
          try {
            console.log(`🖼️ Generating image ${index + 1}/${variations.length} for: ${variation.angle}`);
            
            // Sanitize the prompt to avoid content policy violations
            const sanitizedPrompt = sanitizePrompt(variation.description, variation.angle, prompt);
            console.log(`🎨 Fal AI prompt for ${variation.angle}:`, sanitizedPrompt);
            
            const result = await retryWithBackoff(async () => {
              console.log(`🔄 Attempting Fal AI image generation for ${variation.angle}...`);
              
              // Choose the best model based on the task
              const modelName = hasBackgroundRemoval ? "fal-ai/nano-banana/edit" : "fal-ai/nano-banana/edit";
              console.log(`🤖 Using Fal AI model: ${modelName}`);
              
              return await fal.subscribe(modelName, {
                input: {
                  prompt: sanitizedPrompt,
                  image_urls: [primaryImageDataUri], // Use only primary image to avoid payload size issues
                  num_images: 1,
                  output_format: "jpeg",
                  // Add specific parameters for background removal
                  ...(hasBackgroundRemoval && {
                    negative_prompt: "background, environment, scenery, objects, text, watermark",
                    guidance_scale: 7.5,
                    num_inference_steps: 20
                  })
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
              imageUrl: result.data.images[0]?.url || undefined
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
            return variation; // Return without image URL if generation fails
          }
        })
      );
    } else {
      console.log('📝 Returning descriptions only (no FAL_KEY configured)');
    }

    console.log('🎉 API request completed successfully!');
    console.log('📊 Variations with images generated:', variationsWithImages.map(v => v.angle).join(', '));
    
    // Record success for circuit breaker
    recordSuccess();
    
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

      // Extract angle/view information (look for common angle terms)
      const angleKeywords = ['side', 'front', 'back', 'profile', 'angle', 'view', 'perspective', 'pose', 'stance'];
      const lines = trimmedSection.split('\n').filter(line => line.trim());
      
      let angle = 'Character View';
      let pose = 'Standard Pose';
      
      // Try to find angle and pose in the first few lines
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i].toLowerCase();
        if (angleKeywords.some(keyword => line.includes(keyword))) {
          if (line.includes('side') || line.includes('profile')) {
            angle = 'Side Profile View';
          } else if (line.includes('back')) {
            angle = 'Back View';
          } else if (line.includes('front')) {
            angle = 'Front View';
          } else if (line.includes('3/4') || line.includes('quarter')) {
            angle = '3/4 Angle View';
          } else if (line.includes('action') || line.includes('dynamic')) {
            angle = 'Action View';
            pose = 'Dynamic Action Pose';
          } else {
            angle = lines[i].trim().length > 0 ? lines[i].trim() : angle;
          }
          break;
        }
      }

      // If we couldn't determine a specific angle, assign based on variation number
      if (angle === 'Character View') {
        const defaultAngles = ['Front View', 'Side Profile', '3/4 Angle View', 'Back View'];
        angle = defaultAngles[variationCount] || `Variation ${variationCount + 1}`;
      }

      variations.push({
        id: `variation-${variationCount + 1}`,
        description: trimmedSection,
        angle: angle,
        pose: pose
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
        const defaultAngles = ['Front View', 'Side Profile', '3/4 Angle View', 'Back View'];
        const defaultPoses = ['Standard Stance', 'Profile Pose', 'Angled Stance', 'Rear View Pose'];
        
        variations.push({
          id: `variation-${index + 1}`,
          description: paragraph.trim(),
          angle: defaultAngles[index] || `View ${index + 1}`,
          pose: defaultPoses[index] || `Pose ${index + 1}`
        });
      });
    }

    // Ensure we have at least 4 variations, even if we need to create fallbacks
    while (variations.length < 4) {
      const index = variations.length;
      const fallbackAngles = ['Front View', 'Side Profile', '3/4 Angle View', 'Back View'];
      const fallbackPoses = ['Standard Stance', 'Profile Pose', 'Angled Stance', 'Rear View Pose'];
      
      variations.push({
        id: `variation-${index + 1}`,
        description: `Character variation ${index + 1}: Show the same character from a ${fallbackAngles[index].toLowerCase()} with ${fallbackPoses[index].toLowerCase()}. Maintain all original design elements, clothing, and features while changing the viewing angle and pose.`,
        angle: fallbackAngles[index],
        pose: fallbackPoses[index]
      });
    }

    return variations.slice(0, 4); // Ensure exactly 4 variations

  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    
    // Return fallback variations if parsing completely fails
    return [
      {
        id: 'variation-1',
        description: 'Front view of the character maintaining original design and features.',
        angle: 'Front View',
        pose: 'Standard Stance'
      },
      {
        id: 'variation-2',
        description: 'Side profile view of the character with same clothing and style.',
        angle: 'Side Profile',
        pose: 'Profile Pose'
      },
      {
        id: 'variation-3',
        description: '3/4 angle view showing character from diagonal perspective.',
        angle: '3/4 Angle View',
        pose: 'Angled Stance'
      },
      {
        id: 'variation-4',
        description: 'Back view of the character showing rear perspective.',
        angle: 'Back View',
        pose: 'Rear View Pose'
      }
    ];
  }
}