export interface ValidationRule<T = any> {
  validate(_value: T): ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class RequiredRule implements ValidationRule<any> {
  validate(value: any): ValidationResult {
    const isValid = value !== null && value !== undefined && value !== '';
    return {
      isValid,
      errors: isValid ? [] : ['This field is required'],
    };
  }
}

export class MinLengthRule implements ValidationRule<string> {
  constructor(private _minLength: number) {}
  
  validate(value: string): ValidationResult {
    const isValid = value.length >= this._minLength;
    return {
      isValid,
      errors: isValid ? [] : [`Minimum length is ${this._minLength} characters`],
    };
  }
}

export class MaxLengthRule implements ValidationRule<string> {
  constructor(private _maxLength: number) {}
  
  validate(value: string): ValidationResult {
    const isValid = value.length <= this._maxLength;
    return {
      isValid,
      errors: isValid ? [] : [`Maximum length is ${this._maxLength} characters`],
    };
  }
}

export class EmailRule implements ValidationRule<string> {
  validate(value: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(value);
    return {
      isValid,
      errors: isValid ? [] : ['Invalid email format'],
    };
  }
}

export class MinValueRule implements ValidationRule<number> {
  constructor(private _minValue: number) {}
  
  validate(value: number): ValidationResult {
    const isValid = value >= this._minValue;
    return {
      isValid,
      errors: isValid ? [] : [`Minimum value is ${this._minValue}`],
    };
  }
}

export class MaxValueRule implements ValidationRule<number> {
  constructor(private _maxValue: number) {}
  
  validate(value: number): ValidationResult {
    const isValid = value <= this._maxValue;
    return {
      isValid,
      errors: isValid ? [] : [`Maximum value is ${this._maxValue}`],
    };
  }
}

export class PatternRule implements ValidationRule<string> {
  private pattern: RegExp;
  private _message: string;
  
  constructor(pattern: RegExp, message: string) {
    this.pattern = pattern;
    this._message = message;
  }
  
  validate(value: string): ValidationResult {
    const isValid = this.pattern.test(value);
    return {
      isValid,
      errors: isValid ? [] : [this._message],
    };
  }
}

export class Validator<T = any> {
  private rules: ValidationRule<T>[] = [];

  addRule(rule: ValidationRule<T>): Validator<T> {
    this.rules.push(rule);
    return this;
  }

  validate(value: T): ValidationResult {
    const errors: string[] = [];
    
    for (const rule of this.rules) {
      const result = rule.validate(value);
      if (!result.isValid) {
        errors.push(...result.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const createValidator = <T = any>(): Validator<T> => {
  return new Validator<T>();
};
