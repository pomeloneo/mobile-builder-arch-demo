import type { BrandedService, ServicesAccessor } from './base';
import { createDecorator } from './base';
import type { SyncDescriptor0 } from './descriptor';
import type { ServiceCollection } from './service-collection';

export type GetLeadingNonServiceArgs<TArgs extends any[]> = TArgs extends []
  ? []
  : TArgs extends [...infer TFirst, BrandedService]
  ? GetLeadingNonServiceArgs<TFirst>
  : TArgs;

export interface IInstantiationService {
  readonly _serviceBrand: undefined;

  /**
   * Synchronously creates an instance that is denoted by the descriptor
   */
  createInstance: {
    <T>(descriptor: SyncDescriptor0<T>): T;
    <Ctor extends new (...args: any[]) => any, R extends InstanceType<Ctor>>(
      ctor: Ctor,
      ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>
    ): R;
  };

  /**
   * Calls a function with a service accessor.
   */
  invokeFunction: <R, TS extends any[] = []>(
    fn: (accessor: ServicesAccessor, ...args: TS) => R,
    ...args: TS
  ) => R;

  /**
   * Creates a child of this service which inherits all current services
   * and adds/overwrites the given services.
   */
  createChild: (services: ServiceCollection) => IInstantiationService;

  /**
   * 生命周期归属该DI上下文的服务进行销毁
   */
  dispose: () => void;
}

export const IInstantiationService = createDecorator<IInstantiationService>('instantiation');
