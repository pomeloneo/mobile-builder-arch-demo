// service特征标识
export type BrandedService = { _serviceBrand: undefined };

//
// 服务唯一标识符（编译时生成）
// 需要DI进行注入的服务必须拥有该标识符
// 本质上是一个参数装饰器
//
export interface ServiceIdentifier<T> {
  (...args: any[]): void;
  type: T;
}

// 获取服务的视图接口
export interface ServicesAccessor {
  get: <T>(id: ServiceIdentifier<T>) => T;
}

// 服务唯一标识符存储
const serviceIds = new Map<string, ServiceIdentifier<any>>();

export const DI_TARGET = '$di$target';
export const DI_DEPENDENCIES = '$di$dependencies';

// 获取某个服务的依赖
// 因为服务依赖关系会存放在构造函数的属性上
export function getServiceDependencies(ctor: any): { id: ServiceIdentifier<any>; index: number }[] {
  return ctor[DI_DEPENDENCIES] || [];
}

// 更新服务依赖依赖关系
function setServiceDependency(id: ServiceIdentifier<any>, ctor: any, index: number): void {
  if (ctor[DI_TARGET] === ctor) {
    ctor[DI_DEPENDENCIES].push({ id, index });
  } else {
    ctor[DI_DEPENDENCIES] = [{ id, index }];
    ctor[DI_TARGET] = ctor;
  }
}

//
// 创建服务唯一标识符
// 传入服务ID，返回一个参数装饰器
// 参数装饰器会记录A需要
//   const IFooServiceId = createDecorator<FooService>('FooService');
//
//   class Bar
//     constructor(@IFooServiceId a: IFooService)  // IFooService是接口声明
//
export function createDecorator<T>(serviceId: string): ServiceIdentifier<T> {
  if (serviceIds.has(serviceId)) {
    return serviceIds.get(serviceId)!;
  }

  const id = function (target: any, key: string, index: number): any {
    if (arguments.length !== 3) {
      throw new Error('@IServiceName-decorator can only be used to decorate a parameter');
    }
    setServiceDependency(id, target, index);
  } as any;

  id.toString = () => serviceId;

  serviceIds.set(serviceId, id);
  return id;
}

export function refineServiceDecorator<T1, T extends T1>(
  serviceIdentifier: ServiceIdentifier<T1>,
): ServiceIdentifier<T> {
  return serviceIdentifier as ServiceIdentifier<T>;
}
