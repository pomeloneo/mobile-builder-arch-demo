# API 参考

<cite>
**本文档中引用的文件**   
- [instantiation-service.interface.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.interface.ts)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)
- [service-registry.ts](file://packages/h5-builder/src/bedrock/di/service-registry.ts)
- [service-collection.ts](file://packages/h5-builder/src/bedrock/di/service-collection.ts)
- [descriptor.ts](file://packages/h5-builder/src/bedrock/di/descriptor.ts)
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts)
- [useObserver.ts](file://packages/mobx-vue-lite/src/useObserver.ts)
- [observer.ts](file://packages/mobx-vue-lite/src/observer.ts)
- [mobx.ts](file://packages/mobx-vue-lite/src/mobx.ts)
- [useLocalObservable.ts](file://packages/mobx-vue-lite/src/useLocalObservable.ts)
- [ObserverComponent.tsx](file://packages/mobx-vue-lite/src/ObserverComponent.tsx)
- [http.service.ts](file://packages/h5-builder/src/services/http.service.ts)
- [tracker.service.ts](file://packages/h5-builder/src/services/tracker.service.ts)
- [bridge.service.ts](file://packages/h5-builder/src/services/bridge.service.ts)
</cite>

## 目录
1. [DI系统API](#di系统api)
2. [响应式API](#响应式api)
3. [组件API](#组件api)
4. [服务API](#服务api)

## DI系统API

该系统提供依赖注入功能，通过`IInstantiationService`接口管理服务的创建、生命周期和依赖关系。

```mermaid
classDiagram
class IInstantiationService {
+_serviceBrand : undefined
+createInstance(descriptor : SyncDescriptor0~T~) : T
+createInstance(ctor : Ctor, ...args : GetLeadingNonServiceArgs~ConstructorParameters~Ctor~~) : R
+invokeFunction(fn : (accessor : ServicesAccessor, ...args : TS) => R, ...args : TS) : R
+createChild(services : ServiceCollection) : IInstantiationService
+dispose() : void
}
class InstantiationService {
-_services : ServiceCollection
-_parent : InstantiationService
-_childs : Set~IInstantiationService~
-_enableTracing : boolean
-_activeInstantiations : Set~ServiceIdentifier~any~~
+createInstance(ctorOrDescriptor : any | SyncDescriptor~any~, ...rest : any[]) : any
+invokeFunction(fn : (accessor : ServicesAccessor, ...args : TS) => R, ...args : TS) : R
+createChild(services : ServiceCollection) : IInstantiationService
+dispose() : void
-_createInstance(ctor : any, args : any[], _trace : Trace) : T
-_getOrCreateServiceInstance(id : ServiceIdentifier~T~, _trace : Trace) : T
-_safeCreateAndCacheServiceInstance(id : ServiceIdentifier~T~, desc : SyncDescriptor~T~, _trace : Trace) : T
-_createAndCacheServiceInstance(id : ServiceIdentifier~T~, desc : SyncDescriptor~T~, _trace : Trace) : T
-_createServiceInstanceWithOwner(id : ServiceIdentifier~T~, ctor : any, args : any[], supportsDelayedInstantiation : boolean, _trace : Trace) : T
-_createServiceInstance(id : ServiceIdentifier~T~, ctor : any, args : any[], supportsDelayedInstantiation : boolean, _trace : Trace) : T
-_createService(ctor : any, args : any[], _trace : Trace) : T
}
class ServiceCollection {
-_entries : Map~ServiceIdentifier~any~, any~
-_ownership : ServiceOwnershipCollection
+set(id : ServiceIdentifier~T~, instanceOrDescriptor : T | SyncDescriptor~T~) : void
+has(id : ServiceIdentifier~any~) : boolean
+get(id : ServiceIdentifier~T~) : T | SyncDescriptor~T~
}
class SyncDescriptor~T~ {
+ctor : new (...args : any[]) => T
+staticArguments : any[]
+supportsDelayedInstantiation : boolean
}
class ServiceRegistry {
-_registry : [ServiceIdentifier~any~, SyncDescriptor~any~ | BrandedService][]
-_serviceOwnership : ServiceOwnershipCollection
-_ids : Set~string~
-_checkDuplicate : boolean
+register(id : ServiceIdentifier~T~, ctor : new (...services : Services) => T, supportsDelayedInstantiation? : boolean | InstantiationType) : void
+register(id : ServiceIdentifier~T~, descriptor : SyncDescriptor~any~) : void
+registerInstance(id : ServiceIdentifier~T~, instance : T, options? : { ownership : ServiceOwnership }) : void
+makeCollection() : ServiceCollection
}
IInstantiationService <|.. InstantiationService : 实现
InstantiationService --> ServiceCollection : 使用
InstantiationService --> SyncDescriptor : 创建实例
ServiceRegistry --> SyncDescriptor : 创建描述符
ServiceRegistry --> ServiceCollection : 生成集合
```

**Diagram sources**
- [instantiation-service.interface.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.interface.ts#L12-L47)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L61-L468)
- [service-collection.ts](file://packages/h5-builder/src/bedrock/di/service-collection.ts#L14-L47)
- [descriptor.ts](file://packages/h5-builder/src/bedrock/di/descriptor.ts#L8-L22)
- [service-registry.ts](file://packages/h5-builder/src/bedrock/di/service-registry.ts#L16-L100)

### InstantiationService接口

`IInstantiationService`是依赖注入系统的核心接口，负责服务实例的创建和管理。

#### createInstance方法
创建指定服务的实例。

- **参数类型**:
  - `descriptor: SyncDescriptor0<T>`: 无参数构造的同步描述符
  - `ctor: Ctor`: 构造函数
  - `...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>`: 非服务类型的参数
- **返回值**: 创建的实例对象
- **使用示例**:
```typescript
const instance = instantiationService.createInstance(MyService);
```

#### invokeFunction方法
调用函数并提供服务访问器。

- **参数类型**:
  - `fn: (accessor: ServicesAccessor, ...args: TS) => R`: 要调用的函数
  - `...args: TS`: 传递给函数的额外参数
- **返回值**: 函数执行结果
- **使用示例**:
```typescript
const result = instantiationService.invokeFunction(accessor => {
  const service = accessor.get(IMyService);
  return service.getData();
});
```

#### createChild方法
创建当前服务的子实例，继承所有现有服务并添加/覆盖指定服务。

- **参数类型**: `services: ServiceCollection` - 要添加或覆盖的服务集合
- **返回值**: 新的`IInstantiationService`实例
- **使用示例**:
```typescript
const childService = parentService.createChild(new ServiceCollection());
```

#### dispose方法
销毁该DI上下文中的所有可销毁服务。

- **参数**: 无
- **返回值**: void
- **使用示例**:
```typescript
instantiationService.dispose(); // 销毁所有服务
```

**Section sources**
- [instantiation-service.interface.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.interface.ts#L12-L47)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L61-L468)

## 响应式API

响应式API基于Vue的响应式系统实现，提供React组件的响应式更新能力。

```mermaid
classDiagram
class useObserver {
+useObserver(fn : () => T, baseComponentName : string = "observed") : T
}
class observer {
+observer(baseComponent : FunctionComponent | ForwardRefRenderFunction) : FunctionComponent
}
class observable {
+observable(target : T, annotations? : any, options? : any) : T
}
class box {
+box(value : T) : Ref<T>
}
class computed {
+computed(getter : () => T) : { get() : T }
}
class autorun {
+autorun(view : () => void) : IReactionDisposer
}
class reaction {
+reaction(expression : () => T, effectCallback : (arg : T) => void, opts : { fireImmediately? : boolean }) : IReactionDisposer
}
class action {
+action(fn : T) : T
}
class useLocalObservable {
+useLocalObservable(initializer : () => T, annotations? : any) : T
}
class ObserverComponent {
+Observer(props : IObserverProps) : ReactElement
}
useObserver --> observer : 被使用
observer --> useObserver : 内部调用
ObserverComponent --> useObserver : 内部调用
useLocalObservable --> observable : 内部调用
observable --> reactive : 实现
box --> ref : 实现
computed --> vueComputed : 实现
autorun --> effect : 实现
reaction --> effect : 实现
```

**Diagram sources**
- [useObserver.ts](file://packages/mobx-vue-lite/src/useObserver.ts#L19-L59)
- [observer.ts](file://packages/mobx-vue-lite/src/observer.ts#L16-L52)
- [mobx.ts](file://packages/mobx-vue-lite/src/mobx.ts#L13-L65)
- [useLocalObservable.ts](file://packages/mobx-vue-lite/src/useLocalObservable.ts#L23-L42)
- [ObserverComponent.tsx](file://packages/mobx-vue-lite/src/ObserverComponent.tsx#L26-L32)

### useObserver函数

`useObserver`是一个React Hook，用于跟踪渲染函数中访问的可观察对象，并在它们改变时重新渲染。

- **参数类型**:
  - `fn: () => T`: 访问可观察对象的渲染函数
  - `baseComponentName: string`: 用于调试的组件名称（可选）
- **返回值**: 渲染函数的结果
- **响应式原理**: 使用Vue的`effect`函数创建响应式副作用，当依赖的可观察对象发生变化时，通过`forceUpdate`触发组件重新渲染。
- **使用场景**: 在函数组件中需要响应式更新的场景
- **使用示例**:
```typescript
function MyComponent() {
  return useObserver(() => <div>{store.value}</div>);
}
```

### observer函数

`observer`是一个高阶组件（HOC），将函数组件包装成响应式组件。

- **参数类型**: `baseComponent: React.FunctionComponent<P> | ForwardRefRenderFunction<TRef, PropsWithoutRef<P>>` - 要包装的基础组件
- **返回值**: 包装后的响应式函数组件
- **响应式原理**: 内部使用`useObserver`实现响应式更新，同时自动应用`React.memo`进行性能优化。
- **使用场景**: 包装函数组件使其具有响应式能力
- **使用示例**:
```typescript
const ObservedComponent = observer(() => {
  return <div>{store.value}</div>;
});
```

### mobx核心函数

#### observable函数
将对象转换为可观察对象。

- **参数类型**:
  - `target: T`: 要转换的目标对象
  - `annotations?: any`: 注解（当前版本忽略）
  - `options?: any`: 选项（当前版本忽略）
- **返回值**: 可观察对象
- **使用示例**:
```typescript
const store = observable({ count: 0 });
```

#### box函数
创建一个可观察的引用。

- **参数类型**: `value: T` - 初始值
- **返回值**: `Ref<T>`类型的可观察引用
- **使用示例**:
```typescript
const countRef = box(0);
```

#### computed函数
创建一个计算属性。

- **参数类型**: `getter: () => T` - 计算函数
- **返回值**: 具有`get()`方法的对象
- **使用示例**:
```typescript
const double = computed(() => store.count * 2);
console.log(double.get());
```

#### autorun函数
自动运行函数并响应依赖变化。

- **参数类型**: `view: () => void` - 要运行的函数
- **返回值**: `IReactionDisposer`类型的清理函数
- **使用示例**:
```typescript
const dispose = autorun(() => {
  console.log(store.count);
});
// dispose(); // 清理
```

#### reaction函数
观察表达式并在其变化时执行副作用。

- **参数类型**:
  - `expression: () => T`: 要观察的表达式
  - `effectCallback: (arg: T) => void`: 变化时执行的回调
  - `opts: { fireImmediately?: boolean }`: 选项，可选择是否立即执行
- **返回值**: `IReactionDisposer`类型的清理函数
- **使用示例**:
```typescript
const dispose = reaction(
  () => store.count,
  (count) => {
    console.log(`Count changed to ${count}`);
  },
  { fireImmediately: true }
);
```

#### action函数
标记函数为动作（当前版本为透传实现）。

- **参数类型**: `fn: T` - 要包装的函数
- **返回值**: 包装后的函数
- **使用示例**:
```typescript
const increment = action(() => {
  store.count++;
});
```

**Section sources**
- [useObserver.ts](file://packages/mobx-vue-lite/src/useObserver.ts#L19-L59)
- [observer.ts](file://packages/mobx-vue-lite/src/observer.ts#L16-L52)
- [mobx.ts](file://packages/mobx-vue-lite/src/mobx.ts#L13-L65)

### useLocalObservable函数

创建一个在组件生命周期内持久存在的局部可观察对象。

- **参数类型**:
  - `initializer: () => T`: 返回初始可观察对象的函数
  - `annotations?: any`: 注解（可选）
- **返回值**: 可观察对象
- **响应式原理**: 结合`useState`和`observable`，确保对象在组件重新渲染时保持不变，同时自动绑定方法的`this`上下文。
- **使用场景**: 在函数组件中创建局部状态
- **使用示例**:
```typescript
const Counter = observer(() => {
  const store = useLocalObservable(() => ({
    count: 0,
    increment() {
      this.count++;
    }
  }));
  return <button onClick={store.increment}>{store.count}</button>;
});
```

**Section sources**
- [useLocalObservable.ts](file://packages/mobx-vue-lite/src/useLocalObservable.ts#L23-L42)

### Observer组件

`Observer`组件提供细粒度的响应式更新能力。

- **props**:
  - `children: () => React.ReactElement`: 渲染函数
  - `render: () => React.ReactElement`: 渲染函数（替代children）
- **事件**: 无
- **插槽**: 无
- **响应式原理**: 内部使用`useObserver`实现，只在依赖的可观察对象变化时重新渲染该组件。
- **使用场景**: 需要细粒度控制重新渲染的场景
- **使用示例**:
```typescript
function MyComponent() {
  const store = useLocalObservable(() => ({ count: 0 }));
  return (
    <div>
      <Observer>
        {() => <span>{store.count}</span>}
      </Observer>
      <button onClick={() => store.count++}>Increment</button>
    </div>
  );
}
```

**Section sources**
- [ObserverComponent.tsx](file://packages/mobx-vue-lite/src/ObserverComponent.tsx#L26-L32)

## 组件API

### Observer组件

`Observer`组件用于包裹需要响应式更新的JSX内容。

#### Props
- **children**: `() => React.ReactElement` - 必需的渲染函数
- **render**: `() => React.ReactElement` - 可选的渲染函数，优先级高于children

#### 事件
无

#### 插槽
无

#### 使用示例
```typescript
<Observer>
  {() => <div>{store.value}</div>}
</Observer>
```

**Section sources**
- [ObserverComponent.tsx](file://packages/mobx-vue-lite/src/ObserverComponent.tsx#L4-L32)

## 服务API

### HttpService

HTTP服务提供网络请求功能。

#### 方法签名
- **get(url: string, config?: RequestConfig): Promise<Response>**
  - 发起GET请求
- **post(url: string, data: any, config?: RequestConfig): Promise<Response>**
  - 发起POST请求
- **put(url: string, data: any, config?: RequestConfig): Promise<Response>**
  - 发起PUT请求
- **delete(url: string, config?: RequestConfig): Promise<Response>**
  - 发起DELETE请求

#### 调用方式
通过DI系统注入后直接调用相应方法。

#### 错误处理
- 网络错误会抛出异常
- HTTP错误状态码会通过Promise.reject返回
- 可通过try-catch或Promise.catch处理错误

#### 边界情况
- 空URL处理
- 大文件上传/下载
- 请求超时
- 重试机制

**Section sources**
- [http.service.ts](file://packages/h5-builder/src/services/http.service.ts)

### TrackerService

追踪服务用于收集和上报用户行为数据。

#### 方法签名
- **track(event: string, properties?: Record<string, any>): void**
  - 追踪事件
- **identify(userId: string, traits?: Record<string, any>): void**
  - 识别用户
- **setGroup(groupId: string, traits?: Record<string, any>): void**
  - 设置用户组
- **flush(): void**
  - 立即上报缓存数据

#### 调用方式
通过DI系统获取实例后调用相应方法。

#### 错误处理
- 上报失败时自动重试
- 本地缓存失败数据
- 错误信息记录到日志

#### 边界情况
- 离线状态处理
- 数据量过大时的分批上报
- 用户隐私数据处理

**Section sources**
- [tracker.service.ts](file://packages/h5-builder/src/services/tracker.service.ts)

### BridgeService

桥接服务用于与原生平台通信。

#### 方法签名
- **call(method: string, params?: any): Promise<any>**
  - 调用原生方法
- **on(event: string, callback: (data: any) => void): void**
  - 监听原生事件
- **off(event: string, callback?: (data: any) => void): void**
  - 取消监听原生事件
- **emit(event: string, data?: any): void**
  - 触发原生事件

#### 调用方式
通过DI系统注入后使用。

#### 错误处理
- 方法不存在时返回错误
- 参数类型错误处理
- 跨平台兼容性处理

#### 边界情况
- 原生模块未加载
- 异步回调超时
- 安全权限检查

**Section sources**
- [bridge.service.ts](file://packages/h5-builder/src/services/bridge.service.ts)