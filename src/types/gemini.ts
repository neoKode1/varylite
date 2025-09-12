export interface CharacterVariationRequest {
  images: string[]; // array of base64 encoded images
  mimeTypes?: string[]; // array of MIME types for each image
  prompt: string; // user's angle/pose variation prompt
}

export interface CharacterVariation {
  id: string;
  description: string;
  angle: string;
  pose: string;
  imageUrl?: string; // URL to the generated image
  videoUrl?: string; // URL to the generated video
  fileType?: 'image' | 'video'; // Type of generated content
}

export interface CharacterVariationResponse {
  success: boolean;
  variations?: CharacterVariation[];
  error?: string;
}

export interface UploadedFile {
  file: File;
  preview: string;
  base64: string;
  mimeType?: string; // Original MIME type of the file
  type: 'face' | 'body' | 'reference'; // File type for better processing
  fileType: 'image' | 'video'; // Distinguish between images and videos
}

export interface MultiFileUpload {
  faceShot?: UploadedFile;
  bodyShot?: UploadedFile;
  referenceFiles: UploadedFile[];
}

// Legacy interface for backward compatibility
export interface UploadedImage extends UploadedFile {
  fileType: 'image';
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
}

// Runway Video Editing Types
export interface RunwayVideoRequest {
  files: string[]; // base64 encoded files
  prompt: string;
  model: 'gen4_turbo' | 'gen3a_turbo' | 'gen4_aleph' | 'gen4_image' | 'gen4_image_turbo' | 'upscale_v1' | 'act_two';
  ratio: string;
  duration?: number;
  seed?: number;
  promptText?: string;
  videoUri?: string;
  character?: {
    type: 'video' | 'image';
    uri: string;
  };
  reference?: {
    type: 'video';
    uri: string;
  };
  bodyControl?: boolean;
  expressionIntensity?: number;
  references?: Array<{
    type: 'image';
    uri: string;
  }>;
  referenceImages?: Array<{
    uri: string;
    tag?: string;
  }>;
}

export interface RunwayVideoResponse {
  success: boolean;
  taskId?: string;
  error?: string;
  retryable?: boolean;
}

export interface RunwayTaskResponse {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'THROTTLED';
  createdAt: string;
  output?: string[]; // Runway returns video URLs as an array
  error?: string;
  failure?: string; // Content moderation failure message
  failureCode?: string; // Failure code (e.g., SAFETY.INPUT.VIDEO)
}

// EndFrame API Types
export interface EndFrameRequest {
  firstImage: string; // base64 encoded first image (start frame)
  secondImage: string; // base64 encoded second image (end frame)
  prompt: string; // description of the transition
  model?: string; // model to use (default: MiniMax-Hailuo-02)
}

export interface EndFrameResponse {
  success: boolean;
  videoUrl?: string;
  taskId?: string;
  status?: string;
  error?: string;
  retryable?: boolean;
}