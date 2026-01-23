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

    // Mutex for refresh operations
    /** @type {Promise<boolean> | null} */
    this._refreshPromise = null;
    /** @type {number} - Current refresh attempt count */
    this._refreshAttempts = 0;
    /** @type {number} - Maximum refresh attempts before forcing logout */
    this._maxRefreshAttempts = 3;

    // Grace period tracking - prevents redundant refresh calls
    /** @type {number} - Timestamp of last successful refresh */
    this._lastRefreshTime = 0;
    /** @type {boolean} - Result of last refresh */
    this._lastRefreshSuccess = false;
    /** @type {number} - Grace period in ms: skip refresh if recently succeeded */
    this._refreshGracePeriodMs = 10000; // 10 seconds (increased from 5)

    // Timer for resetting refresh attempts
    this._refreshResetTimer = null;

    // Log configuration on init (using safe values) - always log in dev
    if (__DEV__) {
      console.log('[ApiService] Initialized with baseURL:', this.baseURL);
      console.log('[ApiService] API Base URL source:',
        process.env.EXPO_PUBLIC_API_BASE_URL
          ? 'EXPO_PUBLIC_API_BASE_URL env var'
          : 'default production URL'
      );
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
        } catch {
          if (__DEV__) console.warn('SecureStore not available, using AsyncStorage fallback');
          await AsyncStorage.setItem('auth.refreshToken', refreshToken);
        }
      } else {
        // Try to delete from both SecureStore and AsyncStorage
        try {
          await SecureStore.deleteItemAsync('auth.refreshToken');
        } catch {
          // Ignore SecureStore errors when deleting
          if (__DEV__) console.warn('SecureStore delete error (ignored)');
        }
        try {
          await AsyncStorage.removeItem('auth.refreshToken');
        } catch {
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
      } catch {
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

  /**
   * Convert relative media URL to absolute URL
   * @param {string} url - Relative URL (e.g., "/media/abc123") or absolute URL
   * @returns {string} Absolute URL
   */
  resolveMediaUrl(url) {
    if (!url) return null;

    // If already absolute URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    // If relative path, prepend baseURL
    const normalized = url.startsWith('/') ? url : `/${url}`;
    return `${this.baseURL}${normalized}`;
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

      if (response.status === 401) {
        // Special handling for auth endpoints - don't try to refresh on these
        const isAuthEndpoint = endpoint.includes('/auth/logout') || endpoint.includes('/auth/refresh-token');
        
        if (isAuthEndpoint) {
          // For auth endpoints, 401 is expected if token is expired/invalid
          // Don't try to refresh - just return the error
          if (__DEV__) {
            console.log(`[ApiService] 401 on auth endpoint ${endpoint} - expected if token expired`);
          }
          throw await this.buildHttpError(response);
        }

        // Check if we're in grace period after recent successful refresh
        const timeSinceRefresh = Date.now() - this._lastRefreshTime;
        const inGracePeriod = this._lastRefreshSuccess && timeSinceRefresh < this._refreshGracePeriodMs;

        if (__DEV__) {
          console.log(`[ApiService] 401 received for ${endpoint}`, {
            inGracePeriod,
            timeSinceRefresh,
            lastRefreshSuccess: this._lastRefreshSuccess,
            hasToken: !!this.token,
          });
        }

        let shouldRetry = false;

        if (inGracePeriod) {
          // Recently refreshed successfully - just retry with current token
          // This handles race condition where request was sent before refresh completed
          if (__DEV__) {
            console.log('[ApiService] In grace period, retrying with current token without refresh');
          }
          shouldRetry = true;
        } else {
          // Not in grace period - attempt refresh
          const refreshed = await this.refreshToken();
          shouldRetry = refreshed;
        }

        if (shouldRetry) {
          // Retry the original request with new token
          config.headers = this.getHeaders();
          // Create new AbortController for retry request
          const retryAbortController = new AbortController();
          const retryTimeoutId = setTimeout(() => {
            retryAbortController.abort();
          }, timeoutMs);
          config.signal = retryAbortController.signal;

          try {
            response = await fetch(url, config);
            clearTimeout(retryTimeoutId);

            // If still 401 after retry and we were in grace period, try actual refresh
            if (response.status === 401 && inGracePeriod) {
              if (__DEV__) {
                console.log('[ApiService] Grace period retry failed, attempting actual refresh');
              }
              const refreshed = await this.refreshToken();
              if (refreshed) {
                config.headers = this.getHeaders();
                const retryAbortController2 = new AbortController();
                const retryTimeoutId2 = setTimeout(() => {
                  retryAbortController2.abort();
                }, timeoutMs);
                config.signal = retryAbortController2.signal;
                try {
                  response = await fetch(url, config);
                  clearTimeout(retryTimeoutId2);
                } catch (retryError2) {
                  clearTimeout(retryTimeoutId2);
                  throw retryError2;
                }
              }
            }
          } catch (retryError) {
            clearTimeout(retryTimeoutId);
            throw retryError;
          }
        } else {
          // Refresh failed, throw original 401 error
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
    let errorCode = null;

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
        // Detect HTML responses (e.g., ngrok 502, gateway errors)
        if (text.includes('<!DOCTYPE html>') || text.includes('<html') || text.includes('ERR_NGROK')) {
          // Extract ngrok error code if present
          const ngrokMatch = text.match(/ERR_NGROK_(\d+)/);
          if (ngrokMatch) {
            errorCode = `NGROK_${ngrokMatch[1]}`;
          }

          // Return user-friendly message instead of HTML
          if (response.status === 502) {
            message = 'Server temporarily unavailable. Please try again.';
          } else if (response.status === 504) {
            message = 'Request timed out. Please try again.';
          } else {
            message = 'Connection error. Please check your network.';
          }
        } else {
          // Non-HTML text response - use as-is but limit length
          message = text.length > 200 ? text.substring(0, 200) + '...' : text;
        }
      }
    }

    const error = new Error(message);
    error.status = response.status;
    error.isServerError = response.status >= 500;
    error.isNetworkError = response.status === 502 || response.status === 503 || response.status === 504;
    if (errorCode) {
      error.code = errorCode;
    }
    if (payload) {
      error.payload = payload;
    }
    return error;
  }

  // Generic HTTP methods for services
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, body = null) {
    const options = { method: 'POST' };
    if (body) {
      options.body = JSON.stringify(body);
    }
    return options.body ? this.request(endpoint, options) : this.request(endpoint, { method: 'POST' });
  }

  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
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
    // Clear refresh state before logout
    this._clearRefreshState();
    try {
      return await this.request('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Ignore 401 errors on logout - token may already be invalid/expired
      // This is expected behavior when logging out with expired tokens
      if (error.status === 401) {
        if (__DEV__) {
          console.log('[ApiService] Logout returned 401 (token expired) - ignoring');
        }
        return null;
      }
      throw error;
    }
  }

  async refreshToken() {
    if (!this.refreshTokenValue) {
      if (__DEV__) console.log('[ApiService] No refresh token available');
      return false;
    }

    // Check if we recently succeeded - return cached success within grace period
    const timeSinceRefresh = Date.now() - this._lastRefreshTime;
    if (this._lastRefreshSuccess && timeSinceRefresh < this._refreshGracePeriodMs) {
      if (__DEV__) {
        console.log('[ApiService] Refresh skipped - within grace period', {
          timeSinceRefresh,
          gracePeriod: this._refreshGracePeriodMs,
        });
      }
      return true;
    }

    // Mutex: if refresh is already in progress, wait for it
    // This prevents concurrent refresh attempts that would cause token rotation issues
    if (this._refreshPromise) {
      if (__DEV__) console.log('[ApiService] Refresh already in progress, waiting...');
      try {
        const result = await this._refreshPromise;
        // After waiting, the refresh has completed - return the result
        // The _lastRefreshSuccess should be set by the original refresh
        return result;
      } catch {
        // If the ongoing refresh failed, don't retry immediately
        return false;
      }
    }

    // Create promise for this refresh attempt
    // Store the promise BEFORE any async operation to ensure proper mutex
    const refreshPromise = this._doRefreshToken();
    this._refreshPromise = refreshPromise;

    try {
      const result = await refreshPromise;
      // Update grace period state
      if (result) {
        this._lastRefreshTime = Date.now();
        this._lastRefreshSuccess = true;
        if (__DEV__) {
          console.log('[ApiService] Refresh succeeded, grace period started');
        }
      } else {
        this._lastRefreshSuccess = false;
      }
      return result;
    } catch (error) {
      this._lastRefreshSuccess = false;
      throw error;
    } finally {
      // Only clear mutex if this is still our promise (prevents race conditions)
      // Keep mutex a bit longer to prevent thundering herd
      if (this._refreshPromise === refreshPromise) {
        // Clear after short delay to allow concurrent requests to see the result
        setTimeout(() => {
          if (this._refreshPromise === refreshPromise) {
            this._refreshPromise = null;
          }
        }, 100);
      }
    }
  }

  async _doRefreshToken() {
    // Track refresh attempts to prevent infinite loops
    if (!this._refreshAttempts) this._refreshAttempts = 0;
    this._refreshAttempts++;

    if (__DEV__) {
      console.log('[ApiService] _doRefreshToken starting', {
        attempt: this._refreshAttempts,
        hasRefreshToken: !!this.refreshTokenValue,
        refreshTokenPrefix: this.refreshTokenValue ? this.refreshTokenValue.substring(0, 20) + '...' : 'none',
      });
    }

    // Prevent more than max refresh attempts in quick succession
    if (this._refreshAttempts > this._maxRefreshAttempts) {
      console.warn(`[ApiService] Too many refresh attempts (${this._refreshAttempts}), forcing logout`);
      await this._forceLogout();
      return false;
    }

    // Reset counter after 10 seconds
    clearTimeout(this._refreshResetTimer);
    this._refreshResetTimer = setTimeout(() => {
      this._refreshAttempts = 0;
    }, 10000);

    try {
      const refreshUrl = `${this.baseURL}/auth/refresh-token`;
      const refreshRes = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshTokenValue }),
      });

      if (__DEV__) {
        console.log('[ApiService] Refresh response status:', refreshRes.status);
      }

      if (refreshRes.ok) {
        const tokens = await refreshRes.json();
        if (tokens.accessToken) {
          // Update tokens in memory and storage
          await this.setToken(tokens.accessToken, tokens.refreshToken || this.refreshTokenValue);
          if (__DEV__) {
            console.log('[ApiService] Token refreshed successfully', {
              newTokenPrefix: tokens.accessToken.substring(0, 20) + '...',
              hasNewRefreshToken: !!tokens.refreshToken,
              hasProfile: !!tokens.profile,
            });
          }
          this._refreshAttempts = 0; // Reset on success
          return tokens; // Return full payload including profile
        }
      }

      // Handle specific error cases
      if (refreshRes.status === 401) {
        // Token is invalid/expired, need to re-login
        console.warn('[ApiService] Refresh token invalid (401), logging out');
        await this.setToken(null, null);
        this._clearRefreshState();
        return false;
      }

      // Other errors (network, server) - keep tokens but return false
      console.warn('[ApiService] Token refresh failed with status:', refreshRes.status);
      return false;
    } catch (error) {
      console.warn('[ApiService] Token refresh network error:', error.message);
      // On network error, don't clear tokens (might be temporary)
      return false;
    }
  }

  /**
   * Clear refresh-related state (used on logout or failed refresh)
   */
  _clearRefreshState() {
    this._refreshAttempts = 0;
    this._lastRefreshTime = 0;
    this._lastRefreshSuccess = false;
    this._refreshPromise = null;
    if (this._refreshResetTimer) {
      clearTimeout(this._refreshResetTimer);
      this._refreshResetTimer = null;
    }
  }

  /**
   * Force logout - clears all tokens and emits logout event
   * Called when refresh token is definitively invalid
   */
  async _forceLogout() {
    if (__DEV__) {
      console.log('[ApiService] Forcing logout due to invalid tokens');
    }
    await this.setToken(null, null);
    this._clearRefreshState();

    // Emit event for app to handle (e.g., navigate to login)
    // React Native uses EventEmitter or global state instead of window events
    // This is a placeholder - actual implementation depends on app architecture
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
  async analyzeImage(imageUri, locale, foodDescription) {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'food-image.jpg',
    });

    if (locale) {
      formData.append('locale', locale);
    }

    if (foodDescription) {
      formData.append('foodDescription', foodDescription);
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

  /**
   * Analyze food from text description
   * @param {string} text - Food description text
   * @param {string} locale - Locale (en/ru/kk)
   * @returns {Promise<{analysisId: string}>} - Returns analysisId for polling or direct navigation
   */
  async analyzeText(text, locale) {
    const localeParam = locale || 'en';
    const response = await this.request('/food/analyze-text', {
      method: 'POST',
      body: JSON.stringify({
        description: text.trim(),
        locale: localeParam,
      }),
    });

    // Backend should return { analysisId: string } or similar
    // If it returns the full analysis object, extract analysisId
    return response;
  }

  async getAnalysisStatus(analysisId) {
    return this.request(`/food/analysis/${analysisId}/status`);
  }

  async getActiveAnalyses() {
    return this.request('/food/analyses/active');
  }

  async getAnalysisResult(analysisId) {
    return this.request(`/food/analysis/${analysisId}/result`);
  }

  /**
   * Reanalyze: recalculate totals, HealthScore and feedback from current items
   * (without changing items or calling Vision/providers)
   */
  async reanalyzeAnalysis(analysisId) {
    return this.request(`/food/analysis/${analysisId}/reanalyze`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  /**
   * Re-analyze with manually edited items (name, portion, macros)
   * Backend will recalculate totals, HealthScore and feedback
   */
  async manualReanalyzeAnalysis(analysisId, items) {
    return this.request(`/food/analysis/${analysisId}/manual-reanalyze`, {
      method: 'POST',
      body: JSON.stringify({
        items: items.map(item => ({
          id: item.id,
          name: item.name.trim(),
          portion_g: Number(item.portion_g) || 0,
          calories: item.calories !== undefined ? Number(item.calories) : undefined,
          protein_g: item.protein_g !== undefined ? Number(item.protein_g) : undefined,
          fat_g: item.fat_g !== undefined ? Number(item.fat_g) : undefined,
          carbs_g: item.carbs_g !== undefined ? Number(item.carbs_g) : undefined,
        })),
      }),
    });
  }

  /**
   * Legacy method for backward compatibility
   */
  async manualReanalyze(analysisId, components) {
    return this.manualReanalyzeAnalysis(
      analysisId,
      components.map(comp => ({
        id: comp.id || String(comp.index),
        name: comp.name,
        portion_g: comp.portion_g,
      }))
    );
  }

  /**
   * Re-analyze from original input (full re-run)
   * @param {string} analysisId - Analysis ID
   * @param {object} options - Options with mode ('default' | 'review')
   */
  async reanalyzeFromOriginal(analysisId, options = {}) {
    return this.request(`/food/analysis/${analysisId}/reanalyze`, {
      method: 'POST',
      body: JSON.stringify({
        mode: options.mode || 'review',
      }),
    });
  }

  /**
   * Re-analyze with specific mode (convenience method)
   * @param {string} analysisId - Analysis ID
   * @param {string} mode - 'default' | 'review'
   */
  async reanalyzeAnalysisWithMode(analysisId, mode = 'review') {
    return this.reanalyzeFromOriginal(analysisId, { mode });
  }

  /**
   * Get monthly report as PDF
   * @param {object} params - Parameters: { year, month, locale }
   * @returns {Promise<{status: number, ok: boolean, data: Blob|null}>} - Response with PDF blob or 204 if no data
   */
  async getMonthlyReport(params = {}) {
    const { year, month, locale } = params;
    const queryParams = new URLSearchParams();

    if (year) queryParams.append('year', year.toString());
    if (month) queryParams.append('month', month.toString());
    if (locale) queryParams.append('locale', locale);

    const queryString = queryParams.toString();
    const endpoint = `/stats/monthly-report${queryString ? `?${queryString}` : ''}`;

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      // Return response with status for handling on the screen
      // Don't throw on 204/404 - let the screen handle it
      let data = null;
      if (response.status === 200) {
        // In React Native, response.blob() returns an object with _data property
        // We need to read it as arrayBuffer instead
        try {
          data = await response.arrayBuffer();
        } catch {
          // Fallback to blob if arrayBuffer fails
          try {
            const blob = await response.blob();
            // If blob has _data, extract it
            if (blob && blob._data) {
              data = blob._data;
            } else {
              data = blob;
            }
          } catch (e2) {
            console.error('[ApiService] Failed to read response data:', e2);
            data = null;
          }
        }
      }

      return {
        status: response.status,
        ok: response.ok,
        headers: response.headers,
        data,
      };
    } catch (error) {
      console.error('[ApiService] getMonthlyReport error:', error);
      // Re-throw network errors so screen can handle them
      throw error;
    }
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

  /**
   * Get aggregated dashboard data (performance optimization)
   */
  async getDashboardData(date, locale) {
    try {
      const params = new URLSearchParams();
      if (date) {
        params.append('date', date.toISOString());
      }
      if (locale) {
        params.append('locale', locale);
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      return this.request(`/dashboard${query}`);
    } catch (error) {
      console.error('[ApiService] getDashboardData error:', error);
      return null;
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

  /**
   * Get personalized food suggestions from backend
   * @param {string} locale - User's locale ('en' | 'ru' | 'kk')
   * @returns {Promise<Array|Object>} Array of suggested food items or object with sections
   */
  async getSuggestedFoods(locale) {
    try {
      // Pass locale to backend for personalized suggestions
      const params = locale ? `?locale=${encodeURIComponent(locale)}` : '';
      const response = await this.request(`/suggestions/foods${params}`);
      // Backend may return array of items, array of sections, or object with sections
      // Return as-is, let screen normalize
      return response || [];
    } catch (error) {
      console.error('[ApiService] getSuggestedFoods error:', error);
      // Re-throw so screen can handle fallback gracefully
      throw error;
    }
  }

  /**
   * Get personalized food suggestions V2 (structured response)
   * @param {string} locale - User's locale ('en' | 'ru' | 'kk')
   * @returns {Promise<Object>} Structured response with status, summary, health, stats, sections
   */
  async getSuggestedFoodsV2(locale) {
    try {
      const params = locale ? `?locale=${encodeURIComponent(locale)}` : '';
      const response = await this.request(`/suggestions/foods/v2${params}`);
      return response || { status: 'error', summary: '', sections: [] };
    } catch (error) {
      console.error('[ApiService] getSuggestedFoodsV2 error:', error);
      return {
        status: 'error',
        summary: locale === 'ru' ? 'Ошибка загрузки рекомендаций' : 'Failed to load suggestions',
        health: { level: 'average', score: 50, reasons: [] },
        stats: { daysWithMeals: 0, mealsCount: 0 },
        sections: [],
      };
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

  async sendAiAssistantMessage() {
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

  /**
   * Analyze lab results (text or file)
   * @param {Object} payload - { inputType: 'text' | 'file', text?: string, fileId?: string, fileName?: string, mimeType?: string, locale?: string }
   */
  async analyzeLabResults(payload) {
    return this.request('/ai-assistant/lab-results', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Analyze lab results with multipart/form-data (for file uploads)
   * @param {FormData} formData - FormData with file, inputType, locale
   */
  async analyzeLabResultsMultipart(formData) {
    const headers = this.getHeaders();
    delete headers['Content-Type']; // Let fetch set it automatically for FormData

    const response = await fetch(`${this.baseURL}/ai-assistant/lab-results`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to analyze lab results' }));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use analyzeLabResults instead
   */
  async sendLabResults(payload) {
    // Convert old format to new format
    const newPayload = {
      inputType: payload.manualText ? 'text' : 'file',
      text: payload.manualText,
      locale: payload.locale,
    };
    return this.analyzeLabResults(newPayload);
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

  async searchFoods(query, pageSize = 10) {
    try {
      const response = await this.request('/v1/integrations/fdc/search', {
        method: 'POST',
        body: JSON.stringify({
          query,
          pageSize,
          dataType: ['Branded', 'Foundation'],
        }),
      });
      return response?.foods || [];
    } catch (error) {
      console.error('[ApiService] searchFoods error:', error);
      return [];
    }
  }

  async getUSDAFoodDetails(fdcId) {
    try {
      const response = await this.request(`/v1/integrations/fdc/food/${fdcId}`);
      return response;
    } catch (error) {
      console.error('[ApiService] getUSDAFoodDetails error:', error);
      throw error;
    }
  }

  async searchUSDAFoods(query, pageSize = 10) {
    return this.searchFoods(query, pageSize);
  }

  async saveAnalysisCorrection(correction) {
    try {
      const response = await this.request('/food/corrections', {
        method: 'POST',
        body: JSON.stringify(correction),
      });
      return response;
    } catch (error) {
      console.error('[ApiService] saveAnalysisCorrection error:', error);
      // Non-critical, don't throw
      return null;
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

  // ========== Medication Schedule Methods ==========

  /**
   * Get all medications for current user
   */
  async getMedications() {
    return this.request('/medications');
  }

  /**
   * Create medication
   */
  async createMedication(payload) {
    return this.request('/medications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Update medication
   */
  async updateMedication(id, payload) {
    return this.request(`/medications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Delete medication (soft delete)
   */
  async deleteMedication(id) {
    return this.request(`/medications/${id}`, {
      method: 'DELETE',
    });
  }

  // ========== Subscription Methods ==========

  /**
   * Get subscription plans with prices in user's currency
   */
  async getSubscriptionPlans() {
    return this.request('/subscriptions/plans');
  }

  /**
   * Get current user's subscription
   */
  async getCurrentSubscription() {
    return this.request('/subscriptions/current');
  }

  /**
   * Verify purchase after IAP
   */
  async verifyPurchase(data) {
    return this.request('/subscriptions/verify-purchase', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId) {
    return this.request('/subscriptions/cancel', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId }),
    });
  }

  // ========== Specialists/Experts Methods ==========

  /**
   * Get specialists list with filters
   */
  async getSpecialists(filters = {}) {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.language) params.append('language', filters.language);
    if (filters.minRating) params.append('minRating', filters.minRating);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (filters.isFree) params.append('isFree', 'true');
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const query = params.toString();
    return this.request(`/specialists${query ? `?${query}` : ''}`);
  }

  /**
   * Get specialist by ID
   */
  async getSpecialist(specialistId) {
    return this.request(`/specialists/${specialistId}`);
  }

  /**
   * Register as specialist
   */
  async registerAsSpecialist(data) {
    return this.request('/specialists/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ========== Consultations Methods ==========

  /**
   * Get my consultations (as client)
   */
  async getMyConsultations() {
    return this.request('/consultations');
  }

  /**
   * Get consultation by ID
   */
  async getConsultation(consultationId) {
    return this.request(`/consultations/${consultationId}`);
  }

  /**
   * Request consultation with specialist
   */
  async requestConsultation(specialistId, message) {
    return this.request('/consultations', {
      method: 'POST',
      body: JSON.stringify({ specialistId, message }),
    });
  }

  /**
   * Get messages for consultation
   */
  async getMessages(consultationId, limit = 50, before = null) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.append('before', before);
    return this.request(`/consultations/${consultationId}/messages?${params.toString()}`);
  }

  /**
   * Send message in consultation
   */
  async sendMessage(consultationId, content, type = 'text') {
    return this.request(`/consultations/${consultationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  }

  /**
   * Mark messages as read
   */
  async markAsRead(consultationId) {
    return this.request(`/consultations/${consultationId}/read`, {
      method: 'POST',
    });
  }

  /**
   * Get unread messages count
   */
  async getUnreadMessagesCount() {
    return this.request('/consultations/unread');
  }

  // ========== Diets/Diet Programs Methods ==========

  /**
   * Get diet programs with filters
   */
  async getDiets(filters = {}) {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.category) params.append('category', filters.category);
    if (filters.suitableFor) params.append('suitableFor', filters.suitableFor);
    if (filters.featured) params.append('featured', 'true');
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.offset) params.append('offset', String(filters.offset));

    const query = params.toString();
    return this.request(`/diets${query ? `?${query}` : ''}`);
  }

  /**
   * Get all diets data in one bundle (optimized loading)
   * Returns: featuredDiets, featuredLifestyles, allDiets, allLifestyles, activeProgram, timestamp
   * @param {string} locale - Locale (en/ru/kk/fr)
   * @returns {Promise<{featuredDiets: any[], featuredLifestyles: any[], allDiets: any[], allLifestyles: any[], activeProgram: any|null, timestamp: number}>}
   */
  async getDietsBundle(locale = 'en') {
    try {
      return await this.request(`/diets/bundle?locale=${encodeURIComponent(locale)}`);
    } catch (error) {
      console.error('[ApiService] getDietsBundle error:', error);
      // Return empty bundle structure to allow graceful degradation
      return {
        featuredDiets: [],
        featuredLifestyles: [],
        allDiets: [],
        allLifestyles: [],
        activeProgram: null,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get featured diets
   */
  async getFeaturedDiets() {
    return this.request('/diets/featured');
  }

  /**
   * Get AI diet recommendations
   */
  async getDietRecommendations() {
    return this.request('/diets/recommendations');
  }

  /**
   * Get diet by ID or slug
   */
  async getDiet(idOrSlug) {
    return this.request(`/diets/${idOrSlug}`);
  }

  /**
   * Get full meal plan for diet
   */
  async getDietMealPlan(dietId) {
    return this.request(`/diets/${dietId}/meal-plan`);
  }

  /**
   * Get active user diet
   */
  async getActiveDiet() {
    return this.request('/diets/active');
  }

  /**
   * Get today's meal plan
   */
  async getTodayPlan() {
    return this.request('/diets/today');
  }

  /**
   * Start a diet program
   */
  async startDiet(dietId, options = {}) {
    return this.request(`/diets/${dietId}/start`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * Log a meal completed
   */
  async logDietMeal(mealType) {
    return this.request('/diets/log-meal', {
      method: 'POST',
      body: JSON.stringify({ mealType }),
    });
  }

  /**
   * Pause active diet
   */
  async pauseDiet() {
    return this.request('/diets/pause', { method: 'POST' });
  }

  /**
   * Resume paused diet
   */
  async resumeDiet() {
    return this.request('/diets/resume', { method: 'POST' });
  }

  /**
   * Abandon diet
   */
  async abandonDiet() {
    return this.request('/diets/abandon', { method: 'POST' });
  }

  /**
   * Get diet history
   */
  async getDietHistory() {
    return this.request('/diets/history');
  }

  // ==================== PROGRAM SUGGESTIONS ====================

  /**
   * Suggest a new program or vote for existing
   */
  async suggestProgram(name, description, type = 'lifestyle') {
    return this.request('/diets/suggest', {
      method: 'POST',
      body: JSON.stringify({ name, description, type }),
    });
  }

  /**
   * Get top suggestions
   */
  async getSuggestions(type, limit = 20) {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (limit) params.append('limit', String(limit));
    const query = params.toString();
    return this.request(`/diets/suggestions${query ? `?${query}` : ''}`);
  }
}

export default new ApiService();
