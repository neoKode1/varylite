import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Promisify ffmpeg methods
const ffprobe = promisify(ffmpeg.ffprobe);

export interface VideoInfo {
  width: number;
  height: number;
  aspectRatio: number;
  duration: number;
  format: string;
}

export interface CropOptions {
  targetRatio: number;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Get video information including dimensions and aspect ratio
 */
export async function getVideoInfo(videoPath: string): Promise<VideoInfo> {
  try {
    const metadata = await ffprobe(videoPath) as any;
    const videoStream = metadata.streams?.find((stream: any) => stream.codec_type === 'video');
    
    if (!videoStream || !videoStream.width || !videoStream.height) {
      throw new Error('Could not determine video dimensions');
    }

    const aspectRatio = videoStream.width / videoStream.height;
    
    return {
      width: videoStream.width,
      height: videoStream.height,
      aspectRatio,
      duration: parseFloat(videoStream.duration || '0'),
      format: videoStream.codec_name || 'unknown'
    };
  } catch (error) {
    console.error('Error getting video info:', error);
    throw new Error(`Failed to analyze video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Crop video to a valid aspect ratio for Runway
 */
export async function cropVideoToValidRatio(
  inputPath: string, 
  options: CropOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = join(tmpdir(), `cropped_${Date.now()}.mp4`);
    
    console.log(`🎬 Cropping video from ${inputPath} to ${outputPath}`);
    console.log(`📐 Target aspect ratio: ${options.targetRatio}`);
    
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',
        '-crf 23',
        '-movflags +faststart'
      ])
      .size(`${options.maxWidth || 1280}x${options.maxHeight || 720}`)
      .aspectRatio(options.targetRatio)
      .on('start', (commandLine) => {
        console.log('🔄 FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        console.log(`📊 Cropping progress: ${Math.round(progress.percent || 0)}%`);
      })
      .on('end', () => {
        console.log('✅ Video cropping completed');
        resolve(outputPath);
      })
      .on('error', (error) => {
        console.error('❌ Video cropping failed:', error);
        reject(new Error(`Video cropping failed: ${error.message}`));
      })
      .save(outputPath);
  });
}

/**
 * Process video to ensure it meets Runway's aspect ratio requirements
 */
export async function processVideoForRunway(inputPath: string): Promise<string> {
  try {
    console.log('🔍 Analyzing video for Runway compatibility...');
    
    // Get video information
    const videoInfo = await getVideoInfo(inputPath);
    console.log(`📊 Video info: ${videoInfo.width}x${videoInfo.height} (ratio: ${videoInfo.aspectRatio.toFixed(3)})`);
    
    // Check if aspect ratio is valid for Runway (0.5 to 2.0)
    if (videoInfo.aspectRatio >= 0.5 && videoInfo.aspectRatio <= 2.0) {
      console.log('✅ Video aspect ratio is already valid for Runway');
      return inputPath;
    }
    
    // Determine target aspect ratio
    let targetRatio: number;
    if (videoInfo.aspectRatio < 0.5) {
      targetRatio = 0.5; // Too narrow, make it 0.5:1
      console.log('⚠️ Video is too narrow, cropping to 0.5:1 ratio');
    } else if (videoInfo.aspectRatio > 2.0) {
      targetRatio = 2.0; // Too wide, make it 2.0:1
      console.log('⚠️ Video is too wide, cropping to 2.0:1 ratio');
    } else {
      targetRatio = videoInfo.aspectRatio;
    }
    
    // Crop the video
    const croppedPath = await cropVideoToValidRatio(inputPath, {
      targetRatio,
      maxWidth: 1280,
      maxHeight: 720
    });
    
    console.log('✅ Video processed successfully for Runway');
    return croppedPath;
    
  } catch (error) {
    console.error('❌ Video processing failed:', error);
    
    // If video processing fails, return original path and let Runway handle it
    // This provides a fallback in case FFmpeg has issues
    console.log('⚠️ Falling back to original video - Runway may reject it');
    return inputPath;
  }
}

/**
 * Clean up temporary video files
 */
export function cleanupTempVideo(filePath: string): void {
  try {
    if (filePath.includes('cropped_') && filePath.includes(tmpdir())) {
      unlinkSync(filePath);
      console.log('🗑️ Cleaned up temporary video file');
    }
  } catch (error) {
    console.warn('⚠️ Could not clean up temporary file:', error);
  }
}

/**
 * Convert base64 video to temporary file
 */
export function base64ToTempFile(base64Data: string, mimeType: string): string {
  const buffer = Buffer.from(base64Data, 'base64');
  const tempPath = join(tmpdir(), `temp_video_${Date.now()}.${mimeType.split('/')[1]}`);
  writeFileSync(tempPath, buffer);
  console.log(`📁 Created temporary video file: ${tempPath}`);
  return tempPath;
}
