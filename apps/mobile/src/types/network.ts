export interface NetworkState {
  isConnected: boolean;
  type: string;
  isInternetReachable: boolean;
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface ApiRequest extends ApiEndpoint {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  details?: any;
}

export interface RequestConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition: (_error: any) => boolean;
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  strategy: 'memory' | 'disk' | 'hybrid';
}