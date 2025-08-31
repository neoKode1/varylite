export interface CharacterVariationRequest {
  images: string[]; // array of base64 encoded images
  prompt: string; // user's angle/pose variation prompt
}

export interface CharacterVariation {
  id: string;
  description: string;
  angle: string;
  pose: string;
  imageUrl?: string; // URL to the generated image
}

export interface CharacterVariationResponse {
  success: boolean;
  variations?: CharacterVariation[];
  error?: string;
}

export interface UploadedImage {
  file: File;
  preview: string;
  base64: string;
  type: 'face' | 'body' | 'reference'; // Image type for better processing
}

export interface MultiImageUpload {
  faceShot?: UploadedImage;
  bodyShot?: UploadedImage;
  referenceImages: UploadedImage[];
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
}