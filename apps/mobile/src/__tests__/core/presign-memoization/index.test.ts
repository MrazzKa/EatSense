import { describe, it, expect, beforeEach } from '@jest/globals';
import { PresignMemoization } from '../../../core/presign-memoization';

describe('PresignMemoization', () => {
  let presignMemo: PresignMemoization;

  beforeEach(() => {
    presignMemo = new PresignMemoization(1000); // 1 second TTL
  });

  it('should generate key correctly', () => {
    const key = presignMemo.generateKey('bucket1', 'key1', 'getObject');
    expect(key).toBe('bucket1:key1:getObject');
  });

  it('should set and get presigned URL', () => {
    const url = 'https://example.com/presigned-url';
    const expiresAt = new Date(Date.now() + 5000);
    
    presignMemo.set('bucket1', 'key1', 'getObject', url, expiresAt);
    const result = presignMemo.get('bucket1', 'key1', 'getObject');
    
    expect(result).toEqual({ url, expiresAt });
  });

  it('should return null for non-existent key', () => {
    const result = presignMemo.get('bucket1', 'key1', 'getObject');
    expect(result).toBeNull();
  });

  it('should return null for expired URL', () => {
    const url = 'https://example.com/presigned-url';
    const expiresAt = new Date(Date.now() - 1000); // Expired
    
    presignMemo.set('bucket1', 'key1', 'getObject', url, expiresAt);
    const result = presignMemo.get('bucket1', 'key1', 'getObject');
    
    expect(result).toBeNull();
  });

  it('should check if URL exists', () => {
    const url = 'https://example.com/presigned-url';
    const expiresAt = new Date(Date.now() + 5000);
    
    expect(presignMemo.has('bucket1', 'key1', 'getObject')).toBe(false);
    
    presignMemo.set('bucket1', 'key1', 'getObject', url, expiresAt);
    expect(presignMemo.has('bucket1', 'key1', 'getObject')).toBe(true);
  });

  it('should delete URL', () => {
    const url = 'https://example.com/presigned-url';
    const expiresAt = new Date(Date.now() + 5000);
    
    presignMemo.set('bucket1', 'key1', 'getObject', url, expiresAt);
    expect(presignMemo.has('bucket1', 'key1', 'getObject')).toBe(true);
    
    presignMemo.delete('bucket1', 'key1', 'getObject');
    expect(presignMemo.has('bucket1', 'key1', 'getObject')).toBe(false);
  });

  it('should clear all URLs', () => {
    const url1 = 'https://example.com/presigned-url-1';
    const url2 = 'https://example.com/presigned-url-2';
    const expiresAt = new Date(Date.now() + 5000);
    
    presignMemo.set('bucket1', 'key1', 'getObject', url1, expiresAt);
    presignMemo.set('bucket2', 'key2', 'putObject', url2, expiresAt);
    
    expect(presignMemo.size()).toBe(2);
    
    presignMemo.clear();
    expect(presignMemo.size()).toBe(0);
  });

  it('should cleanup expired URLs', () => {
    const url1 = 'https://example.com/presigned-url-1';
    const url2 = 'https://example.com/presigned-url-2';
    const expiredAt = new Date(Date.now() - 1000);
    const validAt = new Date(Date.now() + 5000);
    
    presignMemo.set('bucket1', 'key1', 'getObject', url1, expiredAt);
    presignMemo.set('bucket2', 'key2', 'putObject', url2, validAt);
    
    expect(presignMemo.size()).toBe(2);
    
    presignMemo.cleanup();
    expect(presignMemo.size()).toBe(1);
    expect(presignMemo.has('bucket2', 'key2', 'putObject')).toBe(true);
  });
});
