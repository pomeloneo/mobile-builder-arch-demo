import { IInstantiationService } from '../instantiation-service.interface';
import { lvSchedulerCallback } from '@/scheduler';
import { type ILazyServiceLoader, LazyServiceLoader } from './lazy-service';
import { SyncDescriptor } from '../descriptor';
import type { BrandedService } from '../base';

class IdleServiceLoader<T extends BrandedService> implements ILazyServiceLoader<T> {
  public readonly _serviceBrand: undefined;

  protected _service: ILazyServiceLoader<T>;

  constructor(
    originService: new (...args: any[]) => LazyServiceLoader<T>,
    staticArguments: any[],
    @IInstantiationService protected readonly _instantiationService: IInstantiationService,
  ) {
    this._service = this._instantiationService.createInstance(originService, ...staticArguments);
    lvSchedulerCallback(() => this._service.preload());
  }

  get loaded() {
    return this._service.loaded;
  }

  getInstance() {
    return this._service.getInstance();
  }

  preload() {
    this._service.preload();
  }
}

export function makeLazyServiceIdleLoad<T extends BrandedService>(
  ctor: new (..._args: any[]) => ILazyServiceLoader<T>,
  staticArguments: any[] = [],
): SyncDescriptor<ILazyServiceLoader<T>> {
  return new SyncDescriptor<ILazyServiceLoader<T>>(IdleServiceLoader, [ctor, staticArguments]);
}
