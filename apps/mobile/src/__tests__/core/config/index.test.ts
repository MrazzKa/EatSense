import { describe, it, expect } from '@jest/globals';
import { ConfigManager, defaultConfig } from '../../../core/config';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  it('should use default config', () => {
    const config = configManager.getAll();
    expect(config).toEqual(defaultConfig);
  });

  it('should get config value', () => {
    const apiConfig = configManager.get('api');
    expect(apiConfig).toEqual(defaultConfig.api);
  });

  it('should set config value', () => {
    configManager.set('api', { ...defaultConfig.api, timeout: 5000 });
    const apiConfig = configManager.get('api');
    expect(apiConfig.timeout).toBe(5000);
  });

  it('should update config', () => {
    configManager.update({
      api: { ...defaultConfig.api, timeout: 5000 },
      cache: { ...defaultConfig.cache, defaultTTL: 10000 },
    });

    const apiConfig = configManager.get('api');
    const cacheConfig = configManager.get('cache');
    expect(apiConfig.timeout).toBe(5000);
    expect(cacheConfig.defaultTTL).toBe(10000);
  });

  it('should have correct default values', () => {
    const config = configManager.getAll();
    expect(config.api.baseUrl).toBe('http://192.168.3.6:3000');
    expect(config.api.timeout).toBe(10000);
    expect(config.cache.defaultTTL).toBe(5 * 60 * 1000);
    expect(config.analysis.maxImageSize).toBe(10 * 1024 * 1024);
    expect(config.features.offlineMode).toBe(true);
    expect(config.features.aiAnalysis).toBe(true);
    expect(config.features.usdaIntegration).toBe(true);
  });
});
