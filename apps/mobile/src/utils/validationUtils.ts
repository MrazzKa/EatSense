export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateDate = (date: string): boolean => {
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

export const validateAge = (age: number): boolean => {
  return age >= 0 && age <= 150;
};

export const validateWeight = (weight: number): boolean => {
  return weight > 0 && weight <= 1000;
};

export const validateHeight = (height: number): boolean => {
  return height > 0 && height <= 300;
};

export const validateCalories = (calories: number): boolean => {
  return calories >= 0 && calories <= 10000;
};

export const validateMacros = (macros: { protein: number; fat: number; carbs: number }): boolean => {
  const { protein, fat, carbs } = macros;
  return protein >= 0 && fat >= 0 && carbs >= 0 && 
         protein <= 1000 && fat <= 1000 && carbs <= 1000;
};

export const validatePortion = (portion: number): boolean => {
  return portion > 0 && portion <= 10000;
};

export const validateImageFile = (file: File): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('File must be an image (JPEG, PNG, GIF, or WebP)');
  }
  
  if (file.size > maxSize) {
    errors.push('File size must be less than 10MB');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateForm = (data: Record<string, any>, rules: Record<string, any>): { isValid: boolean; errors: Record<string, string[]> } => {
  const errors: Record<string, string[]> = {};
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    const fieldErrors: string[] = [];
    
    if (rule.required && (value === undefined || value === null || value === '')) {
      fieldErrors.push(`${field} is required`);
    }
    
    if (value !== undefined && value !== null && value !== '') {
      if (rule.type === 'email' && !validateEmail(value)) {
        fieldErrors.push(`${field} must be a valid email`);
      }
      
      if (rule.type === 'password' && !validatePassword(value).isValid) {
        fieldErrors.push(...validatePassword(value).errors);
      }
      
      if (rule.type === 'phone' && !validatePhone(value)) {
        fieldErrors.push(`${field} must be a valid phone number`);
      }
      
      if (rule.type === 'url' && !validateUrl(value)) {
        fieldErrors.push(`${field} must be a valid URL`);
      }
      
      if (rule.type === 'date' && !validateDate(value)) {
        fieldErrors.push(`${field} must be a valid date`);
      }
      
      if (rule.type === 'number' && typeof value !== 'number') {
        fieldErrors.push(`${field} must be a number`);
      }
      
      if (rule.type === 'string' && typeof value !== 'string') {
        fieldErrors.push(`${field} must be a string`);
      }
      
      if (rule.min && value < rule.min) {
        fieldErrors.push(`${field} must be at least ${rule.min}`);
      }
      
      if (rule.max && value > rule.max) {
        fieldErrors.push(`${field} must be at most ${rule.max}`);
      }
      
      if (rule.minLength && value.length < rule.minLength) {
        fieldErrors.push(`${field} must be at least ${rule.minLength} characters long`);
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        fieldErrors.push(`${field} must be at most ${rule.maxLength} characters long`);
      }
      
      if (rule.pattern && !rule.pattern.test(value)) {
        fieldErrors.push(`${field} format is invalid`);
      }
    }
    
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};