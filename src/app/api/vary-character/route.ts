import { NextRequest, NextResponse } from 'next/server';
import type { CharacterVariationRequest, CharacterVariationResponse, CharacterVariation } from '@/types/gemini';
import { aiServiceManager } from '@/lib/ai-service-manager';
import { circuitBreakerManager } from '@/lib/circuit-breaker';
import { optimizedCreditService } from '@/lib/optimized-credit-service';
import { fileProcessingManager } from '@/lib/file-processing-manager';
import { supabaseAdmin } from '@/lib/optimized-supabase';
import { userCache, modelCache } from '@/lib/cache-manager';
import { fal } from '@fal-ai/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { trackUserFirstGeneration, checkUserGenerationPermission, deductCreditsForGeneration, checkLowBalanceNotification } from '@/lib/creditEnforcementService';

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
    const { images, prompt, generationSettings, generationMode } = body;

    console.log('✅ Request body parsed successfully');
    console.log(`💬 Prompt: "${prompt}"`);
    console.log(`🖼️ Number of images: ${images ? images.length : 0}`);
    console.log(`🖼️ Image data lengths: ${images ? images.map(img => img.length) : []}`);
    console.log(`🎯 Generation Mode: "${generationMode}"`);
    console.log(`⚙️ Generation Settings:`, generationSettings);
    
    // Log aspect ratio specifically
    console.log('🎯 [CHARACTER VARIATION API] Aspect ratio from user settings:', {
      aspectRatio: generationSettings?.aspectRatio || 'NOT SET',
      outputFormat: generationSettings?.outputFormat || 'NOT SET',
      guidanceScale: generationSettings?.guidanceScale || 'NOT SET',
      strength: generationSettings?.strength || 'NOT SET',
      timestamp: new Date().toISOString()
    });

    // Check authorization header
    console.log('🔐 [CHARACTER VARIATION] Checking authorization header...');
    const authHeader = request.headers.get('authorization');
    console.log('🔐 [CHARACTER VARIATION] Auth header present:', !!authHeader);
    console.log('🔐 [CHARACTER VARIATION] Auth header format:', authHeader ? `${authHeader.substring(0, 20)}...` : 'null');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [CHARACTER VARIATION] No valid authorization header');
      console.error('❌ [CHARACTER VARIATION] Expected format: "Bearer <token>"');
      console.error('❌ [CHARACTER VARIATION] Received:', authHeader || 'null');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('🔐 [CHARACTER VARIATION] Token extracted:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('🔐 [CHARACTER VARIATION] Token length:', token ? token.length : 0);
    console.log('🔐 [CHARACTER VARIATION] Validating token with Supabase...');
    
    let user: any;
    try {
      const { data: { user: authUser }, error: authError } = await supabaseAdmin!.auth.getUser(token);
      
      if (authError) {
        console.error('❌ [CHARACTER VARIATION] Supabase auth error:', authError);
        console.error('❌ [CHARACTER VARIATION] Error message:', authError.message);
        console.error('❌ [CHARACTER VARIATION] Error status:', authError.status);
        return NextResponse.json(
          { error: 'Invalid authentication', details: authError.message },
          { status: 401 }
        );
      }
      
      if (!authUser) {
        console.error('❌ [CHARACTER VARIATION] No user returned from Supabase');
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        );
      }
      
      user = authUser;
      console.log('✅ [CHARACTER VARIATION] Token validation successful');
      console.log('👤 [CHARACTER VARIATION] User ID:', user.id);
      console.log('📧 [CHARACTER VARIATION] User email:', user.email);
      console.log('📅 [CHARACTER VARIATION] User created at:', user.created_at);
      console.log('🔍 [CHARACTER VARIATION] User metadata:', user.user_metadata);
      
    } catch (error) {
      console.error('❌ [CHARACTER VARIATION] Unexpected error during token validation:', error);
      return NextResponse.json(
        { error: 'Authentication service error' },
        { status: 500 }
      );
    }

    // Track first generation for new users (starts grace period)
    console.log('🆕 [CHARACTER VARIATION] Tracking first generation for user...');
    await trackUserFirstGeneration(user.id);

    // Check user's credit permission for this model
    console.log('💰 [CHARACTER VARIATION] Checking user credit permission...');
    console.log('💰 [CHARACTER VARIATION] Model:', generationMode || 'nano-banana');
    const creditCheck = await checkUserGenerationPermission(user.id, generationMode || 'nano-banana');
    
    if (!creditCheck.allowed) {
      console.log('❌ [CHARACTER VARIATION] Credit check failed:', creditCheck.message);
      return NextResponse.json({
        success: false,
        error: creditCheck.message,
        reason: creditCheck.reason,
        gracePeriodExpiresAt: creditCheck.gracePeriodExpiresAt,
        timeRemaining: creditCheck.timeRemaining
      }, { status: 402 }); // 402 Payment Required
    }
    
    console.log('✅ [CHARACTER VARIATION] Credit check passed:', creditCheck.message);
    
    // Enhanced validation for character combination
    if (images && images.length >= 2) {
      console.log(`🔄 [CHARACTER COMBINATION] Multiple images detected (${images.length}) - enabling character combination mode`);
      console.log(`📊 [CHARACTER COMBINATION] Image 1 data length: ${images[0].length} characters`);
      console.log(`📊 [CHARACTER COMBINATION] Image 2 data length: ${images[1].length} characters`);
      
      // Validate image data integrity
      images.forEach((imageData, index) => {
        if (!imageData || imageData.length < 100) {
          console.error(`❌ [CHARACTER COMBINATION] Image ${index + 1} appears to be corrupted or empty`);
        } else {
          console.log(`✅ [CHARACTER COMBINATION] Image ${index + 1} data integrity check passed`);
        }
      });
    }

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
    
    // Intelligent character combination detection based on user intent
    const isCharacterCombination = images.length >= 2 && (
      // Explicit character combination keywords
      prompt.toLowerCase().includes('combine') ||
      prompt.toLowerCase().includes('together') ||
      prompt.toLowerCase().includes('both characters') ||
      prompt.toLowerCase().includes('multiple characters') ||
      prompt.toLowerCase().includes('scene with') ||
      prompt.toLowerCase().includes('add to scene') ||
      prompt.toLowerCase().includes('put together') ||
      prompt.toLowerCase().includes('merge') ||
      prompt.toLowerCase().includes('blend') ||
      // Scene-based keywords
      prompt.toLowerCase().includes('scene') ||
      prompt.toLowerCase().includes('environment') ||
      prompt.toLowerCase().includes('setting') ||
      prompt.toLowerCase().includes('background') ||
      // Interaction keywords
      prompt.toLowerCase().includes('interaction') ||
      prompt.toLowerCase().includes('conversation') ||
      prompt.toLowerCase().includes('meeting') ||
      prompt.toLowerCase().includes('encounter')
    );
    
    // Check for reference-based generation scenarios (Seedream 4.0 feature)
    const isReferenceBasedGeneration = images.length >= 2 && (
      prompt.toLowerCase().includes('reference') ||
      prompt.toLowerCase().includes('based on') ||
      prompt.toLowerCase().includes('extract') ||
      prompt.toLowerCase().includes('style transfer') ||
      prompt.toLowerCase().includes('character design') ||
      prompt.toLowerCase().includes('product design')
    );
    
    const isMultiImageVariation = images.length >= 2 && !isCharacterCombination && !isReferenceBasedGeneration;
    
    console.log(`🔄 Request type: ${isVaryRequest ? 'VARY existing image' : isCharacterCombination ? 'CHARACTER COMBINATION' : isReferenceBasedGeneration ? 'REFERENCE-BASED GENERATION' : isMultiImageVariation ? 'MULTI-IMAGE VARIATION' : 'SINGLE IMAGE'}`);
    console.log(`🎭 Character combination detected: ${isCharacterCombination}`);
    console.log(`🎨 Reference-based generation detected: ${isReferenceBasedGeneration}`);
    console.log(`🖼️ Multi-image variation mode: ${isMultiImageVariation}`);
    
    // Analyze the original prompt for specific instructions
    const hasBackgroundRemoval = prompt.toLowerCase().includes('remove background') || 
                                prompt.toLowerCase().includes('background removed') ||
                                prompt.toLowerCase().includes('no background') ||
                                prompt.toLowerCase().includes('transparent background');
    
    console.log(`🔍 Background removal detected: ${hasBackgroundRemoval}`);
    console.log(`💬 Original prompt analysis: "${prompt}"`);
    
    let enhancedPrompt;
    
    // Check for character combination scenarios
    if (isCharacterCombination) {
      enhancedPrompt = `CHARACTER COMBINATION ANALYSIS - PRESERVE EXACT CHARACTER IDENTITY

You are analyzing ${images.length} separate character images to create scenes where the EXACT same characters interact. Each character must maintain their precise identity, age, appearance, and characteristics.

CRITICAL CHARACTER PRESERVATION REQUIREMENTS:
1. Analyze each character image separately to identify:
   - Character 1: EXACT age, gender, facial features, body type, clothing, hairstyle, distinctive traits
   - Character 2: EXACT age, gender, facial features, body type, clothing, hairstyle, distinctive traits
   - Additional characters if present

2. Character Identity Preservation Rules:
   - NEVER change ages (adult stays adult, child stays child)
   - NEVER change genders (male stays male, female stays female)
   - NEVER modify facial features, body type, or distinctive physical traits
   - NEVER alter clothing, hairstyle, or personal style elements
   - PRESERVE the exact same person from each reference image

3. Scene Composition Guidelines:
   - Create natural interactions between the EXACT same characters
   - Use clear spatial positioning (left, right, center, foreground, background)
   - Maintain character recognition and distinctiveness
   - Focus on the action/scenario while preserving identity

USER REQUEST: "${prompt}"

For each variation, provide:
- Camera angle that showcases both characters clearly
- Scene description that preserves exact character identity
- Environmental context that supports the character interaction
- Lighting and composition that maintains character recognition

CRITICAL CHARACTER PRESERVATION INSTRUCTIONS:
- Maintain identical character appearance from reference images
- Preserve exact age, gender, and physical characteristics
- Keep same clothing, hairstyle, and distinctive features
- Ensure both characters are clearly visible and recognizable
- Create natural interactions while preserving character identity
- Use descriptive positioning language for each character's placement

CHARACTER COMBINATION EXAMPLES:
- ✅ Correct: "The adult woman from Image 1 chases the adult man from Image 2 through the forest"
- ❌ Wrong: "A woman chases a child" (if the second character was an adult)
- ✅ Correct: "The same characters from both images interact naturally"
- ❌ Wrong: "Characters with similar features" (must be exact same people)

RESPECT THE USER'S CREATIVE VISION while maintaining exact character identity preservation.`;
    } else if (isReferenceBasedGeneration) {
      enhancedPrompt = `SEEDREAM 4.0 REFERENCE-BASED GENERATION ANALYSIS

You are analyzing ${images.length} images for reference-based generation using Seedream 4.0 best practices. This involves extracting key information from reference images (character design, artistic style, product features) to enable tasks like character creation, style transfer, and product design.

SEEDREAM 4.0 REFERENCE-BASED INSTRUCTIONS:
1. Analyze reference images to identify:
   - Character design elements (facial features, clothing style, pose, expression)
   - Artistic style (color palette, lighting, composition, visual effects)
   - Product features (materials, textures, design elements, branding)
   - Visual elements to preserve (specific features, style consistency)

2. Apply Seedream 4.0 reference-based best practices:
   - Clearly describe elements to be extracted and retained from reference images
   - Provide detailed information about desired generated content (scene, layout, specifics)
   - Specify what should remain unchanged explicitly
   - Use precise technical terminology for accurate representation
   - Clearly specify desired visualization format, layout, and style

USER REQUEST: "${prompt}"

For each variation, provide:
- Reference Target: Clear description of elements to extract from reference images
- Generated Scene Description: Detailed information about desired content
- Style Consistency: Maintain visual elements from reference
- Specific Preservation: What should remain unchanged
- Technical Accuracy: Precise terminology for concepts

CRITICAL REQUIREMENTS FOR REFERENCE-BASED GENERATION:
- Extract and retain specific features from reference images
- Maintain style consistency throughout variations
- Preserve character identity or product design elements
- Use precise descriptions for technical accuracy
- Clearly specify what should remain unchanged
- Focus on high-fidelity representation of reference elements

SEEDREAM 4.0 REFERENCE EXAMPLES:
- ✅ Character Reference: "Based on the character in the reference image, create variations maintaining facial features and clothing style"
- ✅ Style Transfer: "Apply the artistic style from Image 1 to the subject in Image 2"
- ✅ Product Design: "Extract the design elements from the reference and create variations in different colors"

RESPECT THE USER'S CREATIVE VISION while maintaining reference consistency using Seedream 4.0 best practices.`;
    } else if (isMultiImageVariation) {
      enhancedPrompt = `MULTI-IMAGE VARIATION ANALYSIS - SEPARATE CHARACTER VARIATIONS

You are analyzing ${images.length} separate character images to create individual character variations. Each image represents a different character that should be varied independently, not combined.

ANALYSIS INSTRUCTIONS:
1. Analyze each image separately to understand:
   - Character 1: Physical features, clothing, pose, expression, style
   - Character 2: Physical features, clothing, pose, expression, style
   - Additional characters if present

2. Create 4 variations that focus on the PRIMARY character (first image):
   - Use the first character as the main subject
   - Apply the user's requested variations to this character
   - Other characters can be referenced for style consistency if needed
   - Focus on individual character development, not combination

USER REQUEST: "${prompt}"

For each variation, provide:
- The specific camera angle and composition for the main character
- Character description that focuses on the primary subject
- Environmental context that supports the character
- Individual character development and variation

CRITICAL REQUIREMENTS:
- Focus on the PRIMARY character (first image) for variations
- Create individual character variations, not combinations
- Maintain character consistency and recognition
- Use cinematic compositions that showcase the main character effectively
- Other uploaded characters serve as reference/style guides only

RESPECT THE USER'S CREATIVE VISION while focusing on individual character variation.`;
    } else if (prompt.includes('Make into Freddy Krueger style')) {
      enhancedPrompt = `Generate 4 high-quality character variations based on the user's specific request: "${prompt}"

CHARACTER STYLE TRANSFORMATION - FREDDY KRUGER:
- Transform the character into Freddy Krueger's iconic appearance
- Include burned, scarred face with distinctive facial features
- Add the classic red and green striped sweater
- Include the signature clawed glove with metal blades
- Maintain the nightmare-inducing, menacing presence
- Preserve the user's original character details while applying Freddy's styling
- Create realistic, photo-realistic Freddy Krueger aesthetic

CRITICAL INSTRUCTIONS:
- PRESERVE the user's exact specifications and character details
- Apply Freddy Krueger's distinctive visual elements
- Maintain high detail in character features and styling
- Ensure character consistency across variations
- Focus on the user's unique vision enhanced with Freddy's iconic look

CRITICAL: Each variation should show a SINGLE character only - no duplicates, no multiple versions of the same person in one image.

RESPECT THE USER'S CREATIVE VISION while applying the Freddy Krueger transformation.`;
    } else if (prompt.includes('Make into Pinhead from Hellraiser style')) {
      enhancedPrompt = `Generate 4 high-quality character variations based on the user's specific request: "${prompt}"

CHARACTER STYLE TRANSFORMATION - PINHEAD FROM HELLRAISER:
- Transform the character into Pinhead's iconic appearance from Hellraiser
- Include the distinctive bald head with grid pattern of nails/pins
- Add the pale, almost translucent skin with dark, sunken eyes
- Include the black leather outfit with studs and chains
- Maintain the cold, calculating, and menacing presence
- Preserve the user's original character details while applying Pinhead's styling
- Create realistic, photo-realistic Pinhead aesthetic

CRITICAL INSTRUCTIONS:
- PRESERVE the user's exact specifications and character details
- Apply Pinhead's distinctive visual elements (nails in head, leather outfit)
- Maintain high detail in character features and styling
- Ensure character consistency across variations
- Focus on the user's unique vision enhanced with Pinhead's iconic look

CRITICAL: Each variation should show a SINGLE character only - no duplicates, no multiple versions of the same person in one image.

RESPECT THE USER'S CREATIVE VISION while applying the Pinhead transformation.`;
    } else if (prompt.includes('Make into Jason Voorhees style')) {
      enhancedPrompt = `Generate 4 high-quality character variations based on the user's specific request: "${prompt}"

CHARACTER STYLE TRANSFORMATION - JASON VOORHEES:
- Transform the character into Jason Voorhees' iconic appearance from Friday the 13th
- Include the distinctive hockey mask (white or dirty white)
- Add the large, imposing physique and dark clothing
- Include the machete or other weapon
- Maintain the silent, menacing presence
- Preserve the user's original character details while applying Jason's styling
- Create realistic, photo-realistic Jason Voorhees aesthetic

CRITICAL INSTRUCTIONS:
- PRESERVE the user's exact specifications and character details
- Apply Jason's distinctive visual elements (hockey mask, machete, imposing build)
- Maintain high detail in character features and styling
- Ensure character consistency across variations
- Focus on the user's unique vision enhanced with Jason's iconic look

CRITICAL: Each variation should show a SINGLE character only - no duplicates, no multiple versions of the same person in one image.

RESPECT THE USER'S CREATIVE VISION while applying the Jason Voorhees transformation.`;
    } else {
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
    
    if (isCharacterCombination) {
      console.log(`🎭 [CHARACTER COMBINATION] Analyzing ${images.length} separate character images`);
      console.log(`📝 [CHARACTER COMBINATION] Enhanced prompt length: ${enhancedPrompt.length} characters`);
      console.log(`🖼️ [CHARACTER COMBINATION] Image parts prepared: ${imageParts.length} images`);
    } else if (isReferenceBasedGeneration) {
      console.log(`🎨 [REFERENCE-BASED GENERATION] Analyzing ${images.length} reference images for style/character extraction`);
      console.log(`📝 [REFERENCE-BASED GENERATION] Enhanced prompt length: ${enhancedPrompt.length} characters`);
      console.log(`🖼️ [REFERENCE-BASED GENERATION] Image parts prepared: ${imageParts.length} images`);
    } else if (isMultiImageVariation) {
      console.log(`🖼️ [MULTI-IMAGE VARIATION] Analyzing ${images.length} separate character images for individual variations`);
      console.log(`📝 [MULTI-IMAGE VARIATION] Enhanced prompt length: ${enhancedPrompt.length} characters`);
      console.log(`🖼️ [MULTI-IMAGE VARIATION] Image parts prepared: ${imageParts.length} images`);
    }
    
    // Generate content with text and all images using retry mechanism with model fallback
    let result;
    try {
      result = await retryWithBackoff(async () => {
        console.log('🔄 Attempting Gemini API call...');
        if (isCharacterCombination) {
          console.log('🎭 [CHARACTER COMBINATION] Sending character combination analysis to Gemini...');
        } else if (isReferenceBasedGeneration) {
          console.log('🎨 [REFERENCE-BASED GENERATION] Sending reference-based generation analysis to Gemini...');
        } else if (isMultiImageVariation) {
          console.log('🖼️ [MULTI-IMAGE VARIATION] Sending multi-image variation analysis to Gemini...');
        }
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
    
    if (isCharacterCombination) {
      console.log('🎭 [CHARACTER COMBINATION] Gemini analysis completed for character combination');
      console.log(`📊 [CHARACTER COMBINATION] Full Gemini response: ${text}`);
      console.log(`📊 [CHARACTER COMBINATION] Analysis preview: ${text.substring(0, 500)}...`);
    } else if (isMultiImageVariation) {
      console.log('🖼️ [MULTI-IMAGE VARIATION] Gemini analysis completed for multi-image variation');
      console.log(`📊 [MULTI-IMAGE VARIATION] Full Gemini response: ${text}`);
      console.log(`📊 [MULTI-IMAGE VARIATION] Analysis preview: ${text.substring(0, 500)}...`);
    } else if (isVaryRequest) {
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
    
    if (isCharacterCombination) {
      console.log('🎭 [CHARACTER COMBINATION] Parsed variations:');
      variations.forEach((variation, index) => {
        console.log(`🎭 [CHARACTER COMBINATION] Variation ${index + 1}:`);
        console.log(`   - Angle: ${variation.angle}`);
        console.log(`   - Description: ${variation.description.substring(0, 200)}...`);
      });
    }

    if (variations.length === 0) {
      console.log('❌ No variations could be parsed from the response');
      return NextResponse.json({
        success: false,
        error: 'Failed to parse character variations from AI response'
      } as CharacterVariationResponse, { status: 500 });
    }

    let variationsWithImages = variations;

    if (hasFalKey) {
      console.log('🎨 Generating images with Gemini 2.5 Flash Image...');
      // Upload all images to get proper URLs for Gemini 2.5 Flash Image
      console.log(`🔄 [CHARACTER COMBINATION] Starting image upload process for ${images.length} images`);
      const imageUrls = await Promise.all(
        images.map(async (imageData, index) => {
          console.log(`📤 [CHARACTER COMBINATION] Uploading image ${index + 1}/${images.length} to Fal AI...`);
          console.log(`📊 [CHARACTER COMBINATION] Image ${index + 1} data length: ${imageData.length} characters`);
          
          try {
            const url = await uploadImageToTempUrl(imageData);
            console.log(`✅ [CHARACTER COMBINATION] Image ${index + 1} uploaded successfully: ${url}`);
            return url;
          } catch (error) {
            console.error(`❌ [CHARACTER COMBINATION] Failed to upload image ${index + 1}:`, error);
            throw error;
          }
        })
      );
      console.log(`🖼️ [CHARACTER COMBINATION] Successfully uploaded ${imageUrls.length} images for Gemini 2.5 Flash Image processing`);
      console.log(`🔗 [CHARACTER COMBINATION] Image URLs:`, imageUrls);
      
      // Generate images for each variation using Gemini 2.5 Flash Image
      variationsWithImages = await Promise.all(
        variations.map(async (variation, index) => {
          try {
            console.log(`🖼️ Generating image ${index + 1}/4 for: ${variation.angle}`);
            
            // Use the user's original prompt with enhanced quality instructions
            let nanoBananaPrompt = `${prompt} - ${variation.angle.toLowerCase()}`;
            
            // Add Nano Banana multi-character best practices for character combination
            if (isCharacterCombination) {
              console.log(`🎭 [CHARACTER COMBINATION] Using Gemini analysis for variation ${index + 1}: ${variation.description}`);
              // Use the Gemini analysis results for specific character descriptions
              nanoBananaPrompt = `Create a scene with the EXACT same characters from the reference images. `;
              nanoBananaPrompt += `CHARACTER ANALYSIS FROM GEMINI: ${variation.description} `;
              nanoBananaPrompt += `Scene action: ${prompt} - ${variation.angle.toLowerCase()}. `;
              nanoBananaPrompt += `CRITICAL CHARACTER PRESERVATION: `;
              nanoBananaPrompt += `- Maintain identical character appearance from reference images `;
              nanoBananaPrompt += `- Preserve exact age, gender, and physical characteristics `;
              nanoBananaPrompt += `- Keep same clothing, hairstyle, and distinctive features `;
              nanoBananaPrompt += `- Use clear spatial positioning for both characters `;
              nanoBananaPrompt += `- Ensure both characters are clearly visible and recognizable `;
              nanoBananaPrompt += `- Create natural interactions while preserving character identity `;
              nanoBananaPrompt += `- Generate high-quality scene with proper lighting and composition`;
              console.log(`📝 [CHARACTER COMBINATION] Final FAL prompt for variation ${index + 1}: ${nanoBananaPrompt.substring(0, 200)}...`);
            }
            
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
            
            // Add model-specific prompts based on combination mode
            if (isCharacterCombination) {
              // Nano Banana specific prompts for multi-character scenes
              nanoBananaPrompt += ', character consistency maintained';
              nanoBananaPrompt += ', natural character interactions';
              nanoBananaPrompt += ', clear character positioning';
              nanoBananaPrompt += ', realistic character relationships';
              nanoBananaPrompt += ', professional character photography';
              nanoBananaPrompt += ', cinematic character composition';
              nanoBananaPrompt += ', detailed character expressions';
              nanoBananaPrompt += ', proper character lighting';
            } else if (isReferenceBasedGeneration) {
              // Nano Banana specific prompts for reference-based generation
              nanoBananaPrompt += ', reference style preserved';
              nanoBananaPrompt += ', character identity maintained';
              nanoBananaPrompt += ', style consistency throughout';
              nanoBananaPrompt += ', reference elements extracted';
              nanoBananaPrompt += ', high-fidelity reference matching';
              nanoBananaPrompt += ', precise style transfer';
              nanoBananaPrompt += ', reference-based composition';
            } else {
              // Add subtle negative prompts to prevent character duplication for single character
              nanoBananaPrompt += ', single character only, no duplicates, no multiple versions of the same person';
            }
            
            console.log(`🎨 Enhanced Gemini 2.5 Flash Image prompt for ${variation.angle}:`, nanoBananaPrompt);
            
            if (isCharacterCombination) {
              console.log(`🎭 [GEMINI 2.5 FLASH MULTI-CHARACTER] Applied Gemini 2.5 Flash Image character consistency best practices`);
              console.log(`📝 [GEMINI 2.5 FLASH MULTI-CHARACTER] Using character-focused prompt structure`);
              console.log(`🔗 [GEMINI 2.5 FLASH MULTI-CHARACTER] Preventing character blending with identity preservation`);
              console.log(`⚙️ [GEMINI 2.5 FLASH MULTI-CHARACTER] Using Gemini 2.5 Flash Image official parameters:`);
              console.log(`   - prompt: ${nanoBananaPrompt.substring(0, 100)}...`);
              console.log(`   - image_urls: ${imageUrls.length} images (multi-image support)`);
              console.log(`   - num_images: 1`);
              console.log(`   - output_format: ${generationSettings?.outputFormat || "jpeg"}`);
              console.log(`   - sync_mode: false (return URLs)`);
            } else if (isReferenceBasedGeneration) {
              console.log(`🎨 [SEEDREAM 4.0 REFERENCE] Applied Seedream 4.0 reference-based generation best practices`);
              console.log(`📝 [SEEDREAM 4.0 REFERENCE] Using reference extraction prompt structure`);
              console.log(`🔗 [SEEDREAM 4.0 REFERENCE] Enabling reference extraction and style transfer`);
              console.log(`⚙️ [SEEDREAM 4.0 REFERENCE] Using Gemini 2.5 Flash Image official parameters:`);
              console.log(`   - prompt: ${nanoBananaPrompt.substring(0, 100)}...`);
              console.log(`   - image_urls: ${imageUrls.length} images (reference-based processing)`);
              console.log(`   - num_images: 1`);
              console.log(`   - output_format: ${generationSettings?.outputFormat || "jpeg"}`);
              console.log(`   - sync_mode: false (return URLs)`);
            }
            
            const result = await retryWithBackoff(async () => {
              console.log(`🔄 Attempting Gemini 2.5 Flash Image generation for ${variation.angle}...`);
              
              // Use the correct model based on the generation mode - all models have cross-functionality
              let modelName;
              if (generationMode === 'seedream-4-edit') {
                modelName = "fal-ai/bytedance/seedream/v4/edit";
                console.log(`🤖 Using Seedream 4.0 Edit model: ${modelName}`);
              } else if (generationMode === 'gemini-25-flash-image-edit') {
                modelName = "fal-ai/gemini-25-flash-image/edit";
                console.log(`🤖 Using Gemini 2.5 Flash Image model: ${modelName}`);
              } else {
                // Default to Nano Banana (character variations, image editing, multiple characters)
                modelName = "fal-ai/nano-banana/edit";
                console.log(`🤖 Using Nano Banana model: ${modelName}`);
              }
              
              console.log(`🎯 [MODEL API] Calling ${modelName} API for ${variation.angle}`);
              console.log(`📝 [MODEL API] Prompt: ${nanoBananaPrompt}`);
              console.log(`🖼️ [MODEL API] Image URLs count: ${imageUrls.length}`);
              console.log(`🔗 [MODEL API] Image URLs:`, imageUrls);
              
              // Use model-specific official supported parameters
              console.log(`🚀 [MODEL API] Using official ${modelName} parameters for multi-image generation...`);
              
              const falInput = {
                prompt: nanoBananaPrompt,
                image_urls: imageUrls, // Use all uploaded image URLs for multi-image processing
                num_images: 1,
                output_format: generationSettings?.outputFormat || "jpeg",
                aspect_ratio: generationSettings?.aspectRatio || "1:1", // Add aspect ratio support
                sync_mode: false // Return URLs instead of data URIs
              };
              
              console.log('🎯 [CHARACTER VARIATION API] FAL API input with aspect ratio:', {
                model: modelName,
                aspect_ratio: falInput.aspect_ratio,
                output_format: falInput.output_format,
                num_images: falInput.num_images,
                image_urls_count: falInput.image_urls.length,
                timestamp: new Date().toISOString()
              });
              
              const result = await fal.subscribe(modelName, {
                input: falInput,
                logs: true,
                onQueueUpdate: (update) => {
                  if (update.status === "IN_PROGRESS") {
                    console.log(`📊 [MODEL API] Generation progress for ${variation.angle}:`, update.logs?.map(log => log.message).join(', '));
                  }
                },
              });
              console.log(`✅ [MODEL API] ${modelName} API call successful with official parameters!`);
              
              console.log(`✅ [CHARACTER COMBINATION] ${modelName} API call completed for ${variation.angle}`);
              console.log(`📊 [CHARACTER COMBINATION] Result data:`, result.data);
              return result;
            });

            console.log(`✅ Image ${index + 1} generated successfully`);
            
            return {
              ...variation,
              imageUrl: result.data.images[0]?.url || undefined,
              fileType: 'image' // Gemini 2.5 Flash Image generates images, not videos
            };
          } catch (error) {
            console.error(`❌ [CHARACTER COMBINATION] Failed to generate image for ${variation.angle}:`, error);
            console.error(`🔍 [CHARACTER COMBINATION] Error type:`, typeof error);
            console.error(`🔍 [CHARACTER COMBINATION] Error message:`, error instanceof Error ? error.message : 'Unknown error');
            
            if (error instanceof Error && 'body' in error) {
              console.error('❌ [CHARACTER COMBINATION] Full error body:', (error as any).body);
              
              // Check for content policy violation
              const errorBody = (error as any).body;
              if (errorBody?.detail?.[0]?.type === 'content_policy_violation') {
                console.log(`⚠️ [CHARACTER COMBINATION] Content policy violation for ${variation.angle} - returning text description only`);
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
    
    // Deduct credits after successful generation
    console.log('💰 [CHARACTER VARIATION] Starting credit deduction for successful generation...');
    console.log('💰 [CHARACTER VARIATION] User ID:', user.id);
    console.log('💰 [CHARACTER VARIATION] Model:', generationMode || 'nano-banana');
    console.log('💰 [CHARACTER VARIATION] Number of variations generated:', variationsWithImages.length);
    
    const creditDeduction = await deductCreditsForGeneration(user.id, generationMode || 'nano-banana');
    
    if (!creditDeduction.success) {
      console.error('❌ [CHARACTER VARIATION] Credit deduction failed:', creditDeduction.error);
      console.error('❌ [CHARACTER VARIATION] This is a critical error - generation succeeded but credits not deducted');
    } else {
      console.log(`✅ [CHARACTER VARIATION] Credit deduction successful!`);
      console.log(`✅ [CHARACTER VARIATION] Credits deducted: ${creditDeduction.creditsUsed}`);
      console.log(`💰 [CHARACTER VARIATION] Remaining balance: ${creditDeduction.remainingBalance} credits`);
      console.log(`💰 [CHARACTER VARIATION] User can generate ~${Math.floor(creditDeduction.remainingBalance / (creditDeduction.creditsUsed || 1))} more similar generations`);
      
      // Check for low balance notification
      console.log('🔔 [CHARACTER VARIATION] Checking for low balance notification...');
      await checkLowBalanceNotification(user.id);
    }
    
    return NextResponse.json({
      success: true,
      variations: variationsWithImages,
      metadata: {
        creditsUsed: creditDeduction.creditsUsed,
        remainingBalance: creditDeduction.remainingBalance
      }
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
      } else if (error.message.includes('content policy violation') || error.message.includes('prohibited_content') || error.message.includes('blocked due to prohibited content')) {
        errorMessage = 'Content blocked due to policy restrictions. Please try a different prompt or image.';
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
        id: `variation-${variationCount + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
          id: `variation-${index + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
        id: `variation-${index + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    const timestamp = Date.now();
    return [
      {
        id: `variation-1-${timestamp}`,
        description: 'Character variation 1: Show the same character with different styling while maintaining all original design elements, clothing, and features.',
        angle: 'Variation 1',
        pose: 'Custom Pose 1',
        fileType: 'image' as const
      },
      {
        id: `variation-2-${timestamp}`,
        description: 'Character variation 2: Show the same character with different styling while maintaining all original design elements, clothing, and features.',
        angle: 'Variation 2',
        pose: 'Custom Pose 2',
        fileType: 'image' as const
      },
      {
        id: `variation-3-${timestamp}`,
        description: 'Character variation 3: Show the same character with different styling while maintaining all original design elements, clothing, and features.',
        angle: 'Variation 3',
        pose: 'Custom Pose 3',
        fileType: 'image' as const
      },
      {
        id: `variation-4-${timestamp}`,
        description: 'Character variation 4: Show the same character with different styling while maintaining all original design elements, clothing, and features.',
        angle: 'Variation 4',
        pose: 'Custom Pose 4',
        fileType: 'image' as const
      }
    ];
  }
}
