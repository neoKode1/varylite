import { NextRequest, NextResponse } from 'next/server'
import type { CharacterVariationRequest, CharacterVariationResponse, CharacterVariation } from '@/types/gemini'
import { aiServiceManager } from '@/lib/ai-service-manager'
import { circuitBreakerManager } from '@/lib/circuit-breaker'
import { optimizedCreditService } from '@/lib/optimized-credit-service'
import { fileProcessingManager } from '@/lib/file-processing-manager'
import { supabaseAdmin } from '@/lib/optimized-supabase'

// Circuit breaker for this specific route
const varyCharacterBreaker = circuitBreakerManager.getBreaker('vary-character', {
  failureThreshold: 3,
  recoveryTimeout: 30000,
  monitoringPeriod: 300000,
  halfOpenMaxCalls: 2
})

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 60000, // 1 minute
  maxRequests: 10, // 10 requests per minute per user
  skipSuccessfulRequests: false
}

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting middleware
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_CONFIG.windowMs
  
  // Clean up expired entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }

  const userLimit = rateLimitStore.get(userId)
  
  if (!userLimit || userLimit.resetTime < now) {
    // New window or expired window
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs
    })
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxRequests - 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs
    }
  }

  if (userLimit.count >= RATE_LIMIT_CONFIG.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: userLimit.resetTime
    }
  }

  // Increment counter
  userLimit.count++
  return {
    allowed: true,
    remaining: RATE_LIMIT_CONFIG.maxRequests - userLimit.count,
    resetTime: userLimit.resetTime
  }
}

// Enhanced request validation
function validateRequest(body: CharacterVariationRequest): { valid: boolean; error?: string } {
  if (!body.images || body.images.length === 0) {
    return { valid: false, error: 'At least one image is required' }
  }

  if (!body.prompt || body.prompt.trim().length === 0) {
    return { valid: false, error: 'Prompt is required' }
  }

  if (body.images.length > 10) {
    return { valid: false, error: 'Maximum 10 images allowed' }
  }

  // Validate image data integrity
  for (let i = 0; i < body.images.length; i++) {
    const imageData = body.images[i]
    if (!imageData || typeof imageData !== 'string') {
      return { valid: false, error: `Invalid image data at index ${i}` }
    }

    // Check if it's valid base64
    try {
      const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData
      Buffer.from(base64Data, 'base64')
    } catch {
      return { valid: false, error: `Invalid base64 data at index ${i}` }
    }
  }

  return { valid: true }
}

// Optimized image processing with parallel uploads
async function processImagesOptimized(images: string[]): Promise<string[]> {
  console.log(`🖼️ Processing ${images.length} images in parallel`)
  
  const uploadPromises = images.map(async (imageData, index) => {
    try {
      const file = fileProcessingManager.base64ToFile(imageData, `image-${index}.jpg`)
      const result = await fileProcessingManager.uploadFile(file)
      
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed')
      }
      
      return result.url
    } catch (error) {
      console.error(`❌ Failed to process image ${index}:`, error)
      throw error
    }
  })

  return Promise.all(uploadPromises)
}

// Enhanced Gemini prompt generation
function generateOptimizedPrompt(prompt: string, imageCount: number, isVaryRequest: boolean): string {
  const basePrompt = isVaryRequest 
    ? `You are an expert character analyst. Analyze this single character image and generate 4 new variations with different angles, poses, and perspectives.`
    : `You are an expert character analyst. Analyze these ${imageCount} character images and generate 4 new variations that combine the best features from all images.`

  return `${basePrompt}

CRITICAL REQUIREMENTS:
1. Generate exactly 4 unique variations
2. Each variation must be from a different angle/pose
3. Maintain character consistency across all variations
4. Use professional camera angles and lighting
5. Ensure high-quality, detailed descriptions

USER REQUEST: ${prompt}

RESPONSE FORMAT:
For each variation, provide:
- Angle: [specific camera angle]
- Pose: [character pose description]
- Description: [detailed visual description]

Generate 4 variations now:`
}

// Parse Gemini response with enhanced error handling
function parseGeminiResponse(text: string): CharacterVariation[] {
  const variations: CharacterVariation[] = []
  
  try {
    // Enhanced parsing with multiple fallback strategies
    const lines = text.split('\n').filter(line => line.trim())
    
    let currentVariation: Partial<CharacterVariation> = {}
    let variationIndex = 0

    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (trimmedLine.toLowerCase().includes('angle:') || trimmedLine.toLowerCase().includes('angle -')) {
        if (currentVariation.angle) {
          // Save previous variation and start new one
          if (currentVariation.angle && currentVariation.pose && currentVariation.description) {
            variations.push({
              id: `variation-${variationIndex}`,
              angle: currentVariation.angle,
              pose: currentVariation.pose,
              description: currentVariation.description
            })
          }
          variationIndex++
        }
        
        currentVariation.angle = trimmedLine.split(':')[1]?.trim() || trimmedLine.split('-')[1]?.trim() || 'Unknown angle'
      } else if (trimmedLine.toLowerCase().includes('pose:') || trimmedLine.toLowerCase().includes('pose -')) {
        currentVariation.pose = trimmedLine.split(':')[1]?.trim() || trimmedLine.split('-')[1]?.trim() || 'Unknown pose'
      } else if (trimmedLine.toLowerCase().includes('description:') || trimmedLine.toLowerCase().includes('description -')) {
        currentVariation.description = trimmedLine.split(':')[1]?.trim() || trimmedLine.split('-')[1]?.trim() || 'No description'
      }
    }

    // Add the last variation
    if (currentVariation.angle && currentVariation.pose && currentVariation.description) {
      variations.push({
        id: `variation-${variationIndex}`,
        angle: currentVariation.angle,
        pose: currentVariation.pose,
        description: currentVariation.description
      })
    }

    // Fallback: if parsing failed, create variations from the text
    if (variations.length === 0) {
      console.log('⚠️ Standard parsing failed, using fallback method')
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
      
      for (let i = 0; i < Math.min(4, sentences.length); i++) {
        variations.push({
          id: `variation-${i + 1}`,
          angle: `Variation ${i + 1}`,
          pose: 'Character pose',
          description: sentences[i].trim()
        })
      }
    }

    // Ensure we have exactly 4 variations
    while (variations.length < 4) {
      variations.push({
        id: `variation-${variations.length + 1}`,
        angle: `Variation ${variations.length + 1}`,
        pose: 'Character pose',
        description: 'Additional character variation'
      })
    }

    return variations.slice(0, 4)

  } catch (error) {
    console.error('❌ Error parsing Gemini response:', error)
    // Ultimate fallback
    return [
      { id: 'variation-1', angle: 'Front view', pose: 'Standing pose', description: 'Character from the front' },
      { id: 'variation-2', angle: 'Side profile', pose: 'Profile pose', description: 'Character from the side' },
      { id: 'variation-3', angle: 'Three-quarter view', pose: 'Angled pose', description: 'Character at three-quarter angle' },
      { id: 'variation-4', angle: 'Back view', pose: 'Back pose', description: 'Character from behind' }
    ]
  }
}

// Main optimized POST handler
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `vary-char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  console.log(`🚀 [${requestId}] Optimized vary-character API called`)

  try {
    // Parse and validate request
    const body: CharacterVariationRequest = await request.json()
    const validation = validateRequest(body)
    
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        retryable: false
      } as CharacterVariationResponse, { status: 400 })
    }

    const { images, prompt } = body
    const isVaryRequest = images.length === 1 && prompt.includes('Generate 4 new variations')

    // Extract user ID from authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        retryable: false
      } as CharacterVariationResponse, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabaseAdmin!.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid authentication token',
        retryable: false
      } as CharacterVariationResponse, { status: 401 })
    }

    // Rate limiting check
    const rateLimit = checkRateLimit(user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        retryable: true,
        metadata: {
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime
        }
      } as CharacterVariationResponse, { status: 429 })
    }

    // Credit check
    const creditCheck = await optimizedCreditService.checkUserCredits(user.id, 'nano-banana')
    if (!creditCheck.hasCredits) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient credits',
        retryable: false,
        metadata: {
          availableCredits: creditCheck.availableCredits,
          requiredCredits: creditCheck.modelCost
        }
      } as CharacterVariationResponse, { status: 402 })
    }

    // Circuit breaker check
    if (!varyCharacterBreaker.canExecute()) {
      return NextResponse.json({
        success: false,
        error: 'Service temporarily unavailable. Please try again in a moment.',
        retryable: true
      } as CharacterVariationResponse, { status: 503 })
    }

    // Process images in parallel
    console.log(`🖼️ [${requestId}] Processing ${images.length} images`)
    const imageUrls = await processImagesOptimized(images)

    // Generate optimized prompt
    const optimizedPrompt = generateOptimizedPrompt(prompt, images.length, isVaryRequest)

    // Get optimal Gemini model
    const geminiModel = await aiServiceManager.getOptimalGeminiModel()

    // Execute with circuit breaker
    const result = await varyCharacterBreaker.execute(async () => {
      return await aiServiceManager.executeWithRetry(async () => {
        const imageParts = imageUrls.map(url => ({
          inlineData: {
            data: url.split(',')[1] || url,
            mimeType: 'image/jpeg'
          }
        }))

        const result = await geminiModel.generateContent([optimizedPrompt, ...imageParts])
        return await result.response
      })
    })

    const responseText = result.text()
    if (!responseText) {
      throw new Error('No response received from Gemini AI')
    }

    // Parse response
    const variations = parseGeminiResponse(responseText)

    // Deduct credits
    const creditDeduction = await optimizedCreditService.deductCredits(
      user.id,
      'nano-banana',
      'Character variation generation'
    )

    if (!creditDeduction.success) {
      console.error('❌ Credit deduction failed:', creditDeduction.error)
      // Continue with response but log the error
    }

    const processingTime = Date.now() - startTime
    console.log(`✅ [${requestId}] Request completed in ${processingTime}ms`)

    return NextResponse.json({
      success: true,
      variations,
      metadata: {
        creditsUsed: creditDeduction.creditsUsed,
        remainingBalance: creditDeduction.remainingBalance,
        processingTime,
        requestId
      }
    } as CharacterVariationResponse)

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`❌ [${requestId}] Request failed after ${processingTime}ms:`, error)

    // Record failure in circuit breaker
    varyCharacterBreaker.onFailure()

    let errorMessage = 'An unexpected error occurred'
    let statusCode = 500
    let retryable = false

    if (error instanceof Error) {
      errorMessage = error.message
      
      if (error.message.includes('503') || error.message.includes('overloaded')) {
        errorMessage = 'AI service is temporarily overloaded. Please try again.'
        statusCode = 503
        retryable = true
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again later.'
        statusCode = 429
        retryable = true
      } else if (error.message.includes('401') || error.message.includes('authentication')) {
        errorMessage = 'Authentication failed. Please check your credentials.'
        statusCode = 401
      } else if (error.message.includes('content policy')) {
        errorMessage = 'Content blocked due to policy restrictions.'
        statusCode = 400
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      retryable,
      metadata: {
        processingTime,
        requestId
      }
    } as CharacterVariationResponse, { status: statusCode })
  }
}

// Health check endpoint
export async function GET() {
  const healthMetrics = {
    circuitBreaker: varyCharacterBreaker.getHealthMetrics(),
    aiService: aiServiceManager.getServiceStatus(),
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(healthMetrics)
}
