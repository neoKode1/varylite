export interface CharacterVariationRequest {
  image: string; // base64 encoded image
  prompt: string; // user's angle/pose variation prompt
}

export interface CharacterVariation {
  id: string;
  description: string;
  angle: string;
  pose: string;
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
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
}