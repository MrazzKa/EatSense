export interface SDKConfig {
  apiKey?: string;
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface SDKResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class EatSenseSDK {
  private config: SDKConfig;
  private apiKey?: string;

  constructor(config: SDKConfig) {
    this.config = config;
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<SDKResponse<T>> {
    try {
      const url = `${this.config.baseURL}${endpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          message: response.statusText,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error',
        message: 'Failed to connect to server',
      };
    }
  }

  async analyzeImage(imageUri: string, locale?: 'en' | 'ru' | 'kk'): Promise<SDKResponse<any>> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    } as any);

    try {
      const url = `${this.config.baseURL}/v1/food/analyze`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      if (locale) {
        formData.append('locale', locale);
      }

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          message: response.statusText,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error',
        message: 'Failed to analyze image',
      };
    }
  }

  async getHealth(): Promise<SDKResponse<any>> {
    return this.request('/v1/health');
  }

  async getUserProfile(userId: string): Promise<SDKResponse<any>> {
    return this.request(`/v1/users/${userId}`);
  }

  async updateUserProfile(userId: string, data: any): Promise<SDKResponse<any>> {
    return this.request(`/v1/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAnalysisHistory(userId: string, limit: number = 10): Promise<SDKResponse<any>> {
    return this.request(`/v1/users/${userId}/analyses?limit=${limit}`);
  }

  async deleteAnalysis(analysisId: string): Promise<SDKResponse<any>> {
    return this.request(`/v1/analyses/${analysisId}`, {
      method: 'DELETE',
    });
  }
}

export const createSDK = (config: SDKConfig): EatSenseSDK => {
  return new EatSenseSDK(config);
};
