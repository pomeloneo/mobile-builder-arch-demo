import { observable } from 'mobx-vue-lite';

/**
 * 用户信息
 */
export interface UserInfo {
  userId: string;
  userName: string;
  avatar?: string;
  [key: string]: any;
}

/**
 * 环境信息
 */
export interface EnvInfo {
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  osVersion: string;
  deviceModel?: string;
  [key: string]: any;
}

/**
 * 路由信息
 */
export interface RouteInfo {
  path: string;
  query: Record<string, string>;
  hash: string;
}

/**
 * 页面上下文服务
 * 提供页面级的共享状态，如用户信息、环境信息、路由信息等
 */
export class PageContextService {
  // 用户信息
  public userInfo: UserInfo | null = null;

  // 环境信息
  public envInfo: EnvInfo | null = null;

  // 路由信息
  public routeInfo: RouteInfo | null = null;

  // 是否处于 Debug 模式
  public isDebug = false;

  // 页面是否可见
  public isVisible = true;

  // 自定义状态
  public customState: Record<string, any> = {};

  constructor() {
    // 使整个对象响应式
    return observable(this) as this;
  }

  /**
   * 设置用户信息
   */
  setUserInfo(userInfo: UserInfo): void {
    this.userInfo = userInfo;
  }

  /**
   * 设置环境信息
   */
  setEnvInfo(envInfo: EnvInfo): void {
    this.envInfo = envInfo;
  }

  /**
   * 设置路由信息
   */
  setRouteInfo(routeInfo: RouteInfo): void {
    this.routeInfo = routeInfo;
  }

  /**
   * 设置 Debug 模式
   */
  setDebugMode(isDebug: boolean): void {
    this.isDebug = isDebug;
  }

  /**
   * 设置页面可见性
   */
  setVisibility(isVisible: boolean): void {
    this.isVisible = isVisible;
  }

  /**
   * 设置自定义状态
   */
  setCustomState(key: string, value: any): void {
    this.customState[key] = value;
  }

  /**
   * 获取自定义状态
   */
  getCustomState<T = any>(key: string): T | undefined {
    return this.customState[key] as T;
  }

  /**
   * 从 URL 解析路由信息
   */
  parseRouteFromURL(url: string = window.location.href): RouteInfo {
    const urlObj = new URL(url);
    const query: Record<string, string> = {};

    urlObj.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    return {
      path: urlObj.pathname,
      query,
      hash: urlObj.hash,
    };
  }

  /**
   * 检测环境
   */
  detectEnv(): Partial<EnvInfo> {
    const ua = navigator.userAgent;
    let platform: 'ios' | 'android' | 'web' = 'web';

    if (/iPhone|iPad|iPod/i.test(ua)) {
      platform = 'ios';
    } else if (/Android/i.test(ua)) {
      platform = 'android';
    }

    return {
      platform,
      appVersion: this.extractAppVersion(ua),
      osVersion: this.extractOSVersion(ua),
    };
  }

  /**
   * 从 UA 提取 App 版本
   */
  private extractAppVersion(ua: string): string {
    const match = ua.match(/AppVersion\/([\d.]+)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * 从 UA 提取 OS 版本
   */
  private extractOSVersion(ua: string): string {
    let match;

    // iOS
    match = ua.match(/OS ([\d_]+)/);
    if (match) {
      return match[1].replace(/_/g, '.');
    }

    // Android
    match = ua.match(/Android ([\d.]+)/);
    if (match) {
      return match[1];
    }

    return 'unknown';
  }
}
