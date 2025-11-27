import { lvAssert } from '../assert';
import type { BrandedService, ServiceIdentifier } from './base';
import { SyncDescriptor } from './descriptor';
import { ServiceCollection } from './service-collection';
import { ServiceOwnershipCollection, ServiceOwnership } from './service-ownership-collection';

export enum InstantiationType {
  Eager = 0,
  Delayed = 1,
}

interface IServiceRegistryConfig {
  checkDuplicate?: boolean;
}

export class ServiceRegistry {
  protected readonly _registry: [ServiceIdentifier<any>, SyncDescriptor<any> | BrandedService][] = [];
  protected readonly _serviceOwnership: ServiceOwnershipCollection = new ServiceOwnershipCollection();
  // 重复检测的id记录
  private readonly _ids: Set<string> = new Set<string>();
  // 是否进行相同id服务注册的冲突检测
  private readonly _checkDuplicate: boolean;

  constructor(config: IServiceRegistryConfig = {}) {
    this._checkDuplicate = config.checkDuplicate ?? false;
  }

  get registry() {
    return this._registry;
  }

  /**
   * 注册服务，通过传入构造函数或者描述符
   */
  register<T, Services extends BrandedService[]>(
    id: ServiceIdentifier<T>,
    ctor: new (...services: Services) => T,
    supportsDelayedInstantiation?: boolean | InstantiationType,
  ): void;
  register<T, Services extends BrandedService[]>(
    id: ServiceIdentifier<T>,
    descriptor: SyncDescriptor<any>,
  ): void;
  register<T, Services extends BrandedService[]>(
    id: ServiceIdentifier<T>,
    ctorOrDescriptor: { new (...services: Services): T } | SyncDescriptor<any>,
    supportsDelayedInstantiation?: boolean | InstantiationType,
  ) {
    // 无论是构造函数还是描述符，最终加入到registry中的都会转为描述符
    if (!(ctorOrDescriptor instanceof SyncDescriptor)) {
      ctorOrDescriptor = new SyncDescriptor<T>(
        ctorOrDescriptor as new (...args: any[]) => T,
        [],
        Boolean(supportsDelayedInstantiation),
      );
    }

    // 如果开启了检测，判断是否有id重复
    if (this._checkDuplicate) {
      lvAssert(!this._ids.has(id.toString()), `service: ${id.toString()} duplicate register.`);
      this._ids.add(id.toString());
    }

    this._registry.push([id, ctorOrDescriptor]);
  }

  /**
   * 直接注册一个服务的实例
   *
   * 注意：谨慎使用，优先使用register
   * 一般用于特殊场景：需要先于DI之前就构造了某个service
   */
  registerInstance<T extends BrandedService>(
    id: ServiceIdentifier<T>,
    instance: T,
    options?: {
      ownership: ServiceOwnership;
    },
  ) {
    // 如果开启了检测，判断是否有id重复
    if (this._checkDuplicate) {
      lvAssert(!this._ids.has(id.toString()), `service: ${id.toString()} duplicate register.`);
      this._ids.add(id.toString());
    }

    this._registry.push([id, instance]);
    this._serviceOwnership.set(id, options?.ownership ?? ServiceOwnership.Owned);
  }

  makeCollection(): ServiceCollection {
    const serviceCollection = new ServiceCollection({
      ownership: this._serviceOwnership,
    });
    for (const [id, instanceOrDescriptor] of this.registry) {
      serviceCollection.set(id, instanceOrDescriptor);
    }
    return serviceCollection;
  }
}
