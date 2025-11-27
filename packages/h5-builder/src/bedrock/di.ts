import { DisposableStore, IDisposable } from './disposable';

/**
 * 依赖注入容器
 * 负责管理服务的创建、获取和销毁
 */
export class Injector implements IDisposable {
  private services = new Map<any, any>();
  private disposables = new DisposableStore();
  private _isDisposed = false;

  constructor(
    private parent?: Injector,
    public name = 'Injector'
  ) { }

  /**
   * 创建子容器
   * 子容器可以访问父容器的服务，但父容器无法访问子容器的服务
   * @param name 容器名称，用于调试
   */
  createChild(name?: string): Injector {
    if (this._isDisposed) {
      throw new Error(`[${this.name}] Cannot create child from disposed injector`);
    }

    const child = new Injector(this, name || `${this.name}-Child`);
    // 父容器销毁时，自动销毁所有子容器
    this.disposables.add(child);
    return child;
  }

  /**
   * 注册服务实例
   * @param token 服务标识（通常是类本身）
   * @param instance 服务实例
   */
  registerInstance<T>(token: any, instance: T): void {
    if (this._isDisposed) {
      throw new Error(`[${this.name}] Cannot register to disposed injector`);
    }

    if (this.services.has(token)) {
      console.warn(`[${this.name}] Service ${token.name || token} already registered, overwriting`);
    }

    this.services.set(token, instance);
  }

  /**
   * 获取服务实例
   * 优先从当前容器查找，找不到则从父容器查找
   * @param token 服务标识
   */
  get<T>(token: any): T {
    if (this._isDisposed) {
      throw new Error(`[${this.name}] Cannot get from disposed injector`);
    }

    const service = this.services.get(token);
    if (service !== undefined) {
      return service;
    }

    if (this.parent) {
      return this.parent.get(token);
    }

    throw new Error(
      `[${this.name}] Service not found: ${token.name || token}. ` +
      `Make sure it's registered in this injector or a parent injector.`
    );
  }

  /**
   * 检查服务是否已注册
   * @param token 服务标识
   * @param checkParent 是否检查父容器
   */
  has(token: any, checkParent = true): boolean {
    if (this.services.has(token)) {
      return true;
    }

    if (checkParent && this.parent) {
      return this.parent.has(token);
    }

    return false;
  }

  /**
   * 实例化一个类，并自动注入它需要的依赖
   * @param Ctor 要实例化的类
   * @param staticArgs 静态参数（如 id, props）
   */
  resolveAndInstantiate<T>(Ctor: any, staticArgs: any[] = []): T {
    if (this._isDisposed) {
      throw new Error(`[${this.name}] Cannot instantiate from disposed injector`);
    }

    // 获取通过 @Inject 装饰器标记的依赖
    const injections: any[] = Ctor['__injections__'] || [];
    const args = staticArgs.slice();

    // 填充注入的依赖到对应位置
    injections.forEach((token: any, index: number) => {
      if (token) {
        args[index] = this.get(token);
      }
    });

    return new Ctor(...args);
  }

  /**
   * 销毁容器及其所有服务
   */
  dispose(): void {
    if (this._isDisposed) {
      console.warn(`[${this.name}] Already disposed`);
      return;
    }

    this._isDisposed = true;
    console.group(`[${this.name}] Disposing`);

    // 1. 销毁所有 Service
    this.services.forEach((service, token) => {
      if (service && typeof service.dispose === 'function') {
        try {
          console.log(`  ✓ ${token.name || token}`);
          service.dispose();
        } catch (error) {
          console.error(`  ✗ ${token.name || token} disposal failed:`, error);
        }
      }
    });

    // 2. 清空容器
    this.services.clear();

    // 3. 销毁子容器和其他资源
    this.disposables.dispose();

    console.groupEnd();
  }

  /**
   * 获取容器状态信息（用于调试）
   */
  getDebugInfo(): {
    name: string;
    isDisposed: boolean;
    serviceCount: number;
    services: string[];
  } {
    return {
      name: this.name,
      isDisposed: this._isDisposed,
      serviceCount: this.services.size,
      services: Array.from(this.services.keys()).map((token) => token.name || String(token)),
    };
  }
}

/**
 * 依赖注入装饰器
 * 用于标记构造函数参数需要注入的服务
 * 
 * @example
 * class MyModel {
 *   constructor(
 *     public id: string,
 *     @Inject(HttpService) private http: HttpService
 *   ) {}
 * }
 */
export function Inject(token: any) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const injections = target['__injections__'] || [];
    injections[parameterIndex] = token;
    target['__injections__'] = injections;
  };
}
