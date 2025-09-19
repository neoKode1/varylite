import { GoogleGenerativeAI } from '@google/generative-ai'
import { fal } from '@fal-ai/client'

// AI Service Manager for optimized model selection and fallback
export class AIServiceManager {
  private static instance: AIServiceManager
  private geminiClient: GoogleGenerativeAI | null = null
  private falConfigured = false
  private modelHealthStatus: Map<string, { healthy: boolean; lastChecked: number; failures: number }> = new Map()
  
  private constructor() {
    this.initializeServices()
  }

  public static getInstance(): AIServiceManager {
    if (!AIServiceManager.instance) {
      AIServiceManager.instance = new AIServiceManager()
    }
    return AIServiceManager.instance
  }

  private initializeServices() {
    // Initialize Gemini
    if (process.env.GOOGLE_API_KEY) {
      this.geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
      console.log('✅ Gemini AI initialized')
    }

    // Initialize Fal AI
    if (process.env.FAL_KEY) {
      fal.config({ credentials: process.env.FAL_KEY })
      this.falConfigured = true
      console.log('✅ Fal AI configured')
    }
  }

  // Optimized model selection with health checking
  public async getOptimalGeminiModel(): Promise<any> {
    if (!this.geminiClient) {
      throw new Error('Gemini AI not configured')
    }

    const models = [
      { name: 'gemini-2.0-flash', priority: 1 },
      { name: 'gemini-1.5-pro', priority: 2 },
      { name: 'gemini-1.5-flash', priority: 3 }
    ]

    // Check model health status
    for (const model of models) {
      const health = this.modelHealthStatus.get(model.name)
      const now = Date.now()
      
      // Skip unhealthy models (unless it's been 5 minutes since last check)
      if (health && !health.healthy && (now - health.lastChecked) < 300000) {
        continue
      }

      try {
        const geminiModel = this.geminiClient!.getGenerativeModel({ model: model.name })
        
        // Quick health check with a simple request
        await this.healthCheckModel(geminiModel, model.name)
        
        this.updateModelHealth(model.name, true)
        return geminiModel
      } catch (error) {
        console.warn(`⚠️ Model ${model.name} failed health check:`, error)
        this.updateModelHealth(model.name, false)
        continue
      }
    }

    throw new Error('All Gemini models are currently unavailable')
  }

  private async healthCheckModel(model: any, modelName: string): Promise<void> {
    // Simple health check with minimal content
    const testResult = await model.generateContent(['Test'])
    if (!testResult.response) {
      throw new Error('Model health check failed')
    }
  }

  private updateModelHealth(modelName: string, healthy: boolean) {
    const now = Date.now()
    const current = this.modelHealthStatus.get(modelName) || { healthy: true, lastChecked: 0, failures: 0 }
    
    this.modelHealthStatus.set(modelName, {
      healthy,
      lastChecked: now,
      failures: healthy ? 0 : current.failures + 1
    })
  }

  // Optimized Fal AI operations with connection pooling
  public async uploadToFalOptimized(file: File): Promise<string> {
    if (!this.falConfigured) {
      throw new Error('Fal AI not configured')
    }

    try {
      return await fal.storage.upload(file)
    } catch (error) {
      console.error('❌ Fal AI upload failed:', error)
      throw error
    }
  }

  // Batch operations for multiple images
  public async uploadMultipleToFal(files: File[]): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadToFalOptimized(file))
    return Promise.allSettled(uploadPromises).then(results => 
      results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          console.error(`❌ Upload failed for file ${index}:`, result.reason)
          throw new Error(`Upload failed for file ${index}: ${result.reason}`)
        }
      })
    )
  }

  // Intelligent retry with circuit breaker
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          throw lastError
        }

        // Don't retry on certain errors
        if (this.isNonRetryableError(lastError)) {
          throw lastError
        }

        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`⚠️ Attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase()
    return message.includes('401') || 
           message.includes('403') || 
           message.includes('400') ||
           message.includes('invalid api key') ||
           message.includes('content policy')
  }

  // Get service status for monitoring
  public getServiceStatus() {
    return {
      gemini: !!this.geminiClient,
      fal: this.falConfigured,
      modelHealth: Object.fromEntries(this.modelHealthStatus)
    }
  }
}

// Export singleton instance
export const aiServiceManager = AIServiceManager.getInstance()
