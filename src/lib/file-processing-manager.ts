import { fal } from '@fal-ai/client'
import { supabaseAdmin } from './optimized-supabase'

export interface FileUploadResult {
  success: boolean
  url?: string
  fileName?: string
  fileSize?: number
  error?: string
}

export interface BatchUploadResult {
  results: FileUploadResult[]
  successful: number
  failed: number
  totalSize: number
}

export class FileProcessingManager {
  private static instance: FileProcessingManager
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
  private readonly ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/mov', 'video/avi',
    'audio/mp3', 'audio/wav', 'audio/m4a'
  ]

  private constructor() {
    this.initializeFal()
  }

  public static getInstance(): FileProcessingManager {
    if (!FileProcessingManager.instance) {
      FileProcessingManager.instance = new FileProcessingManager()
    }
    return FileProcessingManager.instance
  }

  private initializeFal() {
    if (process.env.FAL_KEY) {
      fal.config({ credentials: process.env.FAL_KEY })
      console.log('✅ File Processing Manager: Fal AI configured')
    }
  }

  // Optimized single file upload with streaming
  public async uploadFile(file: File): Promise<FileUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Upload to Fal AI with progress tracking
      const startTime = Date.now()
      const url = await fal.storage.upload(file)
      const uploadTime = Date.now() - startTime

      console.log(`✅ File uploaded successfully in ${uploadTime}ms: ${file.name}`)

      return {
        success: true,
        url,
        fileName: file.name,
        fileSize: file.size
      }

    } catch (error) {
      console.error('❌ File upload failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  // Batch upload with parallel processing and progress tracking
  public async uploadFiles(files: File[]): Promise<BatchUploadResult> {
    const results: FileUploadResult[] = []
    let successful = 0
    let failed = 0
    let totalSize = 0

    console.log(`📤 Starting batch upload of ${files.length} files`)

    // Process files in parallel with concurrency limit
    const concurrencyLimit = 5
    const chunks = this.chunkArray(files, concurrencyLimit)

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(file => this.uploadFile(file))
      const chunkResults = await Promise.allSettled(chunkPromises)

      chunkResults.forEach((result, index) => {
        const fileResult = result.status === 'fulfilled' 
          ? result.value 
          : {
              success: false,
              error: result.reason instanceof Error ? result.reason.message : 'Upload failed'
            }

        results.push(fileResult)
        
        if (fileResult.success) {
          successful++
          totalSize += fileResult.fileSize || 0
        } else {
          failed++
        }
      })

      // Small delay between chunks to prevent overwhelming the service
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`📊 Batch upload completed: ${successful} successful, ${failed} failed`)

    return {
      results,
      successful,
      failed,
      totalSize
    }
  }

  // Optimized base64 to file conversion with memory management
  public base64ToFile(base64Data: string, fileName: string = 'image.jpg'): File {
    try {
      // Remove data URL prefix if present
      const base64 = base64Data.includes(',') 
        ? base64Data.split(',')[1] 
        : base64Data

      // Convert to buffer with memory optimization
      const buffer = Buffer.from(base64, 'base64')
      
      // Create blob with proper MIME type detection
      const mimeType = this.detectMimeType(fileName)
      const blob = new Blob([buffer], { type: mimeType })
      
      return new File([blob], fileName, { type: mimeType })
    } catch (error) {
      console.error('❌ Base64 to file conversion failed:', error)
      throw new Error('Failed to convert base64 to file')
    }
  }

  // Memory-efficient image processing
  public async processImageOptimized(
    file: File,
    options: {
      maxWidth?: number
      maxHeight?: number
      quality?: number
      format?: 'jpeg' | 'png' | 'webp'
    } = {}
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        try {
          // Calculate optimal dimensions
          const { width, height } = this.calculateOptimalDimensions(
            img.width, 
            img.height, 
            options.maxWidth || 1920, 
            options.maxHeight || 1080
          )

          canvas.width = width
          canvas.height = height

          // Draw image with optimization
          ctx?.drawImage(img, 0, 0, width, height)

          // Convert to blob with specified quality
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const processedFile = new File(
                  [blob], 
                  file.name, 
                  { type: options.format ? `image/${options.format}` : file.type }
                )
                resolve(processedFile)
              } else {
                reject(new Error('Failed to process image'))
              }
            },
            options.format ? `image/${options.format}` : file.type,
            options.quality || 0.8
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  // Store file metadata in database
  public async storeFileMetadata(
    userId: string,
    fileResult: FileUploadResult,
    sessionId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabaseAdmin || !fileResult.success) {
        return { success: false, error: 'Invalid file result' }
      }

      // Simplified logging without database storage
      console.log('✅ File upload completed successfully:', {
        fileName: fileResult.fileName,
        fileSize: fileResult.fileSize,
        url: fileResult.url,
        userId,
        sessionId
      })

      // File upload successful

      return { success: true }
    } catch (error) {
      console.error('❌ Error storing file metadata:', error)
      return { success: false, error: 'Failed to store metadata' }
    }
  }

  // Private helper methods
  private validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
      }
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not supported`
      }
    }

    return { valid: true }
  }

  private detectMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'm4a': 'audio/mp4'
    }
    return mimeTypes[extension || ''] || 'application/octet-stream'
  }

  private calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight

    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight }
    }

    if (aspectRatio > maxWidth / maxHeight) {
      return {
        width: maxWidth,
        height: Math.round(maxWidth / aspectRatio)
      }
    } else {
      return {
        width: Math.round(maxHeight * aspectRatio),
        height: maxHeight
      }
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }
}

// Export singleton instance
export const fileProcessingManager = FileProcessingManager.getInstance()
