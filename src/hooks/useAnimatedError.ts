import { useState, useCallback } from 'react';

export type ErrorType = 'farting-man' | 'mortal-kombat' | 'bouncing-error' | 'shake-error';

interface AnimatedError {
  id: string;
  message: string;
  type: ErrorType;
  timestamp: number;
}

export const useAnimatedError = () => {
  const [errors, setErrors] = useState<AnimatedError[]>([]);

  const showError = useCallback((message: string, type: ErrorType = 'farting-man') => {
    const id = `error-${Date.now()}-${Math.random()}`;
    const newError: AnimatedError = {
      id,
      message,
      type,
      timestamp: Date.now()
    };

    setErrors(prev => [...prev, newError]);
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Auto-remove errors after 5 seconds
  const autoRemoveError = useCallback((id: string) => {
    setTimeout(() => {
      removeError(id);
    }, 5000);
  }, [removeError]);

  return {
    errors,
    showError,
    removeError,
    clearAllErrors,
    autoRemoveError
  };
};
