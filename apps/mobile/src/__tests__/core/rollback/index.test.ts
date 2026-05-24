import { describe, it, expect, beforeEach } from '@jest/globals';
import { RollbackManager } from '../../../core/rollback';

describe('RollbackManager', () => {
  let rollbackManager: RollbackManager;

  beforeEach(() => {
    rollbackManager = new RollbackManager(10); // Max 10 actions
  });

  it('should add action', () => {
    const id = rollbackManager.addAction('test-action', { test: 'data' }, async () => {});
    expect(id).toBeDefined();
    expect(rollbackManager.getActions()).toHaveLength(1);
  });

  it('should rollback to specific action', async () => {
    const rollback1 = jest.fn();
    const rollback2 = jest.fn();
    const rollback3 = jest.fn();
    
    rollbackManager.addAction('action1', { test: 'data1' }, rollback1);
    const id2 = rollbackManager.addAction('action2', { test: 'data2' }, rollback2);
    rollbackManager.addAction('action3', { test: 'data3' }, rollback3);
    
    await rollbackManager.rollbackTo(id2);
    
    expect(rollback3).toHaveBeenCalledTimes(1);
    expect(rollback2).toHaveBeenCalledTimes(1);
    expect(rollback1).not.toHaveBeenCalled();
    expect(rollbackManager.getActions()).toHaveLength(1);
  });

  it('should rollback last action', async () => {
    const rollback1 = jest.fn();
    const rollback2 = jest.fn();
    
    rollbackManager.addAction('action1', { test: 'data1' }, rollback1);
    rollbackManager.addAction('action2', { test: 'data2' }, rollback2);
    
    await rollbackManager.rollbackLast();
    
    expect(rollback2).toHaveBeenCalledTimes(1);
    expect(rollback1).not.toHaveBeenCalled();
    expect(rollbackManager.getActions()).toHaveLength(1);
  });

  it('should rollback all actions', async () => {
    const rollback1 = jest.fn();
    const rollback2 = jest.fn();
    const rollback3 = jest.fn();
    
    rollbackManager.addAction('action1', { test: 'data1' }, rollback1);
    rollbackManager.addAction('action2', { test: 'data2' }, rollback2);
    rollbackManager.addAction('action3', { test: 'data3' }, rollback3);
    
    await rollbackManager.rollbackAll();
    
    expect(rollback1).toHaveBeenCalledTimes(1);
    expect(rollback2).toHaveBeenCalledTimes(1);
    expect(rollback3).toHaveBeenCalledTimes(1);
    expect(rollbackManager.getActions()).toHaveLength(0);
  });

  it('should get action by id', () => {
    const id = rollbackManager.addAction('test-action', { test: 'data' }, async () => {});
    const action = rollbackManager.getAction(id);
    
    expect(action).toBeDefined();
    expect(action?.action).toBe('test-action');
    expect(action?.payload).toEqual({ test: 'data' });
  });

  it('should return undefined for non-existent action', () => {
    const action = rollbackManager.getAction('non-existent-id');
    expect(action).toBeUndefined();
  });

  it('should clear all actions', () => {
    rollbackManager.addAction('action1', { test: 'data1' }, async () => {});
    rollbackManager.addAction('action2', { test: 'data2' }, async () => {});
    
    expect(rollbackManager.getActions()).toHaveLength(2);
    
    rollbackManager.clear();
    expect(rollbackManager.getActions()).toHaveLength(0);
  });

  it('should limit max actions', () => {
    rollbackManager.setMaxActions(3);
    
    rollbackManager.addAction('action1', { test: 'data1' }, async () => {});
    rollbackManager.addAction('action2', { test: 'data2' }, async () => {});
    rollbackManager.addAction('action3', { test: 'data3' }, async () => {});
    rollbackManager.addAction('action4', { test: 'data4' }, async () => {});
    
    const actions = rollbackManager.getActions();
    expect(actions).toHaveLength(3);
    expect(actions[0].action).toBe('action2'); // First action should be removed
    expect(actions[1].action).toBe('action3');
    expect(actions[2].action).toBe('action4');
  });

  it('should handle rollback errors gracefully', async () => {
    const rollback1 = jest.fn().mockRejectedValue(new Error('Rollback failed'));
    const rollback2 = jest.fn();
    
    rollbackManager.addAction('action1', { test: 'data1' }, rollback1);
    rollbackManager.addAction('action2', { test: 'data2' }, rollback2);
    
    await rollbackManager.rollbackAll();
    
    expect(rollback1).toHaveBeenCalledTimes(1);
    expect(rollback2).toHaveBeenCalledTimes(1);
  });
});
