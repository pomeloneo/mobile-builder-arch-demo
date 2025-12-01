//
// DI中服务描述符，本质上是构造函数的包装
//
// 必须提供服务构造函数
// 支持静态参数
// 支持配置是否延迟初始化
//
export class SyncDescriptor<T> {
  readonly ctor: new (...args: any[]) => T;
  readonly staticArguments: any[];
  readonly supportsDelayedInstantiation: boolean;

  constructor(
    ctor: new (...args: any[]) => T,
    staticArguments: any[] = [],
    supportsDelayedInstantiation = false,
  ) {
    this.ctor = ctor;
    this.staticArguments = staticArguments;
    this.supportsDelayedInstantiation = supportsDelayedInstantiation;
  }
}

//
// 特化描述符
// 1. 没有静态参数，没有动态参数，只存在注入参数
// 2. 默认延迟初始化
//
export interface SyncDescriptor0<T> {
  readonly ctor: new () => T;
}
