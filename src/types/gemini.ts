export interface CharacterVariationRequest {
  images: string[]; // array of base64 encoded images
  mimeTypes?: string[]; // array of MIME types for each image
  prompt: string; // user's angle/pose variation prompt
  useFluxDev?: boolean; // flag to use Flux Dev as fallback instead of Nano Banana
  useSeedream4?: boolean; // flag to use Seedream 4 instead of Nano Banana
  generationMode?: string; // the selected generation mode (e.g., 'seedream-4-edit', 'gemini-25-flash-image-edit')
  generationSettings?: {
    aspectRatio?: string;
    guidanceScale?: number;
    strength?: number;
    seed?: number;
    duration?: number;
    resolution?: string;
    outputFormat?: string;
    styleConsistency?: boolean;
    characterSeparation?: number;
    spatialAwareness?: boolean;
    numImages?: number;
  };
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

// User Unlocked Models Types
export interface UserUnlockedModel {
  id: string;
  user_id: string;
  model_name: string;
  unlocked_at: string;
  created_at: string;
}

export interface UnlockModelRequest {
  modelName: string;
}

export interface UnlockModelResponse {
  success: boolean;
  message?: string;
  unlockData?: UserUnlockedModel;
  alreadyUnlocked?: boolean;
  error?: string;
}

export interface GetUnlockedModelsResponse {
  success: boolean;
  unlockedModels: Array<{
    model_name: string;
    unlocked_at: string;
  }>;
  error?: string;
}