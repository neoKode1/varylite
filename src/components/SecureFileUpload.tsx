'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UploadedFile {
  file: File;
  fileType: 'image' | 'video' | 'audio';
  preview: string;
  falUrl?: string;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface SecureFileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
}

const SecureFileUpload: React.FC<SecureFileUploadProps> = ({
  onFilesChange,
  maxFiles = 5,
  acceptedTypes = ['image/*', 'video/*', 'audio/*'],
  className = ''
}) => {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : // 10MB for images
                   file.type.startsWith('video/') ? 100 * 1024 * 1024 : // 100MB for videos
                   50 * 1024 * 1024; // 50MB for audio
    
    if (file.size > maxSize) {
      return `File too large: ${file.name} (max ${maxSize / (1024 * 1024)}MB)`;
    }

    // Check file type
    const isValidType = file.type.startsWith('image/') || 
                       file.type.startsWith('video/') || 
                       file.type.startsWith('audio/');
    
    if (!isValidType) {
      return `Unsupported file type: ${file.type}`;
    }

    return null;
  }, []);

  const validateAudioDuration = useCallback(async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('audio/')) {
      return null; // Not an audio file, no validation needed
    }

    return new Promise((resolve) => {
      const audio = new Audio();
      const audioUrl = URL.createObjectURL(file);
      
      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('error', onError);
      };

      const onLoadedMetadata = () => {
        cleanup();
        const duration = audio.duration;
        if (duration > 10) {
          resolve(`Audio too long: ${file.name} (${duration.toFixed(1)}s, max 10s)`);
        } else {
          resolve(null); // Valid duration
        }
      };

      const onError = () => {
        cleanup();
        resolve(null); // If we can't validate, allow the upload
      };

      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('error', onError);
      audio.src = audioUrl;
    });
  }, []);

  const uploadFileToFal = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/fal/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();
    return result.url;
  }, []);

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!user) {
      alert('Please sign in to upload files');
      return;
    }

    if (uploadedFiles.length + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsUploading(true);
    const newFiles: UploadedFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file
        const validationError = validateFile(file);
        if (validationError) {
          console.error('❌ File validation failed:', validationError);
          continue;
        }

        // Validate audio duration for Kling Avatar (10 seconds max)
        const audioDurationError = await validateAudioDuration(file);
        if (audioDurationError) {
          console.error('❌ Audio duration validation failed:', audioDurationError);
          alert(audioDurationError); // Show user-friendly error
          continue;
        }

        const uploadedFile: UploadedFile = {
          file,
          fileType: file.type.startsWith('image/') ? 'image' : 
                   file.type.startsWith('video/') ? 'video' : 'audio',
          preview: URL.createObjectURL(file),
          uploadStatus: 'pending'
        };

        newFiles.push(uploadedFile);
      }

      // Update state with new files
      const updatedFiles = [...uploadedFiles, ...newFiles];
      setUploadedFiles(updatedFiles);
      onFilesChange(updatedFiles);

      // Upload files to Fal.ai in parallel
      const uploadPromises = newFiles.map(async (uploadedFile, index) => {
        try {
          // Update status to uploading
          setUploadedFiles(prev => prev.map((f, i) => 
            f === uploadedFile ? { ...f, uploadStatus: 'uploading' } : f
          ));

          const falUrl = await uploadFileToFal(uploadedFile.file);
          
          // Update status to success
          setUploadedFiles(prev => prev.map((f, i) => 
            f === uploadedFile ? { ...f, uploadStatus: 'success', falUrl } : f
          ));

          console.log(`✅ File uploaded successfully: ${uploadedFile.file.name}`);
        } catch (error) {
          console.error(`❌ Upload failed for ${uploadedFile.file.name}:`, error);
          
          // Update status to error
          setUploadedFiles(prev => prev.map((f, i) => 
            f === uploadedFile ? { 
              ...f, 
              uploadStatus: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed' 
            } : f
          ));
        }
      });

      await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsUploading(false);
    }
  }, [user, uploadedFiles, maxFiles, validateFile, uploadFileToFal, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const removeFile = useCallback((fileIndex: number) => {
    setUploadedFiles(prev => {
      const file = prev[fileIndex];
      if (file && file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      const newFiles = prev.filter((_, index) => index !== fileIndex);
      onFilesChange(newFiles);
      return newFiles;
    });
  }, [onFilesChange]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const getStatusIcon = (status: UploadedFile['uploadStatus']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'uploading': return '📤';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: UploadedFile['uploadStatus']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'uploading': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="text-4xl">📁</div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isUploading ? 'Uploading files...' : 'Drop files here or click to upload'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Images (10MB), Videos (100MB), Audio (50MB)
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {uploadedFiles.length}/{maxFiles} files uploaded
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Uploaded Files</h3>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {file.fileType === 'image' ? '🖼️' : 
                     file.fileType === 'video' ? '🎥' : '🎵'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${getStatusColor(file.uploadStatus)}`}>
                    {getStatusIcon(file.uploadStatus)}
                  </span>
                  {file.uploadStatus === 'error' && file.error && (
                    <span className="text-xs text-red-600 max-w-32 truncate" title={file.error}>
                      {file.error}
                    </span>
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureFileUpload;
