'use client';

import { useState } from 'react';
import { Image } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  loading?: 'lazy' | 'eager';
  retryCount?: number;
}

export const ImageWithFallback = ({ 
  src, 
  alt, 
  className = '', 
  onClick, 
  loading = 'lazy',
  retryCount = 0 
}: ImageWithFallbackProps) => {
  const [imageError, setImageError] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const maxRetries = 2;

  const handleError = () => {
    console.error(`Image failed to load: ${src}`);
    
    if (retryAttempts < maxRetries) {
      // Retry loading the image
      setRetryAttempts(prev => prev + 1);
      setImageError(false);
      
      // Force reload by adding timestamp
      const retrySrc = `${src}${src.includes('?') ? '&' : '?'}retry=${Date.now()}`;
      setTimeout(() => {
        const img = document.querySelector(`img[src*="${src}"]`) as HTMLImageElement;
        if (img) {
          img.src = retrySrc;
        }
      }, 1000 * (retryAttempts + 1)); // Exponential backoff
    } else {
      setImageError(true);
    }
  };

  if (imageError) {
    return (
      <div 
        className={`${className} bg-gray-800 flex items-center justify-center`}
        onClick={onClick}
      >
        <div className="text-center text-gray-400">
          <Image className="w-8 h-8 mx-auto mb-2" />
          <div className="text-xs">Image unavailable</div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={handleError}
      loading={loading}
      onLoad={() => {
        setImageError(false);
        setRetryAttempts(0);
      }}
    />
  );
};
