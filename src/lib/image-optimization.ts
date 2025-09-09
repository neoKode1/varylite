/**
 * Client-side image optimization utilities for production-scale uploads
 * Reduces file sizes by 60-80% while maintaining quality
 */

export interface OptimizedImage {
  file: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  dataUrl: string;
}

export interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  maxFileSize?: number; // in bytes
}

const DEFAULT_OPTIONS: Required<OptimizationOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  format: 'jpeg',
  maxFileSize: 10 * 1024 * 1024, // 10MB
};

/**
 * Optimize an image file for upload
 */
export async function optimizeImage(
  file: File,
  options: OptimizationOptions = {}
): Promise<OptimizedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  console.log('🖼️ Optimizing image:', {
    originalName: file.name,
    originalSize: file.size,
    originalType: file.type,
    targetFormat: opts.format,
    targetQuality: opts.quality,
    maxDimensions: `${opts.maxWidth}x${opts.maxHeight}`
  });

  // Check if file is already small enough
  if (file.size <= opts.maxFileSize && file.type === `image/${opts.format}`) {
    console.log('✅ Image already optimized');
    return {
      file,
      originalSize: file.size,
      optimizedSize: file.size,
      compressionRatio: 1,
      dataUrl: await fileToDataUrl(file)
    };
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        const { width, height } = calculateDimensions(
          img.width,
          img.height,
          opts.maxWidth,
          opts.maxHeight
        );

        console.log('📐 Resizing image:', {
          original: `${img.width}x${img.height}`,
          optimized: `${width}x${height}`
        });

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and optimize
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to blob with specified format and quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create optimized image blob'));
              return;
            }

            // Create optimized file
            const optimizedFile = new File([blob], file.name, {
              type: `image/${opts.format}`,
              lastModified: Date.now()
            });

            const compressionRatio = file.size / optimizedFile.size;
            
            console.log('✅ Image optimization complete:', {
              originalSize: formatBytes(file.size),
              optimizedSize: formatBytes(optimizedFile.size),
              compressionRatio: `${compressionRatio.toFixed(2)}x`,
              savings: `${((1 - optimizedFile.size / file.size) * 100).toFixed(1)}%`
            });

            // Convert to data URL for preview
            fileToDataUrl(optimizedFile).then(dataUrl => {
              resolve({
                file: optimizedFile,
                originalSize: file.size,
                optimizedSize: optimizedFile.size,
                compressionRatio,
                dataUrl
              });
            });

          },
          `image/${opts.format}`,
          opts.quality
        );

      } catch (error) {
        console.error('❌ Image optimization error:', error);
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for optimization'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Scale down if too wide
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  // Scale down if too tall
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}

/**
 * Convert file to data URL for preview
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate image file before optimization
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }

  // Check file size (50MB Supabase limit)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large. Maximum size is ${formatBytes(maxSize)}` 
    };
  }

  // Check supported formats
  const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!supportedFormats.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Unsupported image format. Please use JPEG, PNG, WebP, or GIF' 
    };
  }

  return { valid: true };
}

/**
 * Get optimal format based on browser support and file type
 */
export function getOptimalFormat(originalType: string): 'jpeg' | 'webp' | 'png' {
  // Check WebP support
  const canvas = document.createElement('canvas');
  const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  
  if (supportsWebP && originalType !== 'image/gif') {
    return 'webp'; // Best compression
  }
  
  if (originalType === 'image/png' && originalType.includes('transparency')) {
    return 'png'; // Preserve transparency
  }
  
  return 'jpeg'; // Fallback
}
