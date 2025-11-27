import { SharedMutex } from '@/kernel/lock';
import type { BrandedService } from '../base';
import { IInstantiationService } from '../instantiation-service.interface';

export interface ILazyServiceLoader<T> {
  readonly _serviceBrand: undefined;

  getInstance: (...rest: any[]) => Promise<T>;
  loaded: boolean;
  preload: () => void;
}

type ILoaderResult<T> = {
  default: new (...args: any[]) => T;
};

type ILoaderResult0<T> = new (...args: any[]) => T;

export abstract class LazyServiceLoader<T extends BrandedService> implements ILazyServiceLoader<T> {
  readonly _serviceBrand: undefined;

  // 真实的service
  protected _instance?: T;

  private readonly _sharedMutex: SharedMutex = new SharedMutex();

  constructor(@IInstantiationService protected readonly _instantiationService: IInstantiationService) { }

  public get loaded() {
    return Boolean(this._instance);
  }

  public preload() {
    this._getModule();
  }

  // 创建模块实例
  public async getInstance(): Promise<T> {
    // 必须上写锁
    // 本质上该函数是 getOrCreateInstance，包含了写行为
    await this._sharedMutex.lock();
    try {
      if (this._instance) {
        return this._instance;
      }
      this._instance = await this._makeInstance(...this._getStaticArguments());
      return this._instance!;
    } finally {
      this._sharedMutex.unLock();
    }
  }

  // 加载module，获取实例
  protected async _makeInstance(...rest: any[]): Promise<T> {
    const module = await this._getModule();
    if ((module as ILoaderResult<T>).default) {
      return this._instantiationService.createInstance((module as ILoaderResult<T>).default, ...rest);
    } else {
      return this._instantiationService.createInstance(module as ILoaderResult0<T>, ...rest);
    }
  }

  // 获取模块的纯虚函数
  // 派生类必须复写
  protected abstract _getModule(): Promise<ILoaderResult<T> | ILoaderResult0<T>>;

  // 获取模块的静态参数，子类可以复写
  protected _getStaticArguments(): any[] {
    return [];
  }
}
