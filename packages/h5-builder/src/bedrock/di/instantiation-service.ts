/* eslint-disable @typescript-eslint/naming-convention */
import { IdleValue } from './idle-value';
import type { SyncDescriptor0 } from './descriptor';
import { SyncDescriptor } from './descriptor';
import { Graph } from '../structure/graph';
import { ServiceCollection } from './service-collection';
import { makeProxy } from './proxy-builder';
import type { ServiceIdentifier, ServicesAccessor } from './base';
import { getServiceDependencies } from './base';
import type { GetLeadingNonServiceArgs } from './instantiation-service.interface';
import { IInstantiationService } from './instantiation-service.interface';
import { Trace } from './trace';
import { Emitter, type Event } from '../event';
import { Logger } from '@/bedrock/_internal/logger';
import { isDisposable, SET_PARENT_OF_DISPOSABLE } from '@/bedrock/dispose';
import { ServiceOwnership } from './service-ownership-collection';

// 依赖图
type DepGraph = Graph<string, any>;

// TRACING
const _enableAllTracing = false;
// || "TRUE" // DO NOT CHECK IN!
class CyclicDependencyError extends Error {
  constructor(graph: DepGraph) {
    super('cyclic dependency between services');
    this.message = graph.findCycleSlow() ?? `UNABLE to detect cycle, dumping graph: \n${graph.toString()}`;
  }
}

export enum InstantiationErrorType {
  UnknownDependency = 'UnknownDependency',
}
interface IBaseErrorEvent {
  errorType: InstantiationErrorType;
  message: string;
}

interface IUnknownDependencyErrorEvent extends IBaseErrorEvent {
  errorType: InstantiationErrorType.UnknownDependency;
  dependencyId: string;
  issuer: string;
}

type ErrorDataType = IUnknownDependencyErrorEvent;

/**
 * 从容器中获取对应的service
 * @param instantiationService
 * @param id
 * @returns Service<T>
 *
 * @remarks 减少使用该方法，尽量将业务函数作为invokeFunction的参数，从accessor中获取你所期望的service
 */
export function getService<T>(instantiationService: IInstantiationService, id: ServiceIdentifier<T>) {
  return instantiationService.invokeFunction((accessor) => {
    return accessor.get(id);
  });
}

export class InstantiationService implements IInstantiationService {
  readonly _serviceBrand: undefined;
  // 全局依赖图，开启tracing才会生成，整个instantiationSerive父子链上只会有一个globalGraph
  readonly _globalGraph?: DepGraph;
  // 该instantiationService所包含的服务集合
  protected readonly _services: ServiceCollection;
  // 父instantiationService
  private readonly _parent?: InstantiationService;
  private readonly _childs = new Set<IInstantiationService>();
  // 是否开启tracing
  private readonly _enableTracing: boolean;
  // 隐式依赖
  private _globalGraphImplicitDependency?: string;
  // 记录当前正在创建的服务，防止循环依赖
  private readonly _activeInstantiations = new Set<ServiceIdentifier<any>>();

  private _emitter: Emitter<[ErrorDataType]> | null = null;

  constructor(
    services: ServiceCollection = new ServiceCollection(),
    parent?: InstantiationService,
    enableTracing: boolean = _enableAllTracing,
  ) {
    this._services = services;
    this._services.set(IInstantiationService, this);

    this._parent = parent;
    if (this._parent) {
      // 建立父子关系
      this._parent._childs.add(this);
    }

    this._enableTracing = enableTracing;
    if (enableTracing) {
      this._globalGraph = parent?._globalGraph ?? new Graph((e) => e);
    }
  }

  get services(): ServiceCollection {
    return this._services;
  }

  // 仅限 Flow 调用
  get onError(): Event<[ErrorDataType]> {
    if (!this._emitter) {
      this._emitter = new Emitter<[ErrorDataType]>();
    }
    return this._emitter.event;
  }

  // 创建子instantiationService
  createChild(services: ServiceCollection): IInstantiationService {
    return new InstantiationService(services, this, this._enableTracing);
  }

  // 提供通过instantiationService直接获取到内部服务的能力
  // 返回servicesAccessor这一视图类，并不暴露instantiationService内部接口
  invokeFunction<R, TS extends any[] = []>(
    fn: (accessor: ServicesAccessor, ...args: TS) => R,
    ...args: TS
  ): R {
    const _trace = Trace.traceInvocation(this._enableTracing, fn);
    let _done = false;
    try {
      const accessor: ServicesAccessor = {
        get: <T>(id: ServiceIdentifier<T>) => {
          if (_done) {
            throw new Error('service accessor is only valid during the invocation of its target method');
          }

          const result = this._getOrCreateServiceInstance(id, _trace);
          if (!result) {
            this._handleError({
              errorType: InstantiationErrorType.UnknownDependency,
              issuer: 'service-accessor',
              dependencyId: `${id}`,
              message: `[invokeFunction] unknown service '${id}'`,
            });
          }
          return result;
        },
      };
      return fn(accessor, ...args);
    } finally {
      _done = true;
      _trace.stop();
    }
  }

  // 通过描述符创建一个实例
  createInstance<T>(descriptor: SyncDescriptor0<T>): T;
  // 通过构造函数直接创建一个实例
  createInstance<Ctor extends new (...args: any[]) => any, R extends InstanceType<Ctor>>(
    ctor: Ctor,
    ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>
  ): R;
  createInstance<T, Ctor extends new (...args: any[]) => any, R extends InstanceType<Ctor>>(
    descriptor: SyncDescriptor<T>,
    ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>
  ): R;
  createInstance(ctorOrDescriptor: any | SyncDescriptor<any>, ...rest: any[]): any {
    let _trace: Trace, result: any;
    if (ctorOrDescriptor instanceof SyncDescriptor) {
      _trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor.ctor);
      result = this._createInstance(
        ctorOrDescriptor.ctor,
        ctorOrDescriptor.staticArguments.concat(rest),
        _trace,
      );
    } else {
      _trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor);
      result = this._createInstance(ctorOrDescriptor, rest, _trace);
    }
    _trace.stop();
    return result;
  }

  dispose() {
    // 子容器进行dispose
    for (const child of this._childs) {
      child.dispose();
    }

    // 断开父容器
    this._parent?._childs.delete(this);

    // 内部服务进行清理
    for (const [identifier, instanceOrDescriptor] of this._services.entries) {
      if (instanceOrDescriptor instanceof SyncDescriptor) {
        continue;
      }
      if (instanceOrDescriptor === this) {
        continue;
      }
      if (instanceOrDescriptor.__origin__ === this) {
        continue;
      }
      if (isDisposable(instanceOrDescriptor)) {
        const ownerShip = this._services.ownerships?.get(identifier);

        // eslint-disable-next-line max-depth
        switch (ownerShip) {
          case ServiceOwnership.Reference:
            // skip dispose..
            break;
          case ServiceOwnership.Owned:
          default:
            instanceOrDescriptor.dispose();
            break;
        }
      }
    }
  }

  // 创建实例
  private _createInstance<T>(ctor: any, args: any[] = [], _trace: Trace): T {
    // 获取服务构造中的依赖情况，按参数顺序排列
    const serviceDependencies = getServiceDependencies(ctor).sort((a, b) => a.index - b.index);
    const serviceArgs: any[] = [];
    // 先构造依赖的服务
    for (const dependency of serviceDependencies) {
      const service = this._getOrCreateServiceInstance(dependency.id, _trace);
      if (!service) {
        this._handleError({
          errorType: InstantiationErrorType.UnknownDependency,
          issuer: `create-instance-${ctor.name}`,
          dependencyId: `${dependency.id}`,
          message: `[createInstance] ${ctor.name} depends on UNKNOWN service ${dependency.id}.`,
        });
      }
      serviceArgs.push(service);
    }

    // 找到第一个服务的参数
    const firstServiceArgPos = serviceDependencies.length > 0 ? serviceDependencies[0].index : args.length;

    // 如果参数不匹配，调整静态参数位置
    if (args.length !== firstServiceArgPos) {
      Logger.trace(
        `[createInstance] First service dependency of ${ctor.name} at position ${firstServiceArgPos + 1
        } conflicts with ${args.length} static arguments`,
      );

      const delta = firstServiceArgPos - args.length;
      if (delta > 0) {
        args = args.concat(new Array(delta));
      } else {
        args = args.slice(0, firstServiceArgPos);
      }
    }

    // 通过createInstance明确指定的服务一定是立刻创建
    return Reflect.construct<any, T>(ctor, args.concat(serviceArgs));
  }

  // 保存服务实例
  private _setServiceInstance<T>(id: ServiceIdentifier<T>, instance: T): void {
    if (this._services.get(id) instanceof SyncDescriptor) {
      this._services.set(id, instance);
    } else if (this._parent) {
      this._parent._setServiceInstance(id, instance);
    } else {
      throw new Error('illegalState - setting UNKNOWN service instance');
    }
  }

  // 获取服务实例或者描述符
  private _getServiceInstanceOrDescriptor<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> {
    const instanceOrDesc = this._services.get(id);
    if (!instanceOrDesc && this._parent) {
      return this._parent._getServiceInstanceOrDescriptor(id);
    } else {
      return instanceOrDesc;
    }
  }

  // 获取服务实例，没有的话就创建
  private _getOrCreateServiceInstance<T>(id: ServiceIdentifier<T>, _trace: Trace): T {
    if (this._globalGraph && this._globalGraphImplicitDependency) {
      this._globalGraph.insertEdge(this._globalGraphImplicitDependency, String(id));
    }
    const thing = this._getServiceInstanceOrDescriptor(id);
    if (thing instanceof SyncDescriptor) {
      return this._safeCreateAndCacheServiceInstance(id, thing, _trace.branch(id, true));
    } else {
      _trace.branch(id, false);
      return thing;
    }
  }

  // 安全的创建并且记录在缓存中
  private _safeCreateAndCacheServiceInstance<T>(
    id: ServiceIdentifier<T>,
    desc: SyncDescriptor<T>,
    _trace: Trace,
  ): T {
    if (this._activeInstantiations.has(id)) {
      throw new Error(`illegal state - RECURSIVELY instantiating service '${id}'`);
    }
    this._activeInstantiations.add(id);
    try {
      return this._createAndCacheServiceInstance(id, desc, _trace);
    } finally {
      this._activeInstantiations.delete(id);
    }
  }

  // 非安全创建并记录在缓存中
  // 核心方法，服务创建的最基础流程
  private _createAndCacheServiceInstance<T>(
    id: ServiceIdentifier<T>,
    desc: SyncDescriptor<T>,
    _trace: Trace,
  ): T {
    type Triple = {
      id: ServiceIdentifier<any>;
      desc: SyncDescriptor<any>;
      _trace: Trace;
    };
    // 记录一个临时依赖图
    const graph = new Graph<string, Triple>((data) => data.id.toString());

    let cycleCount = 0;
    // dfs
    const stack = [{ id, desc, _trace }];
    while (stack.length) {
      const item = stack.pop()!;
      graph.lookupOrInsertNode(item);

      // a weak but working heuristic for cycle checks
      if (cycleCount++ > 1000) {
        throw new CyclicDependencyError(graph);
      }

      // 检查所有依赖项，并添加记录
      // check all dependencies for existence and if they need to be created first
      for (const dependency of getServiceDependencies(item.desc.ctor)) {
        const instanceOrDesc = this._getServiceInstanceOrDescriptor(dependency.id);
        if (!instanceOrDesc) {
          this._handleError({
            errorType: InstantiationErrorType.UnknownDependency,
            issuer: `create-service-${id}`,
            dependencyId: `${dependency.id}`,
            message: `[createInstance] ${id} depends on ${dependency.id} which is NOT registered.`,
          });
        }

        // 全局的依赖图中需要添加
        this._globalGraph?.insertEdge(String(item.id), String(dependency.id));

        if (instanceOrDesc instanceof SyncDescriptor) {
          const d = {
            id: dependency.id,
            desc: instanceOrDesc,
            _trace: item._trace.branch(dependency.id, true),
          };
          // 当依赖没有初始化为实例，仍然是描述符式，添加到临时依赖图
          graph.insertEdge(item, d);
          stack.push(d);
        }
      }
    }

    // 将临时依赖图（只有描述符）初始化成服务实例
    while (true) {
      // 找到图的根节点集合
      const leafs = graph.leafs();

      // 临时依赖图中含有节点，但是没有叶子节点，意味着有循环依赖
      if (leafs.length === 0) {
        if (!graph.isEmpty()) {
          throw new CyclicDependencyError(graph);
        }
        break;
      }

      // 迭代子节点
      for (const { data } of leafs) {
        const instanceOrDesc = this._getServiceInstanceOrDescriptor(data.id);
        // 一定要重复检查，因为data可能会有重复的（某个服务被多个服务依赖）
        if (instanceOrDesc instanceof SyncDescriptor) {
          const instance = this._createServiceInstanceWithOwner(
            data.id,
            data.desc.ctor,
            data.desc.staticArguments,
            data.desc.supportsDelayedInstantiation,
            data._trace,
          );
          this._setServiceInstance(data.id, instance);
        }
        graph.removeNode(data);
      }
    }
    // 一定返回的是实例
    return this._getServiceInstanceOrDescriptor(id) as T;
  }

  // 创建服务实例（会判断在哪层instantiation中判断）
  private _createServiceInstanceWithOwner<T>(
    id: ServiceIdentifier<T>,
    ctor: any,
    args: any[] = [],
    supportsDelayedInstantiation: boolean,
    _trace: Trace,
  ): T {
    // 如果注册在本层，就在本层创建
    if (this._services.get(id) instanceof SyncDescriptor) {
      return this._createServiceInstance(id, ctor, args, supportsDelayedInstantiation, _trace);
    } else if (this._parent) {
      // 本层没有尝试去上层找
      return this._parent._createServiceInstanceWithOwner(
        id,
        ctor,
        args,
        supportsDelayedInstantiation,
        _trace,
      );
    } else {
      throw new Error(`illegalState - creating UNKNOWN service instance ${ctor.name}`);
    }
  }

  // 准备创建服务实例
  private _createServiceInstance<T>(
    id: ServiceIdentifier<T>,
    ctor: any,
    args: any[] = [],
    supportsDelayedInstantiation: boolean,
    _trace: Trace,
  ): T {
    // 如果不支持延迟初始化，走同步逻辑
    if (!supportsDelayedInstantiation) {
      return this._createService(ctor, args, _trace);
    }
    // 使用IdleValue容器包装真正的对象，按需要进行初始化
    const idle = new IdleValue<T>(() => this._createService<T>(ctor, args, _trace));
    // 实现了一个proxy
    // 当真正需要的时候，才会去构造
    return makeProxy(idle, ctor);
  }

  // 创建服务
  private _createService<T>(ctor: any, args: any[] = [], _trace: Trace): T {
    // 通过createInstance明确指定的服务一定是立刻创建
    const service = this._createInstance<T>(ctor, args, _trace);
    if (isDisposable(service)) {
      SET_PARENT_OF_DISPOSABLE(service, this);
    }
    return service;
  }

  // 处理错误
  private _handleError(errorData: ErrorDataType) {
    // 错误统一上报到顶层容器
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let topInstantiationService: InstantiationService = this;
    while (topInstantiationService._parent) {
      topInstantiationService = topInstantiationService._parent;
    }
    // 触发顶层容器的错误监听
    if (topInstantiationService._emitter) {
      topInstantiationService._emitter.fire(errorData);
    }

    throw new Error(errorData.message);
  }
}
