# DI 系统 API

<cite>
**本文档引用的文件**
- [instantiation-service.interface.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.interface.ts)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)
- [service-collection.ts](file://packages/h5-builder/src/bedrock/di/service-collection.ts)
- [service-registry.ts](file://packages/h5-builder/src/bedrock/di/service-registry.ts)
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts)
- [descriptor.ts](file://packages/h5-builder/src/bedrock/di/descriptor.ts)
- [idle-value.ts](file://packages/h5-builder/src/bedrock/di/idle-value.ts)
- [proxy-builder.ts](file://packages/h5-builder/src/bedrock/di/proxy-builder.ts)
- [trace.ts](file://packages/h5-builder/src/bedrock/di/trace.ts)
- [service-ownership-collection.ts](file://packages/h5-builder/src/bedrock/di/service-ownership-collection.ts)
- [lazy-service.ts](file://packages/h5-builder/src/bedrock/di/lazy/lazy-service.ts)
- [idle-load.ts](file://packages/h5-builder/src/bedrock/di/lazy/idle-load.ts)
- [instantiation-service.test.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.test.ts)
- [service-identifiers.ts](file://packages/h5-builder/src/services/service-identifiers.ts)
</cite>

## 目录
1. [简介](#简介)
2. [核心组件](#核心组件)
3. [InstantiationService 接口详解](#instantiationservice-接口详解)
4. [服务注册与解析机制](#服务注册与解析机制)
5. [子容器创建与继承](#子容器创建与继承)
6. [生命周期与销毁](#生命周期与销毁)
7. [依赖注入的高级特性](#依赖注入的高级特性)
8. [调试与追踪工具](#调试与追踪工具)
9. [常见问题与排查](#常见问题与排查)
10. [测试用例分析](#测试用例分析)

## 简介
本文档详细说明了 MobX 项目中 DI（依赖注入）系统的核心 API，重点围绕 `InstantiationService` 接口展开。该系统提供了一套完整的依赖注入解决方案，支持服务注册、解析、子容器创建、延迟加载、代理构建等高级特性。文档将深入解析服务标识符（ServiceIdentifier）、服务集合（ServiceCollection）、服务注册表（ServiceRegistry）等核心概念的交互关系，并结合测试用例展示典型使用场景和边界情况。

## 核心组件

DI 系统由多个核心组件构成，它们协同工作以实现依赖注入功能。

```mermaid
graph TB
subgraph "DI 核心"
InstantiationService[InstantiationService<br/>实例化服务]
ServiceRegistry[ServiceRegistry<br/>服务注册表]
ServiceCollection[ServiceCollection<br/>服务集合]
ServiceIdentifier[ServiceIdentifier<br/>服务标识符]
end
subgraph "辅助组件"
Descriptor[SyncDescriptor<br/>同步描述符]
IdleValue[IdleValue<br/>空闲值]
ProxyBuilder[makeProxy<br/>代理构建]
Trace[Trace<br/>追踪]
end
InstantiationService --> ServiceCollection
ServiceRegistry --> ServiceCollection
ServiceCollection --> ServiceIdentifier
InstantiationService --> Descriptor
Descriptor --> IdleValue
IdleValue --> ProxyBuilder
InstantiationService --> Trace
```

**Diagram sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)
- [service-registry.ts](file://packages/h5-builder/src/bedrock/di/service-registry.ts)
- [service-collection.ts](file://packages/h5-builder/src/bedrock/di/service-collection.ts)
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts)
- [descriptor.ts](file://packages/h5-builder/src/bedrock/di/descriptor.ts)
- [idle-value.ts](file://packages/h5-builder/src/bedrock/di/idle-value.ts)
- [proxy-builder.ts](file://packages/h5-builder/src/bedrock/di/proxy-builder.ts)
- [trace.ts](file://packages/h5-builder/src/bedrock/di/trace.ts)

**Section sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)
- [service-registry.ts](file://packages/h5-builder/src/bedrock/di/service-registry.ts)

## InstantiationService 接口详解

`IInstantiationService` 是整个 DI 系统的核心接口，定义了服务实例化的主要能力。

```mermaid
classDiagram
class IInstantiationService {
<<interface>>
+_serviceBrand : undefined
+createInstance(descriptor : SyncDescriptor0~T~) : T
+createInstance(ctor : Ctor, ...args : any[]) : R
+invokeFunction(fn : (accessor : ServicesAccessor, ...args : TS) => R, ...args : TS) : R
+createChild(services : ServiceCollection) : IInstantiationService
+dispose() : void
}
class InstantiationService {
-_services : ServiceCollection
-_parent : InstantiationService
-_childs : Set~IInstantiationService~
-_activeInstantiations : Set~ServiceIdentifier~
+createInstance(ctorOrDescriptor : any | SyncDescriptor~any~, ...rest : any[]) : any
+invokeFunction(fn : (accessor : ServicesAccessor, ...args : TS) => R, ...args : TS) : R
+createChild(services : ServiceCollection) : IInstantiationService
+dispose() : void
-_getOrCreateServiceInstance(id : ServiceIdentifier~T~, _trace : Trace) : T
-_createAndCacheServiceInstance(id : ServiceIdentifier~T~, desc : SyncDescriptor~T~, _trace : Trace) : T
}
IInstantiationService <|-- InstantiationService
```

**Diagram sources**
- [instantiation-service.interface.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.interface.ts)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)

**Section sources**
- [instantiation-service.interface.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.interface.ts)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)

### createInstance 方法
`createInstance` 方法用于同步创建服务实例。它有两种重载形式：
1. 通过 `SyncDescriptor0<T>` 描述符创建实例。
2. 通过构造函数和参数直接创建实例。

该方法会递归解析构造函数中的所有依赖项，并确保服务的单例性。

### invokeFunction 方法
`invokeFunction` 方法允许在函数执行上下文中访问服务访问器（`ServicesAccessor`）。它提供了一种安全的方式来获取服务，避免了直接引用 `InstantiationService`。

### createChild 方法
`createChild` 方法创建一个子容器，该子容器继承父容器的所有服务，并可以添加或覆盖新的服务。

### dispose 方法
`dispose` 方法负责销毁当前容器及其所有子容器中的可释放服务，实现完整的生命周期管理。

## 服务注册与解析机制

服务的注册与解析是 DI 系统的基础流程。

```mermaid
flowchart TD
Start([开始]) --> Register["注册服务<br/>ServiceRegistry.register()"]
Register --> MakeCollection["创建服务集合<br/>ServiceRegistry.makeCollection()"]
MakeCollection --> CreateService["创建实例化服务<br/>new InstantiationService()"]
CreateService --> Resolve["解析服务<br/>createInstance() 或 invokeFunction()"]
Resolve --> GetOrDesc["获取服务实例或描述符<br/>_getServiceInstanceOrDescriptor()"]
GetOrDesc --> IsDesc{"是描述符?"}
IsDesc --> |是| SafeCreate["安全创建实例<br/>_safeCreateAndCacheServiceInstance()"]
IsDesc --> |否| ReturnInstance["返回实例"]
SafeCreate --> CheckActive["检查活跃实例化<br/>防止循环依赖"]
CheckActive --> CreateAndCache["创建并缓存实例<br/>_createAndCacheServiceInstance()"]
CreateAndCache --> DFS["深度优先搜索依赖图"]
DFS --> HasCycle{"存在循环依赖?"}
HasCycle --> |是| ThrowError["抛出 CyclicDependencyError"]
HasCycle --> |否| CreateLeafs["创建叶子节点实例"]
CreateLeafs --> ReturnInstance
ReturnInstance --> End([结束])
```

**Diagram sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)
- [service-registry.ts](file://packages/h5-builder/src/bedrock/di/service-registry.ts)

**Section sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)
- [service-registry.ts](file://packages/h5-builder/src/bedrock/di/service-registry.ts)

### ServiceIdentifier
`ServiceIdentifier` 是服务的唯一标识符，通过 `createDecorator` 函数创建。它本质上是一个参数装饰器，用于在构造函数中声明依赖。

### ServiceCollection
`ServiceCollection` 是一个服务的集合，内部使用 `Map` 存储服务 ID 与服务实例或描述符的映射关系。它还支持服务所有权（`ServiceOwnership`）的管理。

### ServiceRegistry
`ServiceRegistry` 是服务的注册中心，负责收集所有服务的注册信息，并最终生成 `ServiceCollection`。它支持检查重复注册。

## 子容器创建与继承

子容器机制允许创建具有继承关系的服务容器，实现服务的分层和覆盖。

```mermaid
sequenceDiagram
participant Parent as "父容器<br/>InstantiationService"
participant Child as "子容器<br/>InstantiationService"
participant ServiceA as "服务A"
participant ServiceB as "服务B"
Parent->>Parent : 注册服务A和B
Parent->>Child : createChild(新服务集合)
Child->>Child : 继承父容器的服务
Child->>Child : 添加/覆盖新服务
Child->>ServiceA : createInstance(A)
ServiceA->>Parent : _getServiceInstanceOrDescriptor(A)
Parent-->>ServiceA : 返回服务A实例
Child->>ServiceB : createInstance(B)
ServiceB->>Child : _getServiceInstanceOrDescriptor(B)
ServiceB->>Parent : 向上查找
Parent-->>ServiceB : 返回服务B实例
```

**Diagram sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)

**Section sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)

## 生命周期与销毁

DI 系统通过 `dispose` 方法实现了完整的生命周期管理。

```mermaid
stateDiagram-v2
[*] --> Active
Active --> Disposing : dispose()
Disposing --> DisposeChildren : 销毁子容器
DisposeChildren --> DisconnectParent : 断开与父容器的连接
DisconnectParent --> CleanupServices : 清理内部服务
CleanupServices --> CheckOwnership : 检查服务所有权
CheckOwnership --> IsOwned{"所有权为Owned?"}
IsOwned --> |是| DisposeService : 调用dispose()
IsOwned --> |否| SkipDispose : 跳过
DisposeService --> CleanupServices
SkipDispose --> CleanupServices
CleanupServices --> Disposed
Disposed --> [*]
```

**Diagram sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)

**Section sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)

## 依赖注入的高级特性

### 延迟加载 (IdleValue)
通过 `IdleValue` 和 `makeProxy` 实现延迟加载。当服务被标记为 `supportsDelayedInstantiation` 时，系统会创建一个代理对象，只有在首次访问其属性或方法时才会真正创建实例。

```mermaid
flowchart LR
A[SyncDescriptor<br/>supportsDelayedInstantiation=true] --> B[IdleValue<br/>包装构造函数]
B --> C[makeProxy<br/>创建代理对象]
C --> D[用户访问代理]
D --> E[IdleValue.value<br/>触发构造]
E --> F[执行构造函数]
F --> G[返回真实实例]
```

**Diagram sources**
- [idle-value.ts](file://packages/h5-builder/src/bedrock/di/idle-value.ts)
- [proxy-builder.ts](file://packages/h5-builder/src/bedrock/di/proxy-builder.ts)

**Section sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)
- [idle-value.ts](file://packages/h5-builder/src/bedrock/di/idle-value.ts)
- [proxy-builder.ts](file://packages/h5-builder/src/bedrock/di/proxy-builder.ts)

### 代理构建 (ProxyBuilder)
`makeProxy` 函数利用 JavaScript 的 `Proxy` 对象，为 `IdleValue` 创建一个透明的代理。这使得延迟加载对使用者完全透明。

### 懒加载服务 (LazyServiceLoader)
`LazyServiceLoader` 抽象类提供了基于 Promise 的懒加载机制，适用于需要异步加载模块的场景。

```mermaid
classDiagram
class ILazyServiceLoader~T~ {
<<interface>>
+loaded : boolean
+preload() : void
+getInstance() : Promise~T~
}
class LazyServiceLoader~T~ {
-_instance? : T
-_sharedMutex : SharedMutex
+getInstance() : Promise~T~
+preload() : void
+loaded : boolean
-_makeInstance(...rest) : Promise~T~
-_getModule() : Promise~ILoaderResult~T~ | ILoaderResult0~T~~
-_getStaticArguments() : any[]
}
class IdleServiceLoader~T~ {
-_service : ILazyServiceLoader~T~
+getInstance() : Promise~T~
+preload() : void
+loaded : boolean
}
ILazyServiceLoader~T~ <|-- LazyServiceLoader~T~
ILazyServiceLoader~T~ <|-- IdleServiceLoader~T~
LazyServiceLoader~T~ --> SharedMutex
IdleServiceLoader~T~ --> LazyServiceLoader~T~
```

**Diagram sources**
- [lazy-service.ts](file://packages/h5-builder/src/bedrock/di/lazy/lazy-service.ts)
- [idle-load.ts](file://packages/h5-builder/src/bedrock/di/lazy/idle-load.ts)

**Section sources**
- [lazy-service.ts](file://packages/h5-builder/src/bedrock/di/lazy/lazy-service.ts)
- [idle-load.ts](file://packages/h5-builder/src/bedrock/di/lazy/idle-load.ts)

## 调试与追踪工具

`Trace` 类提供了强大的调试和性能追踪能力。

```mermaid
flowchart TD
A[启用追踪<br/>enableTracing=true] --> B[创建Trace实例]
B --> C[记录调用栈和创建时间]
C --> D[构建依赖图]
D --> E[检测服务创建]
E --> F[输出详细日志]
F --> G["CREATE ServiceA"]
F --> H["CREATES -> ServiceB"]
F --> I["uses -> ServiceC"]
F --> J["DONE, took Xms"]
```

**Diagram sources**
- [trace.ts](file://packages/h5-builder/src/bedrock/di/trace.ts)

**Section sources**
- [trace.ts](file://packages/h5-builder/src/bedrock/di/trace.ts)

## 常见问题与排查

### 循环依赖
当两个或多个服务相互依赖时，会形成循环依赖，系统会抛出 `CyclicDependencyError`。

**排查方法**：
1. 启用 `Trace` 追踪，查看详细的依赖调用链。
2. 检查 `createInstance` 调用栈，定位循环点。
3. 重构代码，打破循环依赖。

### 服务未注册
尝试解析一个未注册的服务时，会抛出 `UnknownDependency` 错误。

**排查方法**：
1. 检查 `ServiceRegistry` 的注册顺序。
2. 确认服务标识符（`ServiceIdentifier`）拼写正确。
3. 使用 `getServiceDependencies` 检查构造函数的依赖声明。

## 测试用例分析

测试用例验证了 DI 系统的各种边界情况。

```mermaid
erDiagram
TEST_CASE ||--o{ ERROR_CASE : "包含"
TEST_CASE ||--o{ SUCCESS_CASE : "包含"
ERROR_CASE }|--o{ CYCLIC_DEPENDENCY : "类型"
ERROR_CASE }|--o{ RECURSIVE_INSTANTIATION : "类型"
ERROR_CASE }|--o{ UNREGISTERED_SERVICE : "类型"
SUCCESS_CASE }|--o{ NO_DEPENDENCY : "类型"
SUCCESS_CASE }|--o{ HAS_DEPENDENCY : "类型"
SUCCESS_CASE }|--o{ CHILD_DEPENDENCY : "类型"
SUCCESS_CASE }|--o{ ARGUMENTS : "类型"
class CYCLIC_DEPENDENCY {
name: string
description: string
expectedError: string
}
class RECURSIVE_INSTANTIATION {
name: string
description: string
expectedError: string
}
class UNREGISTERED_SERVICE {
name: string
description: string
expectedError: string
}
class NO_DEPENDENCY {
name: string
description: string
expectedBehavior: string
}
class HAS_DEPENDENCY {
name: string
description: string
expectedBehavior: string
}
class CHILD_DEPENDENCY {
name: string
description: string
expectedBehavior: string
}
class ARGUMENTS {
name: string
description: string
expectedBehavior: string
}
```

**Diagram sources**
- [instantiation-service.test.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.test.ts)

**Section sources**
- [instantiation-service.test.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.test.ts)