import { IDisposable } from '../bedrock/dispose';

/**
 * JSBridge 调用参数
 */
export interface BridgeCallParams {
  [key: string]: any;
}

/**
 * JSBridge 响应
 */
export interface BridgeResponse<T = any> {
  code: number;
  data: T;
  message?: string;
}

/**
 * JSBridge 方法定义
 */
export interface NativeBridge {
  invoke<T = any>(method: string, params: BridgeCallParams): Promise<BridgeResponse<T>>;
}

/**
 * 扩展 Window 接口
 */
declare global {
  interface Window {
    NativeBridge?: NativeBridge;
  }
}

/**
 * JSBridge 服务
 * 提供统一的 JSBridge 调用接口，支持 Mock 模式用于浏览器调试
 */
export class BridgeService implements IDisposable {
  readonly _serviceBrand: undefined;
  private isDebug: boolean;
  private mockResponses: Map<string, any> = new Map();

  constructor(isDebug = false) {
    this.isDebug = isDebug || !window.NativeBridge;
    this.setupMockResponses();
  }

  /**
   * 调用 JSBridge 方法
   * @param method 方法名
   * @param params 参数
   * @param timeout 超时时间（毫秒）
   */
  async call<T = any>(
    method: string,
    params: BridgeCallParams = {},
    timeout = 5000
  ): Promise<T> {
    if (this.isDebug) {
      return this.mockCall<T>(method, params);
    }

    return this.nativeCall<T>(method, params, timeout);
  }

  /**
   * 原生调用
   */
  private async nativeCall<T>(
    method: string,
    params: BridgeCallParams,
    timeout: number
  ): Promise<T> {
    if (!window.NativeBridge) {
      throw new Error('[BridgeService] NativeBridge not available');
    }

    // 创建超时 Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`[BridgeService] Call ${method} timeout`)), timeout);
    });

    try {
      // 竞速：原生调用 vs 超时
      const response = await Promise.race([
        window.NativeBridge.invoke<T>(method, params),
        timeoutPromise,
      ]);

      // 检查响应
      if (response.code !== 0) {
        throw new Error(response.message || `Bridge call failed: ${method}`);
      }

      return response.data;
    } catch (error) {
      console.error(`[BridgeService] Call ${method} failed:`, error);
      throw error;
    }
  }

  /**
   * Mock 调用（用于浏览器调试）
   */
  private async mockCall<T>(method: string, params: BridgeCallParams): Promise<T> {

    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 100));

    const mockData = this.mockResponses.get(method);
    if (mockData !== undefined) {
      return mockData as T;
    }

    console.warn(`[MockBridge] No mock data for method: ${method}`);
    return {} as T;
  }

  /**
   * 设置 Mock 响应
   */
  setMockResponse(method: string, data: any): void {
    this.mockResponses.set(method, data);
  }

  /**
   * 批量设置 Mock 响应
   */
  setMockResponses(responses: Record<string, any>): void {
    Object.entries(responses).forEach(([method, data]) => {
      this.mockResponses.set(method, data);
    });
  }

  /**
   * 设置 Mock 数据
   */
  private setupMockResponses(): void {
    this.setMockResponses({
      // 用户信息
      getUserInfo: {
        userId: '123456',
        userName: 'Test User',
        avatar: 'https://example.com/avatar.png',
      },

      // Toast
      toast: null,

      // 导航
      navigate: null,

      // 分享
      share: null,

      // 网络请求（用于 HttpService）
      fetch: {
        code: 0,
        data: {},
        message: 'Success',
      },
    });
  }

  dispose(): void {
    this.mockResponses.clear();
  }
}

/**
 * 常用 Bridge 方法封装
 */
export class BridgeHelpers {
  constructor(private bridge: BridgeService) { }

  /**
   * 获取用户信息
   */
  async getUserInfo(): Promise<{
    userId: string;
    userName: string;
    avatar?: string;
  }> {
    return this.bridge.call('getUserInfo');
  }

  /**
   * 显示 Toast
   */
  async toast(message: string, duration = 2000): Promise<void> {
    return this.bridge.call('toast', { message, duration });
  }

  /**
   * 导航到指定页面
   */
  async navigate(url: string, params?: Record<string, any>): Promise<void> {
    return this.bridge.call('navigate', { url, params });
  }

  /**
   * 分享
   */
  async share(options: {
    title: string;
    content: string;
    url?: string;
    imageUrl?: string;
  }): Promise<void> {
    return this.bridge.call('share', options);
  }

  /**
   * 网络请求（用于 HttpService）
   */
  async fetch<T = any>(options: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
  }): Promise<T> {
    return this.bridge.call('fetch', options);
  }
}
