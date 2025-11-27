export type { BrandedService } from './base';
export type { ServiceIdentifier } from './base';
export type { ServicesAccessor } from './base';
export { createDecorator } from './base';
export { refineServiceDecorator } from './base';

export { SyncDescriptor } from './descriptor';

export type { GetLeadingNonServiceArgs } from './instantiation-service.interface';
export { IInstantiationService } from './instantiation-service.interface';
export { InstantiationService } from './instantiation-service';

// alias进行历史命名兼容
export { InstantiationService as ContainerService } from './instantiation-service';
export { IInstantiationService as IContainerService } from './instantiation-service.interface';

export { getService } from './instantiation-service';
export { InstantiationErrorType } from './instantiation-service';

export type { IServiceCollection } from './service-collection';
export { ServiceCollection } from './service-collection';

export { ServiceOwnership } from './service-ownership-collection';

export { ServiceRegistry } from './service-registry';

export type { LazyService } from './lazy/type';

export type { ILazyServiceLoader } from './lazy/lazy-service';
export { LazyServiceLoader } from './lazy/lazy-service';

export { makeLazyServiceIdleLoad } from './lazy/idle-load';
