import { describe, it, expect, beforeEach } from '@jest/globals';
import { OfflineQueue } from '../../../core/offline-queue';

describe('OfflineQueue', () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    queue = new OfflineQueue();
  });

  it('should add item to queue', () => {
    const id = queue.add('test-action', { test: 'data' });
    expect(id).toBeDefined();
    expect(queue.getItems()).toHaveLength(1);
  });

  it('should add item with priority', () => {
    queue.add('action1', { test: 'data1' }, 1);
    queue.add('action2', { test: 'data2' }, 2);
    queue.add('action3', { test: 'data3' }, 0);

    const items = queue.getItems();
    expect(items[0].action).toBe('action2'); // Highest priority
    expect(items[1].action).toBe('action1');
    expect(items[2].action).toBe('action3');
  });

  it('should remove item from queue', () => {
    const id = queue.add('test-action', { test: 'data' });
    expect(queue.remove(id)).toBe(true);
    expect(queue.getItems()).toHaveLength(0);
  });

  it('should return false when removing non-existent item', () => {
    expect(queue.remove('non-existent-id')).toBe(false);
  });

  it('should get item by id', () => {
    const id = queue.add('test-action', { test: 'data' });
    const item = queue.getItem(id);
    expect(item).toBeDefined();
    expect(item?.action).toBe('test-action');
    expect(item?.payload).toEqual({ test: 'data' });
  });

  it('should return undefined for non-existent item', () => {
    const item = queue.getItem('non-existent-id');
    expect(item).toBeUndefined();
  });

  it('should clear queue', () => {
    queue.add('action1', { test: 'data1' });
    queue.add('action2', { test: 'data2' });
    queue.clear();
    expect(queue.getItems()).toHaveLength(0);
  });

  it('should process queue successfully', async () => {
    const processor = jest.fn().mockResolvedValue(true);
    queue.add('action1', { test: 'data1' });
    queue.add('action2', { test: 'data2' });

    await queue.processQueue(processor);
    expect(processor).toHaveBeenCalledTimes(2);
    expect(queue.getItems()).toHaveLength(0);
  });

  it('should retry failed items', async () => {
    const processor = jest.fn()
      .mockResolvedValueOnce(false) // First call fails
      .mockResolvedValueOnce(true); // Second call succeeds

    queue.add('action1', { test: 'data1' });
    await queue.processQueue(processor);
    
    expect(processor).toHaveBeenCalledTimes(2);
    expect(queue.getItems()).toHaveLength(0);
  });

  it('should remove item after max retries', async () => {
    const processor = jest.fn().mockResolvedValue(false);
    queue.setMaxRetries(2);
    
    queue.add('action1', { test: 'data1' });
    await queue.processQueue(processor);
    
    expect(processor).toHaveBeenCalledTimes(3); // Initial + 2 retries
    expect(queue.getItems()).toHaveLength(0);
  });

  it('should set max retries', () => {
    queue.setMaxRetries(5);
    expect(queue.getItems()).toHaveLength(0);
  });

  it('should set retry delay', () => {
    queue.setRetryDelay(2000);
    expect(queue.getItems()).toHaveLength(0);
  });
});
