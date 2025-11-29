# Dependency Injection

<cite>
**Referenced Files in This Document**   
- [service-registry.ts](file://packages/h5-builder/src/bedrock/di/service-registry.ts)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts)
- [descriptor.ts](file://packages/h5-builder/src/bedrock/di/descriptor.ts)
- [service-collection.ts](file://packages/h5-builder/src/bedrock/di/service-collection.ts)
- [context.web.tsx](file://packages/h5-builder/src/bedrock/di/context.web.tsx)
- [http.service.ts](file://packages/h5-builder/src/services/http.service.ts)
- [bridge.service.ts](file://packages/h5-builder/src/services/bridge.service.ts)
- [tracker.service.ts](file://packages/h5-builder/src/services/tracker.service.ts)
- [service-identifiers.ts](file://packages/h5-builder/src/services/service-identifiers.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Core Components](#core-components)
3. [Dependency Injection Architecture](#dependency-injection-architecture)
4. [Service Registration and Resolution](#service-registration-and-resolution)
5. [Hierarchical Injector System](#hierarchical-injector-system)
6. [Practical Implementation Examples](#practical-implementation-examples)
7. [Common Issues and Troubleshooting](#common-issues-and-troubleshooting)
8. [Best Practices](#best-practices)
9. [Conclusion](#conclusion)

## Introduction
Dependency Injection (DI) is a fundamental design pattern in the MobX framework that enables loose coupling between components and their dependencies. This documentation provides comprehensive guidance on the DI system, covering its architecture, implementation patterns, common issues, and best practices. The system is designed to manage service lifecycle, resolve dependencies, and support hierarchical injection contexts, particularly in React applications.

## Core Components

The dependency injection system in MobX consists of several core components that work together to provide a robust service management framework. These components include service identifiers, descriptors, registries, instantiation services, and collections that manage the lifecycle and resolution of services.

**Section sources**
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts#L1-L74)
- [descriptor.ts](file://packages/h5-builder/src/bedrock/di/descriptor.ts#L1-L32)
- [service-registry.ts](file://packages/h5-builder/src/bedrock/di/service-registry.ts#L1-L100)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L1-L468)
- [service-collection.ts](file://packages/h5-builder/src/bedrock/di/service-collection.ts#L1-L47)

## Dependency Injection Architecture

The DI architecture in MobX follows a hierarchical and extensible design pattern that enables flexible service management across different application contexts. The system is built around several key principles: service identification, dependency resolution, lazy instantiation, and hierarchical context inheritance.

```mermaid
graph TB
subgraph "DI Core Components"
A[ServiceIdentifier] --> B[ServiceRegistry]
B --> C[ServiceCollection]
C --> D[InstantiationService]
D --> E[SyncDescriptor]
end
subgraph "Service Lifecycle"
F[Service Registration] --> G[Dependency Resolution]
G --> H[Instance Creation]
H --> I[Service Caching]
end
subgraph "Hierarchical Context"
J[Global Injector] --> K[Page-level Injector]
K --> L[Component-level Injector]
end
A --> |Creates| E
B --> |Manages| C
D --> |Resolves| C
D --> |Creates| H
```

**Diagram sources**
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts#L1-L74)
- [service-registry.ts](file://packages/h5-builder/src/bedrock/di/service-registry.ts#L1-L100)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L1-L468)
- [descriptor.ts](file://packages/h5-builder/src/bedrock/di/descriptor.ts#L1-L32)

## Service Registration and Resolution

Service registration and resolution form the foundation of the DI system. Services are registered with unique identifiers and can be resolved through the instantiation service. The system supports both eager and delayed instantiation, allowing for efficient resource management.

### Service Identification
Services are identified using unique service identifiers created through the `createDecorator` function. These identifiers serve as tokens for dependency lookup and ensure type safety in the injection process.

```mermaid
classDiagram
class ServiceIdentifier~T~ {
<<interface>>
+(...args : any[]) : void
+type : T
}
class BrandedService {
<<interface>>
+_serviceBrand : undefined
}
class BaseComponentModel {
+id : string
+props : P
+isInited : boolean
+isActive : boolean
+data : any
+loading : boolean
+error : Error | null
+constructor(id : string, props : P)
+dispose() : void
+init() : Promise~void~
+activate() : void
+deactivate() : void
+fetchData() : Promise~void~
+refresh() : Promise~void~
}
ServiceIdentifier --> BrandedService : "extends"
BaseComponentModel --> BrandedService : "implements"
```

**Diagram sources**
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts#L1-L74)
- [model.ts](file://packages/h5-builder/src/bedrock/model.ts#L1-L243)

### Service Registration Process
Services are registered with the ServiceRegistry, which maintains a collection of service identifiers and their corresponding descriptors or instances. The registration process supports both constructor functions and SyncDescriptor objects.

```mermaid
sequenceDiagram
participant Client as "Application Code"
participant Registry as "ServiceRegistry"
participant Collection as "ServiceCollection"
participant Instantiation as "InstantiationService"
Client->>Registry : register(id, constructor)
Registry->>Registry : Create SyncDescriptor
Registry->>Registry : Store in registry array
Registry-->>Client : void
Client->>Instantiation : createChild(services)
Instantiation->>Collection : new ServiceCollection()
Collection->>Collection : Copy parent services
Collection->>Collection : Add new services
Instantiation-->>Client : Child InstantiationService
```

**Diagram sources**
- [service-registry.ts](file://packages/h5-builder/src/bedrock/di/service-registry.ts#L1-L100)
- [service-collection.ts](file://packages/h5-builder/src/bedrock/di/service-collection.ts#L1-L47)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L1-L468)

## Hierarchical Injector System

The hierarchical injector system enables context-specific service resolution while maintaining access to parent-level services. This architecture supports global, page-level, and component-level injectors, creating a flexible dependency resolution hierarchy.

### Injector Hierarchy Structure
The injector system follows a parent-child relationship where child injectors can access services from their parent injectors, but not vice versa. This unidirectional access pattern ensures proper encapsulation and service lifecycle management.

```mermaid
graph TD
A[Global Injector] --> B[Page-level Injector 1]
A --> C[Page-level Injector 2]
B --> D[Component-level Injector 1]
B --> E[Component-level Injector 2]
C --> F[Component-level Injector 3]
C --> G[Component-level Injector 4]
style A fill:#4CAF50,stroke:#388E3C
style B fill:#2196F3,stroke:#1976D2
style C fill:#2196F3,stroke:#1976D2
style D fill:#FF9800,stroke:#F57C00
style E fill:#FF9800,stroke:#F57C00
style F fill:#FF9800,stroke:#F57C00
style G fill:#FF9800,stroke:#F57C00
classDef global fill:#4CAF50,stroke:#388E3C;
classDef page fill:#2196F3,stroke:#1976D2;
classDef component fill:#FF9800,stroke:#F57C00;
class A global
class B,C page
class D,E,F,G component
```

**Diagram sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L1-L468)
- [context.web.tsx](file://packages/h5-builder/src/bedrock/di/context.web.tsx#L1-L42)

### Service Resolution Flow
When a service is requested, the injector system follows a specific resolution flow that traverses the hierarchy from the current injector to its ancestors until the service is found or determined to be unavailable.

```mermaid
flowchart TD
Start([Request Service]) --> CheckLocal["Check Current Injector's ServiceCollection"]
CheckLocal --> Found{"Service Found?"}
Found --> |Yes| ReturnInstance["Return Service Instance"]
Found --> |No| CheckParent["Check Parent Injector"]
CheckParent --> ParentExists{"Parent Exists?"}
ParentExists --> |Yes| CheckParent
ParentExists --> |No| HandleError["Throw UnknownDependency Error"]
ReturnInstance --> End([Service Resolved])
HandleError --> End
```

**Diagram sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L268-L288)
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts#L27-L29)

## Practical Implementation Examples

This section demonstrates practical examples of dependency injection implementation, showing how services are defined, registered, and injected into components and models.

### Service Definition and Registration
Services are defined as classes that implement the BrandedService interface and are registered with unique identifiers. The following example shows the registration of core services in the application.

```mermaid
classDiagram
class BridgeService {
+_serviceBrand : undefined
+isDebug : boolean
+mockResponses : Map~string, any~
+constructor(isDebug : boolean)
+call~T~(method : string, params : BridgeCallParams, timeout : number) : Promise~T~
+nativeCall~T~(method : string, params : BridgeCallParams, timeout : number) : Promise~T~
+mockCall~T~(method : string, params : BridgeCallParams) : Promise~T~
+setMockResponse(method : string, data : any) : void
+setMockResponses(responses : Record~string, any~) : void
+dispose() : void
}
class HttpService {
+_serviceBrand : undefined
+disposables : DisposableStore
+requestInterceptors : RequestInterceptor[]
+responseInterceptors : ResponseInterceptor[]
+errorInterceptors : ErrorInterceptor[]
+pendingRequests : Set~AbortController~
+defaultConfig : Partial~HttpRequestConfig~
+constructor(options : HttpServiceOptions, @IBridgeService bridge : BridgeService)
+addRequestInterceptor(interceptor : RequestInterceptor) : () => void
+addResponseInterceptor(interceptor : ResponseInterceptor) : () => void
+addErrorInterceptor(interceptor : ErrorInterceptor) : () => void
+request~T~(config : HttpRequestConfig) : Promise~T~
+get~T~(url : string, config : Omit~HttpRequestConfig, 'url' | 'method'~) : Promise~T~
+post~T~(url : string, data : any, config : Omit~HttpRequestConfig, 'url' | 'method' | 'data'~) : Promise~T~
+put~T~(url : string, data : any, config : Omit~HttpRequestConfig, 'url' | 'method' | 'data'~) : Promise~T~
+delete~T~(url : string, config : Omit~HttpRequestConfig, 'url' | 'method'~) : Promise~T~
+cancelAll() : void
+dispose() : void
}
class TrackerService {
+_serviceBrand : undefined
+disposables : DisposableStore
+queue : TrackEvent[]
+flushTimer : number | undefined
+config : Required~TrackerConfig~
+constructor(config : TrackerConfig, @IBridgeService bridge : BridgeService)
+track(event : string, params : Record~string, any~) : void
+debugTrack(trackEvent : TrackEvent) : Promise~void~
+enqueue(trackEvent : TrackEvent) : void
+scheduleFlush() : void
+flush() : Promise~void~
+persistQueue() : void
+restoreQueue() : void
+clear() : void
+get queueSize() : number
+dispose() : void
}
class IBridgeService {
<<ServiceIdentifier>>
}
class IHttpService {
<<ServiceIdentifier>>
}
class ITrackerService {
<<ServiceIdentifier>>
}
IBridgeService --> BridgeService : "identifies"
IHttpService --> HttpService : "identifies"
ITrackerService --> TrackerService : "identifies"
HttpService --> IBridgeService : "depends on"
TrackerService --> IBridgeService : "depends on"
```

**Diagram sources**
- [bridge.service.ts](file://packages/h5-builder/src/services/bridge.service.ts#L1-L227)
- [http.service.ts](file://packages/h5-builder/src/services/http.service.ts#L1-L281)
- [tracker.service.ts](file://packages/h5-builder/src/services/tracker.service.ts#L1-L290)
- [service-identifiers.ts](file://packages/h5-builder/src/services/service-identifiers.ts#L1-L10)

### Multiple Service Injection in Model Constructor
The DI system supports injecting multiple services into a Model constructor using the @Inject decorator. This pattern enables models to access the services they need without tight coupling.

```mermaid
sequenceDiagram
participant Model as "ComponentModel"
participant Injector as "InstantiationService"
participant Accessor as "ServicesAccessor"
participant Bridge as "BridgeService"
participant Http as "HttpService"
participant Tracker as "TrackerService"
Injector->>Model : createInstance(Model)
Model->>Injector : invokeFunction()
Injector->>Accessor : Create ServicesAccessor
Accessor->>Injector : get(IBridgeService)
Injector->>Bridge : _getOrCreateServiceInstance()
Bridge-->>Injector : BridgeService instance
Injector-->>Accessor : BridgeService
Accessor->>Injector : get(IHttpService)
Injector->>Http : _getOrCreateServiceInstance()
Http-->>Injector : HttpService instance
Injector-->>Accessor : HttpService
Accessor->>Injector : get(ITrackerService)
Injector->>Tracker : _getOrCreateServiceInstance()
Tracker-->>Injector : TrackerService instance
Injector-->>Accessor : TrackerService
Accessor-->>Model : All service instances
Model->>Model : Initialize with injected services
Model-->>Injector : Model instance
```

**Diagram sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L118-L148)
- [http.service.ts](file://packages/h5-builder/src/services/http.service.ts#L73-L76)
- [tracker.service.ts](file://packages/h5-builder/src/services/tracker.service.ts#L41-L44)

## Common Issues and Troubleshooting

This section addresses common dependency injection issues and provides troubleshooting steps to resolve them effectively.

### Dependency Injection Not Working
When dependency injection is not working, several configuration and implementation issues should be checked:

1. **Experimental Decorators**: Ensure that 'experimentalDecorators' is enabled in tsconfig.json
2. **Service Registration**: Verify that services are properly registered with the Injector
3. **Instance Creation**: Confirm that instances are created using 'Injector.resolveAndInstantiate()'
4. **Service Identifiers**: Check that service identifiers are correctly defined and imported

```mermaid
flowchart TD
Start([DI Not Working]) --> CheckConfig["Check tsconfig.json"]
CheckConfig --> DecoratorsEnabled{"experimentalDecorators<br/>enabled?"}
DecoratorsEnabled --> |No| EnableDecorators["Set experimentalDecorators: true"]
DecoratorsEnabled --> |Yes| CheckRegistration["Verify Service Registration"]
CheckRegistration --> Registered{"Service Registered?"}
Registered --> |No| RegisterService["Register service with ServiceRegistry"]
Registered --> |Yes| CheckIdentifier["Validate Service Identifier"]
CheckIdentifier --> Valid{"Identifier Correct?"}
Valid --> |No| FixIdentifier["Fix service identifier definition"]
Valid --> |Yes| CheckInstantiation["Check Instance Creation"]
CheckInstantiation --> UsingResolve{"Using resolveAndInstantiate?"}
UsingResolve --> |No| UseResolve["Use Injector.resolveAndInstantiate()"]
UsingResolve --> |Yes| CheckDependencies["Verify Dependencies"]
CheckDependencies --> AllPresent{"All Dependencies Available?"}
AllPresent --> |No| RegisterMissing["Register missing dependencies"]
AllPresent --> |Yes| Success["DI Working"]
```

**Diagram sources**
- [tsconfig.json](file://packages/h5-builder/tsconfig.json#L1-L20)
- [service-registry.ts](file://packages/h5-builder/src/bedrock/di/service-registry.ts#L35-L65)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L151-L176)

### Circular Dependency Detection
The DI system includes built-in protection against circular dependencies by tracking active instantiations and detecting cycles in the dependency graph.

```mermaid
graph TD
A[Service A] --> B[Service B]
B --> C[Service C]
C --> A[Service A]
D[InstantiationService] --> E[Active Instantiations Set]
E --> F["Add Service A to set"]
F --> G["Create Service A dependencies"]
G --> H["Add Service B to set"]
H --> I["Create Service B dependencies"]
I --> J["Add Service C to set"]
J --> K["Create Service C dependencies"]
K --> L["Check Service A in set"]
L --> M{"Service A already<br/>in instantiations?"}
M --> |Yes| N[Throw CyclicDependencyError]
M --> |No| O[Continue instantiation]
style A fill:#f44336,stroke:#d32f2f
style B fill:#f44336,stroke:#d32f2f
style C fill:#f44336,stroke:#d32f2f
style N fill:#f44336,stroke:#d32f2f
```

**Diagram sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L297-L305)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L331-L333)

## Best Practices

Adhering to best practices ensures a robust and maintainable dependency injection implementation.

### Service Design Guidelines
1. **Interface Segregation**: Define focused service interfaces that follow the Interface Segregation Principle
2. **Single Responsibility**: Each service should have a single responsibility and well-defined purpose
3. **Immutable Configuration**: Service configuration should be immutable after creation
4. **Proper Disposal**: Implement IDisposable interface for services that manage resources

### Registration and Resolution Patterns
1. **Early Registration**: Register services as early as possible in the application lifecycle
2. **Consistent Identifiers**: Use consistent naming conventions for service identifiers
3. **Lazy Instantiation**: Use delayed instantiation for services that are expensive to create or not always needed
4. **Hierarchical Organization**: Organize injectors hierarchically to match the application structure

### Performance Considerations
1. **Service Caching**: The DI system automatically caches service instances to avoid redundant creation
2. **Dependency Minimization**: Minimize the number of dependencies per service to reduce instantiation overhead
3. **Asynchronous Initialization**: Use asynchronous initialization for services that require network calls or other async operations
4. **Memory Management**: Properly dispose of services to prevent memory leaks, especially in long-running applications

## Conclusion
The dependency injection system in MobX provides a powerful and flexible mechanism for managing service dependencies and lifecycles. By understanding the core components, architecture, and best practices outlined in this documentation, developers can effectively leverage DI to create loosely coupled, maintainable, and testable code. The hierarchical injector system enables context-specific service resolution while maintaining access to parent-level services, supporting complex application structures with global, page-level, and component-level injectors.