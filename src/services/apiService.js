import { API_BASE_URL, DEV_TOKEN, DEV_REFRESH_TOKEN } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
// Article types are used in JSDoc comments only

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = DEV_TOKEN || null;
    this.refreshTokenValue = DEV_REFRESH_TOKEN || null;
    /** @type {string | null} */
    this.expoPushToken = null;
    
    // Log configuration on init (using safe values) - only in dev
    if (__DEV__) {
    console.log('[ApiService] Initialized with baseURL:', this.baseURL);
    }
  }

  async setToken(token, refreshToken) {
    this.token = token;
    if (refreshToken) {
      this.refreshTokenValue = refreshToken;
    }
    try {
      if (token) {
        // Access token stays in memory only
        // But we can also store it in AsyncStorage for app restart persistence
        await AsyncStorage.setItem('auth.token', token);
      } else {
        await AsyncStorage.removeItem('auth.token');
      }
      if (refreshToken) {
        // Store refresh token in Secure Storage (Keychain/Keystore)
        // Fallback to AsyncStorage if SecureStore is unavailable
        try {
          await SecureStore.setItemAsync('auth.refreshToken', refreshToken);
        } catch (secureStoreError) {
          if (__DEV__) console.warn('SecureStore not available, using AsyncStorage fallback');
          await AsyncStorage.setItem('auth.refreshToken', refreshToken);
        }
      } else {
        // Try to delete from both SecureStore and AsyncStorage
        try {
          await SecureStore.deleteItemAsync('auth.refreshToken');
        } catch (secureStoreError) {
          // Ignore SecureStore errors when deleting
          if (__DEV__) console.warn('SecureStore delete error (ignored)');
        }
        try {
          await AsyncStorage.removeItem('auth.refreshToken');
        } catch (asyncStorageError) {
          // Ignore AsyncStorage errors when deleting
          if (__DEV__) console.warn('AsyncStorage delete error (ignored)');
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error storing tokens:', error);
    }
  }

  async loadTokens() {
    try {
      // Load access token from AsyncStorage
      const token = await AsyncStorage.getItem('auth.token');
      if (token) {
        this.token = token;
      }

      // Load refresh token from Secure Storage
      try {
        const refreshToken = await SecureStore.getItemAsync('auth.refreshToken');
        if (refreshToken) {
          this.refreshTokenValue = refreshToken;
        }
      } catch (secureStoreError) {
        // SecureStore might not be available in all environments
        if (__DEV__) console.warn('SecureStore not available, trying AsyncStorage');
        const refreshToken = await AsyncStorage.getItem('auth.refreshToken');
        if (refreshToken) {
          this.refreshTokenValue = refreshToken;
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading tokens:', error);
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = this.token || DEV_TOKEN;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    if (__DEV__) console.log(`[ApiService] Requesting: ${url}`);
    
    // Create AbortController for timeout (more reliable than AbortSignal.timeout)
    const timeoutMs = 30000; // 30 seconds
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeoutMs);
    
    const config = {
      headers: this.getHeaders(),
      ...options,
      signal: abortController.signal,
    };

    try {
      if (config.body instanceof FormData && config.headers) {
        delete config.headers['Content-Type'];
        if (this.token || DEV_TOKEN) {
          config.headers['Authorization'] = `Bearer ${this.token || DEV_TOKEN}`;
        }
      }

      if (__DEV__) {
      console.log(`[ApiService] Fetch config:`, {
        method: config.method || 'GET',
        headers: Object.keys(config.headers || {}),
        hasBody: !!config.body,
        hasAuth: !!(config.headers && config.headers['Authorization']),
      });
      }

      let response;
      try {
        response = await fetch(url, config);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (__DEV__) console.error(`[ApiService] Fetch error for ${url}:`, fetchError);
        // Re-throw with more context
        const error = new Error(fetchError.message || 'Network request failed');
        error.name = fetchError.name || 'NetworkError';
        error.cause = fetchError;
        throw error;
      }
      
      // Clear timeout on successful fetch
      clearTimeout(timeoutId);

      if (__DEV__) console.log(`[ApiService] Response status: ${response.status}`);

      if (response.status === 401 && this.refreshTokenValue) {
        let refreshTimeoutId = null;
        let retryTimeoutId = null;
        try {
          // Create new AbortController for refresh token request
          const refreshAbortController = new AbortController();
          refreshTimeoutId = setTimeout(() => {
            refreshAbortController.abort();
          }, timeoutMs);
          
          const refreshRes = await fetch(`${this.baseURL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: this.refreshTokenValue }),
            signal: refreshAbortController.signal,
          });
          
          clearTimeout(refreshTimeoutId);
          refreshTimeoutId = null;
          
          if (refreshRes.ok) {
            const tokens = await refreshRes.json();
            if (tokens.accessToken) {
              await this.setToken(tokens.accessToken, tokens.refreshToken || this.refreshTokenValue);
              config.headers = this.getHeaders();
              // Create new AbortController for retry request
              const retryAbortController = new AbortController();
              retryTimeoutId = setTimeout(() => {
                retryAbortController.abort();
              }, timeoutMs);
              config.signal = retryAbortController.signal;
              response = await fetch(url, config);
              clearTimeout(retryTimeoutId);
              retryTimeoutId = null;
            } else {
              // Clear retry timeout if tokens are invalid
              if (retryTimeoutId) clearTimeout(retryTimeoutId);
            }
          } else {
            // Clear refresh timeout if refresh failed
            if (refreshTimeoutId) clearTimeout(refreshTimeoutId);
          }
        } catch (refreshError) {
          // Clear timeouts on error
          if (refreshTimeoutId) clearTimeout(refreshTimeoutId);
          if (retryTimeoutId) clearTimeout(retryTimeoutId);
          console.warn('[ApiService] Token refresh failed', refreshError);
          // If refresh fails, clear tokens and re-throw original 401
          await this.setToken(null, null);
          throw await this.buildHttpError(response);
        }
      }

      if (!response.ok) {
        throw await this.buildHttpError(response);
      }

      return await this.parseResponseBody(response);
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      
      // Check if error is due to abort (timeout)
      if (error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout after ${timeoutMs}ms`);
        timeoutError.name = 'TimeoutError';
        timeoutError.status = 408;
        throw timeoutError;
      }
      
      if (__DEV__) {
      console.error(`[ApiService] Request failed for ${url}:`, error.message);
      console.error('[ApiService] Error details:', error);
      }
      throw error;
    }
  }

  async parseResponseBody(response) {
    const contentType = response.headers.get('content-type') || '';
    if (response.status === 204) {
      return null;
    }
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  }

  async buildHttpError(response) {
    const contentType = response.headers.get('content-type') || '';
    let payload = null;
    let message = `HTTP error! status: ${response.status}`;

    if (contentType.includes('application/json')) {
      payload = await response.json().catch(() => null);
      if (payload) {
        const payloadMessage = payload.message || payload.error || payload.detail || payload.title;
        if (payloadMessage) {
          message = Array.isArray(payloadMessage) ? payloadMessage.join(', ') : payloadMessage;
        }
      }
    } else {
      const text = await response.text().catch(() => '');
      if (text) {
        message = text;
      }
    }

    const error = new Error(message);
    error.status = response.status;
    if (payload) {
      error.payload = payload;
    }
    return error;
  }

  // Authentication
  async register(email) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async requestOtp(email) {
    return this.request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyOtp(email, otp) {
    if (__DEV__) console.log('[ApiService] verifyOtp called');
    const response = await this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code: otp }),
    });
    if (__DEV__) {
    console.log('[ApiService] verifyOtp response:', {
      hasAccessToken: !!response?.accessToken,
      hasRefreshToken: !!response?.refreshToken,
    });
    }
    return response;
  }

  async requestMagicLink(email) {
    return this.request('/auth/request-magic-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async login(email, otp) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async refreshToken() {
    if (!this.refreshTokenValue) {
      throw new Error('No refresh token available');
    }
    return this.request('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.refreshTokenValue }),
    });
  }

  async signInWithApple(appleData) {
    return this.request('/auth/apple', {
      method: 'POST',
      body: JSON.stringify(appleData),
    });
  }

  async signInWithGoogle(googleData) {
    return this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(googleData),
    });
  }

  // Food Analysis
  async analyzeImage(imageUri, locale) {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'food-image.jpg',
    });

    if (locale) {
      formData.append('locale', locale);
    }

    // Get headers with token, but remove Content-Type for FormData
    const headers = this.getHeaders();
    delete headers['Content-Type']; // Let fetch set it automatically for FormData

    return this.request('/food/analyze', {
      method: 'POST',
      headers: headers,
      body: formData,
    });
  }

  async analyzeText(description, locale) {
    const localeParam = locale || 'en';
    return this.request('/food/analyze-text', {
      method: 'POST',
      body: JSON.stringify({
        description: description.trim(),
        locale: localeParam,
      }),
    });
  }

  async getAnalysisStatus(analysisId) {
    return this.request(`/food/analysis/${analysisId}/status`);
  }

  async getAnalysisResult(analysisId) {
    return this.request(`/food/analysis/${analysisId}/result`);
  }

  async reanalyzeAnalysis(analysisId, items) {
    return this.request(`/food/analysis/${analysisId}/reanalyze`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  // Meals
  async getMeals(date) {
    try {
      const params = date ? `?date=${date.toISOString().split('T')[0]}` : '';
      const response = await this.request(`/meals${params}`);
      // Гарантируем, что всегда возвращается массив
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('[ApiService] getMeals error:', error);
      return [];
    }
  }

  async createMeal(mealData) {
    return this.request('/meals', {
      method: 'POST',
      body: JSON.stringify(mealData),
    });
  }

  async updateMeal(mealId, mealData) {
    return this.request(`/meals/${mealId}`, {
      method: 'PUT',
      body: JSON.stringify(mealData),
    });
  }

  async deleteMeal(mealId) {
    return this.request(`/meals/${mealId}`, {
      method: 'DELETE',
    });
  }

  async updateMealItem(mealId, itemId, itemData) {
    return this.request(`/meals/${mealId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  }

  async getNotificationPreferences() {
    return this.request('/notifications/preferences');
  }

  async updateNotificationPreferences(preferences) {
    return this.request('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  async getTokenUsage(userId, days = 30) {
    return this.request(`/ai-assistant/token-usage?userId=${encodeURIComponent(userId)}&days=${days}`);
  }

  // User Profile (legacy - use /user-profiles instead)
  async deleteAccount() {
    return this.request('/users/me', {
      method: 'DELETE',
    });
  }

  // Statistics
  async getStats(date) {
    try {
      // align with backend routes
      // Если передана дата, используем /me/stats для получения статистики по дате
      if (date) {
        const dateStr = date.toISOString().split('T')[0];
        const response = await this.request(`/me/stats?from=${dateStr}&to=${dateStr}`);
        // Преобразуем формат ответа /me/stats в формат /stats/dashboard
        if (response && response.totals) {
          return {
            today: {
              calories: response.totals.calories || 0,
              protein: response.totals.protein || 0,
              carbs: response.totals.carbs || 0,
              fat: response.totals.fat || 0,
            },
            goals: response.goals || {},
          };
        }
      }
      // По умолчанию используем /stats/dashboard для сегодня
      const response = await this.request(`/stats/dashboard`);
      // Гарантируем, что всегда возвращается объект
      return response ?? { today: {}, goals: {} };
    } catch (error) {
      console.error('[ApiService] getStats error:', error);
      return { today: {}, goals: {} };
    }
  }

  async getMonthlyStats(from, to) {
    try {
      const params = new URLSearchParams();
      if (from) {
        params.append('from', from);
      }
      if (to) {
        params.append('to', to);
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      // Используем правильный роут из бэкенда: /me/stats
      const response = await this.request(`/me/stats${query}`);
      // Гарантируем, что всегда возвращается объект или null
      return response ?? null;
    } catch (error) {
      console.error('[ApiService] getMonthlyStats error:', error);
      return null;
    }
  }

  async getUserStats() {
    try {
      return await this.request('/users/stats');
    } catch (error) {
      console.error('[ApiService] getUserStats error:', error);
      return {
        totalPhotosAnalyzed: 0,
        todayPhotosAnalyzed: 0,
        dailyLimit: 3,
      };
    }
  }

  async getSuggestedFoods() {
    try {
      const response = await this.request('/suggestions/foods');
      return response || [];
    } catch (error) {
      console.error('[ApiService] getSuggestedFoods error:', error);
      return [];
    }
  }

  // Media
  async uploadImage(imageUri) {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'upload-image.jpg',
    });

    return this.request('/media/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // User Profiles
  async createUserProfile(profileData) {
    return this.request('/user-profiles', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  async getUserProfile() {
    try {
      const result = await this.request('/user-profiles');
      // Гарантируем, что всегда возвращается объект или null, но не undefined
      return result ?? null;
    } catch (error) {
      console.error('[ApiService] getUserProfile error:', error);
      throw error;
    }
  }

  async updateUserProfile(profileData) {
    return this.request('/user-profiles', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async completeOnboarding() {
    try {
      const result = await this.request('/user-profiles/complete-onboarding', {
        method: 'POST',
      });
      // Гарантируем, что всегда возвращается значение (не undefined)
      return result ?? { success: true };
    } catch (error) {
      console.error('[ApiService] completeOnboarding error:', error);
      // В случае ошибки все равно возвращаем объект, чтобы не сломать цепочку
      throw error;
    }
  }

  // AI Assistant
  async getNutritionAdvice(userId, question, context, language) {
    return this.request('/ai-assistant/nutrition-advice', {
      method: 'POST',
      body: JSON.stringify({ userId, question, context, language }),
    });
  }

  async getHealthCheck(userId, question, language) {
    return this.request('/ai-assistant/health-check', {
      method: 'POST',
      body: JSON.stringify({ userId, question, language }),
    });
  }

  async getGeneralQuestion(userId, question, language) {
    return this.request('/ai-assistant/general-question', {
      method: 'POST',
      body: JSON.stringify({ userId, question, language }),
    });
  }

  async sendAiAssistantMessage(message) {
    // This method should be called with userId from component
    // For now, use getGeneralQuestion directly
    throw new Error('sendAiAssistantMessage requires userId - use getGeneralQuestion instead');
  }

  async getConversationHistory(userId, limit = 10) {
    try {
      const result = await this.request(`/ai-assistant/conversation-history?userId=${encodeURIComponent(userId)}&limit=${limit}`);
      // Гарантируем, что всегда возвращается массив
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('[ApiService] getConversationHistory error:', error);
      return [];
    }
  }

  async analyzeLabResults(userId, rawText, language) {
    return this.request('/ai-assistant/lab-results', {
      method: 'POST',
      body: JSON.stringify({ userId, rawText, language }),
    });
  }

  async sendLabResults(payload) {
    // STEP 6: Send lab results with JSON body (type, manualText)
    return this.request('/ai-assistant/lab-results', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listAssistantFlows() {
    try {
      const result = await this.request('/ai-assistant/flows');
      // Гарантируем, что всегда возвращается массив
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('[ApiService] listAssistantFlows error:', error);
      return [];
    }
  }

  async startAssistantSession(flowId, userId, resume = true) {
    try {
      const result = await this.request('/ai-assistant/session', {
        method: 'POST',
        body: JSON.stringify({ flowId, userId, resume }),
      });
      // Гарантируем, что всегда возвращается объект
      return result ?? { sessionId: null, step: null, summary: null, complete: false };
    } catch (error) {
      console.error('[ApiService] startAssistantSession error:', error);
      throw error;
    }
  }

  async resumeAssistantSession(sessionId) {
    return this.request(`/ai-assistant/session/${encodeURIComponent(sessionId)}`);
  }

  async sendAssistantSessionStep(sessionId, userId, input) {
    try {
      const result = await this.request('/ai-assistant/step', {
        method: 'POST',
        body: JSON.stringify({ sessionId, userId, input }),
      });
      // Гарантируем, что всегда возвращается объект
      return result ?? { step: null, summary: null, complete: false, sessionId: null };
    } catch (error) {
      console.error('[ApiService] sendAssistantSessionStep error:', error);
      throw error;
    }
  }

  async cancelAssistantSession(sessionId, userId) {
    return this.request(`/ai-assistant/session/${encodeURIComponent(sessionId)}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  }

  // Legacy helpers (deprecated)
  async startAssistantFlow(flowId, userId) {
    return this.startAssistantSession(flowId, userId, true);
  }

  async sendAssistantFlowStep(flowId, userId, input) {
    const session = await this.startAssistantSession(flowId, userId, true);
    return this.sendAssistantSessionStep(session.sessionId, userId, input);
  }

  async cancelAssistantFlow(flowId, userId) {
    const session = await this.startAssistantSession(flowId, userId, true);
    return this.cancelAssistantSession(session.sessionId, userId);
  }

  // Articles
  async getArticlesFeed(page = 1, pageSize = 20, locale = 'ru') {
    try {
      /** @type {import('../types/articles').ArticleFeed} */
      const response = await this.request(`/articles/feed?page=${page}&pageSize=${pageSize}&locale=${locale}`);
      // Гарантируем, что всегда возвращается объект с articles массивом
      if (response && typeof response === 'object') {
        return {
          articles: Array.isArray(response.articles) ? response.articles : [],
          total: response.total ?? 0,
          page: response.page ?? page,
          pageSize: response.pageSize ?? pageSize,
          ...response,
        };
      }
      return { articles: [], total: 0, page, pageSize };
    } catch (error) {
      console.error('[ApiService] getArticlesFeed error:', error);
      return { articles: [], total: 0, page, pageSize };
    }
  }

  async getFeaturedArticles(limit = 3, locale = 'ru') {
    try {
      /** @type {import('../types/articles').ArticleSummary[]} */
      const response = await this.request(`/articles/featured?limit=${limit}&locale=${locale}`);
      // Гарантируем, что всегда возвращается массив
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('[ApiService] getFeaturedArticles error:', error);
      return [];
    }
  }

  async getArticleBySlug(slug, locale = 'ru') {
    try {
      /** @type {import('../types/articles').ArticleDetail} */
      const response = await this.request(`/articles/slug/${slug}?locale=${locale}`);
      // Гарантируем, что всегда возвращается объект или null
      return response ?? null;
    } catch (error) {
      console.error('[ApiService] getArticleBySlug error:', error);
      throw error;
    }
  }

  async searchArticles(query, page = 1, pageSize = 20, locale = 'ru') {
    try {
      /** @type {import('../types/articles').ArticleFeed} */
      const response = await this.request(`/articles/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}&locale=${locale}`);
      // Гарантируем, что всегда возвращается объект с articles массивом
      if (response && typeof response === 'object') {
        return {
          articles: Array.isArray(response.articles) ? response.articles : [],
          total: response.total ?? 0,
          page: response.page ?? page,
          pageSize: response.pageSize ?? pageSize,
          ...response,
        };
      }
      return { articles: [], total: 0, page, pageSize };
    } catch (error) {
      console.error('[ApiService] searchArticles error:', error);
      return { articles: [], total: 0, page, pageSize };
    }
  }

  async getArticlesByTag(tag, page = 1, pageSize = 20, locale = 'ru') {
    try {
      /** @type {import('../types/articles').ArticleFeed} */
      const response = await this.request(`/articles/tag/${encodeURIComponent(tag)}?page=${page}&pageSize=${pageSize}&locale=${locale}`);
      // Гарантируем, что всегда возвращается объект с articles массивом
      if (response && typeof response === 'object') {
        return {
          articles: Array.isArray(response.articles) ? response.articles : [],
          total: response.total ?? 0,
          page: response.page ?? page,
          pageSize: response.pageSize ?? pageSize,
          ...response,
        };
      }
      return { articles: [], total: 0, page, pageSize };
    } catch (error) {
      console.error('[ApiService] getArticlesByTag error:', error);
      return { articles: [], total: 0, page, pageSize };
    }
  }

  async registerPushToken(token, deviceId, platform, appVersion) {
    try {
      await this.request('/notifications/push-token', {
        method: 'POST',
        body: JSON.stringify({ token, deviceId, platform, appVersion }),
      });
      this.expoPushToken = token;
    } catch (error) {
      console.error('[ApiService] Failed to register push token', error);
    }
  }
}

export default new ApiService();
