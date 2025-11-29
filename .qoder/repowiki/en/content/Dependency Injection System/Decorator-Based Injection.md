# Decorator-Based Injection

<cite>
**Referenced Files in This Document**   
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts)
- [descriptor.ts](file://packages/h5-builder/src/bedrock/di/descriptor.ts)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)
- [service-identifiers.ts](file://packages/h5-builder/src/services/service-identifiers.ts)
- [product-card.model.ts](file://packages/h5-builder/src/components/product-card/product-card.model.ts)
- [tsconfig.json](file://packages/h5-builder/tsconfig.json)
- [context.web.tsx](file://packages/h5-builder/src/bedrock/di/context.web.tsx)
- [index.common.ts](file://packages/h5-builder/src/bedrock/di/index.common.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Core Architecture](#core-architecture)
3. [Service Identifier Creation](#service-identifier-creation)
4. [Metadata Storage and Retrieval](#metadata-storage-and-retrieval)
5. [Dependency Injection Workflow](#dependency-injection-workflow)
6. [Usage Examples](#usage-examples)
7. [Configuration Requirements](#configuration-requirements)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Integration with React Context](#integration-with-react-context)

## Introduction
The MobX H5 Builder implements a sophisticated decorator-based dependency injection (DI) system that enables clean separation of concerns and modular architecture. This system leverages TypeScript decorators to mark injectable dependencies, stores metadata on constructors, and resolves dependencies through an instantiation service. The implementation provides type safety, supports both eager and lazy instantiation, and integrates seamlessly with React components through context and hooks.

**Section sources**
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)

## Core Architecture
The dependency injection system in MobX H5 Builder consists of several key components that work together to provide a robust service resolution mechanism. At its core, the system uses a hierarchical instantiation service that can create child containers, manage service lifecycles, and resolve dependencies through metadata stored on class constructors.

```mermaid
graph TB
subgraph "DI Core Components"
A[ServiceIdentifier] --> B[createDecorator]
B --> C[DI_TARGET/DI_DEPENDENCIES]
C --> D[getServiceDependencies]
D --> E[InstantiationService]
E --> F[ServiceCollection]
F --> G[SyncDescriptor]
end
subgraph "Integration Layer"
H[useService Hook] --> I[InstantiationContext]
I --> E
end
subgraph "Service Registry"
J[ServiceRegistry] --> F
K[ServiceOwnershipCollection] --> F
end
```

**Diagram sources**
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts#L9-L73)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L61-L467)
- [service-collection.ts](file://packages/h5-builder/src/bedrock/di/service-collection.ts)
- [service-registry.ts](file://packages/h5-builder/src/bedrock/di/service-registry.ts)

**Section sources**
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)
- [service-collection.ts](file://packages/h5-builder/src/bedrock/di/service-collection.ts)

## Service Identifier Creation
The `createDecorator` function is the foundation of the DI system, generating `ServiceIdentifier` instances that act as parameter decorators. These identifiers are unique tokens that represent services in the dependency container and enable type-safe dependency resolution.

```mermaid
sequenceDiagram
participant Client as "Client Code"
participant Factory as "createDecorator"
participant Identifier as "ServiceIdentifier"
participant Metadata as "Constructor Metadata"
Client->>Factory : createDecorator("serviceName")
Factory->>Factory : Check serviceIds cache
alt Service already exists
Factory-->>Client : Return cached identifier
else New service
Factory->>Identifier : Create function decorator
Identifier->>Identifier : Set toString() method
Identifier->>Factory : Store in serviceIds map
Factory-->>Client : Return new identifier
end
Client->>Metadata : Use @identifier in constructor
Metadata->>Metadata : Call setServiceDependency
Metadata->>Metadata : Store in DI_DEPENDENCIES
```

**Diagram sources**
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts#L50-L66)
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts#L31-L39)

**Section sources**
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts#L43-L66)
- [index.common.ts](file://packages/h5-builder/src/bedrock/di/index.common.ts#L4)

## Metadata Storage and Retrieval
The DI system stores dependency metadata on class constructors using two special symbols: `DI_TARGET` and `DI_DEPENDENCIES`. This metadata is crucial for the dependency resolution process and is accessed through the `getServiceDependencies` function during instantiation.

```mermaid
classDiagram
class ServiceIdentifier~T~ {
<<interface>>
(...args : any[]) : void
type : T
}
class DI_CONSTANTS {
+static DI_TARGET : string
+static DI_DEPENDENCIES : string
}
class MetadataStorage {
+getServiceDependencies(ctor : any) : {id : ServiceIdentifier<any>, index : number}[]
-setServiceDependency(id : ServiceIdentifier<any>, ctor : any, index : number) : void
}
ServiceIdentifier --> MetadataStorage : "used by"
DI_CONSTANTS --> MetadataStorage : "references"
MetadataStorage --> "ctor[DI_DEPENDENCIES]" : "writes to"
MetadataStorage --> "ctor[DI_TARGET]" : "writes to"
```

**Diagram sources**
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts#L22-L29)
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts#L31-L39)

**Section sources**
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts#L22-L39)

## Dependency Injection Workflow
The dependency injection workflow begins when a class constructor is decorated with service identifiers and proceeds through a series of steps to resolve and instantiate dependencies. The `InstantiationService` orchestrates this process, ensuring proper dependency ordering and lifecycle management.

```mermaid
flowchart TD
Start([Request Service Instance]) --> CheckCache["Check Service Cache"]
CheckCache --> IsCached{"Instance Cached?"}
IsCached --> |Yes| ReturnInstance["Return Cached Instance"]
IsCached --> |No| CollectDeps["Collect Dependencies via getServiceDependencies"]
CollectDeps --> ResolveDeps["Resolve Each Dependency"]
ResolveDeps --> IsKnown{"Service Known?"}
IsKnown --> |No| HandleError["Throw UnknownDependency Error"]
IsKnown --> |Yes| CreateDep["Create Dependency Instance"]
CreateDep --> AddToGraph["Add to Dependency Graph"]
AddToGraph --> AllResolved{"All Dependencies Resolved?"}
AllResolved --> |No| ResolveDeps
AllResolved --> |Yes| Instantiate["Instantiate Main Service"]
Instantiate --> CacheInstance["Cache Instance"]
CacheInstance --> ReturnInstance
ReturnInstance --> End([Return Service Instance])
HandleError --> End
```

**Diagram sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L216-L253)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L308-L395)

**Section sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L215-L450)

## Usage Examples
The DI system is used throughout the MobX H5 Builder components, with service identifiers imported from the service-identifiers module and applied as parameter decorators in class constructors. This pattern enables clean dependency declaration and injection.

```mermaid
classDiagram
class ProductCardModel {
-http : HttpService
-tracker : TrackerService
+data : ProductData
+loading : boolean
+error : Error | null
+shouldShowPrice() : boolean
+formattedPrice() : string
+handleClick() : void
}
class HttpService {
+request<T>(config : RequestConfig) : Promise<T>
+get<T>(url : string, config? : RequestConfig) : Promise<T>
+post<T>(url : string, data : any, config? : RequestConfig) : Promise<T>
}
class TrackerService {
+track(event : string, properties : Record<string, any>) : void
+identify(userId : string, traits : Record<string, any>) : void
+page(name : string, properties : Record<string, any>) : void
}
ProductCardModel --> HttpService : "@IHttpService"
ProductCardModel --> TrackerService : "@ITrackerService"
```

**Diagram sources**
- [product-card.model.ts](file://packages/h5-builder/src/components/product-card/product-card.model.ts#L29-L38)
- [service-identifiers.ts](file://packages/h5-builder/src/services/service-identifiers.ts)

**Section sources**
- [product-card.model.ts](file://packages/h5-builder/src/components/product-card/product-card.model.ts)
- [service-identifiers.ts](file://packages/h5-builder/src/services/service-identifiers.ts)

## Configuration Requirements
Proper configuration of TypeScript is essential for the decorator-based DI system to function correctly. The `tsconfig.json` file must include specific compiler options to enable decorator support and metadata emission.

```mermaid
flowchart LR
A[tsconfig.json] --> B[experimentalDecorators: true]
A --> C[emitDecoratorMetadata: true]
A --> D[strict: true]
A --> E[esModuleInterop: true]
A --> F[moduleResolution: node]
B --> G[Enable Decorator Syntax]
C --> H[Emit Type Metadata]
D --> I[Strict Type Checking]
E --> J[Default Import Compatibility]
F --> K[Node Module Resolution]
G --> M[DI System Functions]
H --> M
I --> M
J --> M
K --> M
```

**Diagram sources**
- [tsconfig.json](file://packages/h5-builder/tsconfig.json#L20-L21)

**Section sources**
- [tsconfig.json](file://packages/h5-builder/tsconfig.json)

## Troubleshooting Guide
Common issues with decorator-based dependency injection typically relate to configuration, metadata loss, or incorrect decorator application. Understanding these issues and their solutions is crucial for maintaining a healthy DI system.

```mermaid
flowchart TD
A[Common DI Issues] --> B[Metadata Loss]
A --> C[Unknown Dependency Error]
A --> D[Decorator Not Applied]
A --> E[Bundler Compatibility]
B --> B1["Check emitDecoratorMetadata: true"]
B --> B2["Ensure types are imported"]
B --> B3["Verify no tree-shaking removes types"]
C --> C1["Check service registration"]
C --> C2["Verify identifier string matches"]
C --> C3["Ensure service is in container"]
D --> D1["Confirm experimentalDecorators: true"]
D --> D2["Check decorator import path"]
D --> D3["Validate decorator syntax"]
E --> E1["Configure bundler for decorators"]
E --> E2["Preserve metadata in build"]
E --> E3["Test in development and production"]
B1 --> F[Resolved]
B2 --> F
B3 --> F
C1 --> F
C2 --> F
C3 --> F
D1 --> F
D2 --> F
D3 --> F
E1 --> F
E2 --> F
E3 --> F
```

**Diagram sources**
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)
- [tsconfig.json](file://packages/h5-builder/tsconfig.json)

**Section sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L224-L229)
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts#L57)

## Integration with React Context
The DI system integrates with React through the `InstantiationContext` provider and `useService` hook, enabling functional components to access services from the dependency container. This integration bridges the gap between class-based DI and modern React patterns.

```mermaid
sequenceDiagram
participant Component as "React Component"
participant Hook as "useService Hook"
participant Context as "InstantiationContext"
participant Service as "Service Instance"
participant Accessor as "ServicesAccessor"
Component->>Hook : useService(IHttpService)
Hook->>Context : useContext(InstantiationContext)
Context-->>Hook : Return instantiationService
Hook->>Hook : Validate service context
Hook->>Hook : useMemo with dependency array
Hook->>Accessor : invokeFunction(get accessor)
Accessor->>Accessor : get(IHttpService)
Accessor->>Service : Return service instance
Service-->>Accessor : HttpService
Accessor-->>Hook : Return service
Hook-->>Component : Return HttpService
```

**Diagram sources**
- [context.web.tsx](file://packages/h5-builder/src/bedrock/di/context.web.tsx)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L118-L148)

**Section sources**
- [context.web.tsx](file://packages/h5-builder/src/bedrock/di/context.web.tsx)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L118-L148)