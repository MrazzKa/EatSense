import ApiService from '../../services/apiService';

describe('ApiService request payloads', () => {
  let requestSpy: jest.SpyInstance;

  beforeEach(() => {
    requestSpy = jest.spyOn(ApiService as any, 'request').mockResolvedValue({});
  });

  afterEach(() => {
    requestSpy.mockRestore();
  });

  const lastBody = () => JSON.parse(requestSpy.mock.calls[requestSpy.mock.calls.length - 1][1].body);

  describe('getFridgeRecipes', () => {
    it('sends at most the 20 most recent unique excluded titles', async () => {
      const titles = Array.from({ length: 35 }, (_, i) => `Recipe ${i}`);
      await ApiService.getFridgeRecipes(['egg'], 'en', { excludeTitles: [...titles, 'Recipe 34', '  ', ''] });

      const body = lastBody();
      expect(body.excludeTitles).toHaveLength(20);
      expect(body.excludeTitles[0]).toBe('Recipe 15');
      expect(body.excludeTitles[19]).toBe('Recipe 34');
    });

    it('omits excludeTitles when there is nothing to exclude', async () => {
      await ApiService.getFridgeRecipes(['egg'], 'en', { excludeTitles: [] });
      expect(lastBody()).not.toHaveProperty('excludeTitles');
    });
  });

  describe('updateAvatar', () => {
    it('saves through the merging upsert, without touching preferences', async () => {
      await ApiService.updateAvatar('preset:leaf:#fff');

      const [path, options] = requestSpy.mock.calls[0];
      expect(path).toBe('/user-profiles');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ avatarUrl: 'preset:leaf:#fff' });
    });

    it('can clear the avatar', async () => {
      await ApiService.updateAvatar(null);
      expect(lastBody()).toEqual({ avatarUrl: null });
    });
  });
});
