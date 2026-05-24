import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConsoleAnalyticsAdapter } from '../../../core/adapters/analytics-adapter';

describe('ConsoleAnalyticsAdapter', () => {
  let analyticsAdapter: ConsoleAnalyticsAdapter;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    analyticsAdapter = new ConsoleAnalyticsAdapter();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should track event', () => {
    analyticsAdapter.track({
      name: 'test-event',
      properties: { test: 'data' },
    });

    expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', expect.objectContaining({
      name: 'test-event',
      properties: { test: 'data' },
    }));
  });

  it('should track screen view', () => {
    analyticsAdapter.trackScreenView('test-screen', { test: 'data' });

    expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', expect.objectContaining({
      name: 'screen_view',
      properties: {
        screen_name: 'test-screen',
        test: 'data',
      },
    }));
  });

  it('should track user action', () => {
    analyticsAdapter.trackUserAction('test-action', { test: 'data' });

    expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', expect.objectContaining({
      name: 'user_action',
      properties: {
        action: 'test-action',
        test: 'data',
      },
    }));
  });

  it('should track error', () => {
    analyticsAdapter.trackError('test-error', { test: 'data' });

    expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', expect.objectContaining({
      name: 'error',
      properties: {
        error: 'test-error',
        test: 'data',
      },
    }));
  });

  it('should set user properties', () => {
    analyticsAdapter.setUserProperties({ userId: '123', name: 'Test User' });
    analyticsAdapter.track({ name: 'test-event' });

    expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', expect.objectContaining({
      userProperties: { userId: '123', name: 'Test User' },
    }));
  });

  it('should set user ID', () => {
    analyticsAdapter.setUserId('123');
    analyticsAdapter.track({ name: 'test-event' });

    expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', expect.objectContaining({
      userId: '123',
    }));
  });
});
