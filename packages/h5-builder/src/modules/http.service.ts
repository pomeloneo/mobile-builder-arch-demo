import { IDisposable, DisposableStore } from '../bedrock/dispose';
import { BridgeService } from './bridge.service';

/**
 * HTTP 请求方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * HTTP 请求配置
 */
export interface HttpRequestConfig {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
}

/**
 * HTTP 响应
 */
export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * 请求拦截器
 */
export type RequestInterceptor = (config: HttpRequestConfig) => HttpRequestConfig | Promise<HttpRequestConfig>;

/**
 * 响应拦截器
 */
export type ResponseInterceptor = <T>(response: HttpResponse<T>) => HttpResponse<T> | Promise<HttpResponse<T>>;

/**
 * 错误拦截器
 */
export type ErrorInterceptor = (error: Error) => Error | Promise<Error>;

/**
 * HTTP 服务
 * 基于 JSBridge 的 fetch 实现，提供请求/响应拦截器、错误处理等功能
 */
export class HttpService implements IDisposable {
  readonly _serviceBrand: undefined;
  private disposables = new DisposableStore();
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private pendingRequests = new Set<AbortController>();

  // 默认配置
  private defaultConfig: Partial<HttpRequestConfig> = {
    method: 'GET',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  constructor(private bridge: BridgeService) { }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index > -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index > -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * 添加错误拦截器
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index > -1) {
        this.errorInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * 发起请求
   */
  async request<T = any>(config: HttpRequestConfig): Promise<T> {
    // 合并配置
    let finalConfig: HttpRequestConfig = {
      ...this.defaultConfig,
      ...config,
      headers: {
        ...this.defaultConfig.headers,
        ...config.headers,
      },
    };

    try {
      // 执行请求拦截器
      for (const interceptor of this.requestInterceptors) {
        finalConfig = await interceptor(finalConfig);
      }

      // 处理 query 参数
      if (finalConfig.params) {
        const queryString = new URLSearchParams(finalConfig.params).toString();
        finalConfig.url = `${finalConfig.url}${finalConfig.url.includes('?') ? '&' : '?'}${queryString}`;
      }

      // 创建 AbortController（用于取消请求）
      const controller = new AbortController();
      this.pendingRequests.add(controller);

      try {
        // 通过 JSBridge 发起请求
        const response = await this.bridge.call<HttpResponse<T>>('fetch', {
          url: finalConfig.url,
          method: finalConfig.method,
          headers: finalConfig.headers,
          body: finalConfig.data ? JSON.stringify(finalConfig.data) : undefined,
          timeout: finalConfig.timeout,
        });

        // 执行响应拦截器
        let finalResponse = response;
        for (const interceptor of this.responseInterceptors) {
          finalResponse = await interceptor(finalResponse);
        }

        return finalResponse.data;
      } finally {
        this.pendingRequests.delete(controller);
      }
    } catch (error) {
      // 执行错误拦截器
      let finalError = error as Error;
      for (const interceptor of this.errorInterceptors) {
        finalError = await interceptor(finalError);
      }

      throw finalError;
    }
  }

  /**
   * GET 请求
   */
  async get<T = any>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>): Promise<T> {
    return this.request<T>({
      ...config,
      url,
      method: 'GET',
    });
  }

  /**
   * POST 请求
   */
  async post<T = any>(url: string, data?: any, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>): Promise<T> {
    return this.request<T>({
      ...config,
      url,
      method: 'POST',
      data,
    });
  }

  /**
   * PUT 请求
   */
  async put<T = any>(url: string, data?: any, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>): Promise<T> {
    return this.request<T>({
      ...config,
      url,
      method: 'PUT',
      data,
    });
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>): Promise<T> {
    return this.request<T>({
      ...config,
      url,
      method: 'DELETE',
    });
  }

  /**
   * 取消所有未完成的请求
   */
  cancelAll(): void {
    this.pendingRequests.forEach((controller) => {
      controller.abort();
    });
    this.pendingRequests.clear();
  }

  dispose(): void {
    // 取消所有未完成的请求
    this.cancelAll();

    // 清空拦截器
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];

    this.disposables.dispose();
  }
}

/**
 * 创建带有常用拦截器的 HttpService 实例
 */
export function createHttpService(bridge: BridgeService, options?: {
  baseURL?: string;
  token?: string;
}): HttpService {
  const http = new HttpService(bridge);

  // 添加 baseURL 拦截器
  if (options?.baseURL) {
    http.addRequestInterceptor((config) => {
      if (!config.url.startsWith('http')) {
        config.url = `${options.baseURL}${config.url}`;
      }
      return config;
    });
  }

  // 添加 token 拦截器
  if (options?.token) {
    http.addRequestInterceptor((config) => {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${options.token}`,
      };
      return config;
    });
  }

  // 添加通用错误处理
  http.addErrorInterceptor((error) => {
    console.error('[HttpService] Request failed:', error);
    return error;
  });

  return http;
}
