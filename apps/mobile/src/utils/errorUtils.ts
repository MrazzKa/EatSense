export interface AppError {
  code: string;
  message: string;
  details?: any;
}

export const createError = (code: string, message: string, details?: any): AppError => {
  return {
    code,
    message,
    details,
  };
};

export const isNetworkError = (error: any): boolean => {
  return error.code === 'NETWORK_ERROR' || 
         error.message?.includes('Network Error') ||
         error.message?.includes('fetch');
};

export const isAuthError = (error: any): boolean => {
  return error.code === 'AUTH_ERROR' || 
         error.status === 401 ||
         error.message?.includes('Unauthorized');
};

export const isValidationError = (error: any): boolean => {
  return error.code === 'VALIDATION_ERROR' || 
         error.status === 400 ||
         error.message?.includes('validation');
};

export const isServerError = (error: any): boolean => {
  return error.status >= 500 || 
         error.code === 'SERVER_ERROR';
};

export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.code) {
    return `Error: ${error.code}`;
  }
  
  return 'An unknown error occurred';
};

export const getErrorCode = (error: any): string => {
  if (error?.code) {
    return error.code;
  }
  
  if (error?.status) {
    return `HTTP_${error.status}`;
  }
  
  return 'UNKNOWN_ERROR';
};

export const logError = (error: any, context?: string): void => {
  console.error(`[${context || 'App'}] Error:`, {
    code: getErrorCode(error),
    message: getErrorMessage(error),
    details: error,
  });
};