import { describe, it, expect } from '@jest/globals';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
  isAppError,
  getErrorMessage,
  getErrorCode,
  getErrorStatusCode,
} from '../../../core/errors';

describe('Error Classes', () => {
  it('should create AppError with correct properties', () => {
    const error = new AppError('Test error', 'TEST_ERROR', 400);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('AppError');
  });

  it('should create ValidationError with correct properties', () => {
    const error = new ValidationError('Validation failed');
    expect(error.message).toBe('Validation failed');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
  });

  it('should create AuthenticationError with correct properties', () => {
    const error = new AuthenticationError();
    expect(error.message).toBe('Authentication required');
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.statusCode).toBe(401);
  });

  it('should create AuthorizationError with correct properties', () => {
    const error = new AuthorizationError();
    expect(error.message).toBe('Insufficient permissions');
    expect(error.code).toBe('AUTHORIZATION_ERROR');
    expect(error.statusCode).toBe(403);
  });

  it('should create NotFoundError with correct properties', () => {
    const error = new NotFoundError();
    expect(error.message).toBe('Resource not found');
    expect(error.code).toBe('NOT_FOUND_ERROR');
    expect(error.statusCode).toBe(404);
  });

  it('should create ConflictError with correct properties', () => {
    const error = new ConflictError();
    expect(error.message).toBe('Resource conflict');
    expect(error.code).toBe('CONFLICT_ERROR');
    expect(error.statusCode).toBe(409);
  });

  it('should create RateLimitError with correct properties', () => {
    const error = new RateLimitError();
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.code).toBe('RATE_LIMIT_ERROR');
    expect(error.statusCode).toBe(429);
  });

  it('should create ServerError with correct properties', () => {
    const error = new ServerError();
    expect(error.message).toBe('Internal server error');
    expect(error.code).toBe('SERVER_ERROR');
    expect(error.statusCode).toBe(500);
  });

  it('should create NetworkError with correct properties', () => {
    const error = new NetworkError();
    expect(error.message).toBe('Network error');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.statusCode).toBe(0);
  });

  it('should create TimeoutError with correct properties', () => {
    const error = new TimeoutError();
    expect(error.message).toBe('Request timeout');
    expect(error.code).toBe('TIMEOUT_ERROR');
    expect(error.statusCode).toBe(408);
  });
});

describe('Error Utilities', () => {
  it('should identify AppError correctly', () => {
    const appError = new AppError('Test', 'TEST', 400);
    const regularError = new Error('Test');
    
    expect(isAppError(appError)).toBe(true);
    expect(isAppError(regularError)).toBe(false);
  });

  it('should get error message correctly', () => {
    const appError = new AppError('Test error', 'TEST', 400);
    const regularError = new Error('Regular error');
    const stringError = 'String error';
    const unknownError = { message: 'Unknown error' };
    
    expect(getErrorMessage(appError)).toBe('Test error');
    expect(getErrorMessage(regularError)).toBe('Regular error');
    expect(getErrorMessage(stringError)).toBe('String error');
    expect(getErrorMessage(unknownError)).toBe('An unknown error occurred');
  });

  it('should get error code correctly', () => {
    const appError = new AppError('Test', 'TEST_ERROR', 400);
    const regularError = new Error('Test');
    
    expect(getErrorCode(appError)).toBe('TEST_ERROR');
    expect(getErrorCode(regularError)).toBe('UNKNOWN_ERROR');
  });

  it('should get error status code correctly', () => {
    const appError = new AppError('Test', 'TEST', 400);
    const regularError = new Error('Test');
    
    expect(getErrorStatusCode(appError)).toBe(400);
    expect(getErrorStatusCode(regularError)).toBe(500);
  });
});
