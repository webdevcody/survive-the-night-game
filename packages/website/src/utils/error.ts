interface ValidationError {
  code: string;
  path: string[];
  message: string;
  format?: string;
}

/**
 * Formats backend validation errors into user-friendly messages
 */
export function formatValidationErrors(errorMessage: string): string {
  try {
    // Try to parse the error message as JSON array
    const errors: ValidationError[] = JSON.parse(errorMessage);
    
    if (!Array.isArray(errors) || errors.length === 0) {
      return errorMessage;
    }

    // Format each error with field name and message
    const formattedErrors = errors.map(error => {
      const fieldName = error.path.length > 0 
        ? error.path.join('.').replace(/([A-Z])/g, ' $1').toLowerCase()
        : 'field';
      
      return `${fieldName}: ${error.message}`;
    });

    return formattedErrors.join(', ');
  } catch {
    // If parsing fails, return the original error message
    return errorMessage;
  }
}

/**
 * Extracts a user-friendly error message from various error formats
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return formatValidationErrors(error);
  }
  
  if (error instanceof Error) {
    return formatValidationErrors(error.message);
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return formatValidationErrors(String(error.message));
  }
  
  return 'An unexpected error occurred. Please try again.';
}