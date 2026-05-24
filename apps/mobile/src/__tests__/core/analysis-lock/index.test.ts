import { describe, it, expect, beforeEach } from '@jest/globals';
import { AnalysisLockManager } from '../../../core/analysis-lock';

describe('AnalysisLockManager', () => {
  let lockManager: AnalysisLockManager;

  beforeEach(() => {
    lockManager = new AnalysisLockManager(1000); // 1 second TTL
  });

  it('should generate lock key', () => {
    const key = lockManager.generateLockKey('user1', 'hash1');
    expect(key).toBe('user1:hash1');
  });

  it('should acquire lock', () => {
    const result = lockManager.acquireLock('user1', 'hash1');
    expect(result).toBe(true);
  });

  it('should not acquire lock if already locked', () => {
    lockManager.acquireLock('user1', 'hash1');
    const result = lockManager.acquireLock('user1', 'hash1');
    expect(result).toBe(false);
  });

  it('should release lock', () => {
    lockManager.acquireLock('user1', 'hash1');
    lockManager.releaseLock('user1', 'hash1');
    const result = lockManager.acquireLock('user1', 'hash1');
    expect(result).toBe(true);
  });

  it('should check if locked', () => {
    expect(lockManager.isLocked('user1', 'hash1')).toBe(false);
    lockManager.acquireLock('user1', 'hash1');
    expect(lockManager.isLocked('user1', 'hash1')).toBe(true);
  });

  it('should get lock info', () => {
    lockManager.acquireLock('user1', 'hash1');
    const lockInfo = lockManager.getLockInfo('user1', 'hash1');
    expect(lockInfo).not.toBeNull();
    expect(lockInfo?.userId).toBe('user1');
    expect(lockInfo?.imageHash).toBe('hash1');
  });

  it('should cleanup expired locks', () => {
    lockManager.acquireLock('user1', 'hash1');
    
    // Wait for lock to expire
    setTimeout(() => {
      lockManager.cleanup();
      expect(lockManager.isLocked('user1', 'hash1')).toBe(false);
    }, 1100);
  });

  it('should get all locks', () => {
    lockManager.acquireLock('user1', 'hash1');
    lockManager.acquireLock('user2', 'hash2');
    const locks = lockManager.getAllLocks();
    expect(locks).toHaveLength(2);
  });
});
