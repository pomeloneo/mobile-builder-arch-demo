# API Reference

<cite>
**Referenced Files in This Document**   
- [api_reference.md](file://packages/h5-builder/docs/api_reference.md)
- [disposable-store.ts](file://packages/h5-builder/src/bedrock/dispose/disposable-store.ts)
- [model.ts](file://packages/h5-builder/src/bedrock/model.ts)
- [bridge.service.ts](file://packages/h5-builder/src/services/bridge.service.ts)
- [http.service.ts](file://packages/h5-builder/src/services/http.service.ts)
- [tracker.service.ts](file://packages/h5-builder/src/services/tracker.service.ts)
- [context.service.ts](file://packages/h5-builder/src/services/context.service.ts)
- [job-scheduler.ts](file://packages/h5-builder/src/bedrock/launch/job-scheduler.ts)
- [component.service.ts](file://packages/h5-builder/src/services/component.service.ts)
- [model-renderer.tsx](file://packages/h5-builder/src/components/model-renderer.tsx)
- [virtual-list.model.ts](file://packages/h5-builder/src/components/virtual-list/virtual-list.model.ts)
- [virtual-list.view.tsx](file://packages/h5-builder/src/components/virtual-list/virtual-list.view.tsx)
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts)
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts)
</cite>

## Table of Contents
1. [Kernel Layer](#kernel-layer)
   - [Injector](#injector)
   - [DisposableStore](#disposablestore)
   - [BaseComponentModel](#basecomponentmodel)
   - [BaseContainerModel](#basecontainermodel)
2. [Infrastructure Layer](#infrastructure-layer)
   - [BridgeService](#bridgeservice)
   - [HttpService](#httpservice)
   - [TrackerService](#trackerservice)
   - [PageContextService](#pagecontextservice)
3. [Flow Layer](#flow-layer)
   - [JobScheduler](#jobscheduler)
   - [ComponentService](#componentservice)
4. [Components](#components)
   - [ModelRenderer](#modelrenderer)
   - [VirtualList](#virtuallist)
5. [Configuration and Versioning](#configuration-and-versioning)
6. [Migration Guide](#migration-guide)

## Kernel Layer

### Injector

Dependency injection container responsible for service registration and retrieval.

#### Constructor

```typescript
constructor(parent?: Injector, name?: string)
```

**Parameters**:
- `parent` - Parent Injector (optional)
- `name` - Injector name for debugging (optional)

#### Methods

##### registerInstance

```typescript
registerInstance<T>(token: any, instance: T): void
```

Registers a service instance.

**Parameters**:
- `token` - Service identifier (typically a class)
- `instance` - Service instance

**Example**:
```typescript
const injector = new Injector();
injector.registerInstance(HttpService, new HttpService(bridge));
```

##### get

```typescript
get<T>(token: any): T
```

Retrieves a service instance.

**Parameters**:
- `token` - Service identifier

**Returns**: Service instance

**Example**:
```typescript
const http = injector.get(HttpService);
```

##### resolveAndInstantiate

```typescript
resolveAndInstantiate<T>(ctor: new (...args: any[]) => T, staticArgs: any[] = []): T
```

Creates an instance with automatic dependency injection.

**Parameters**:
- `ctor` - Class constructor
- `staticArgs` - Static parameters (not injected via DI)

**Returns**: Instance

**Example**:
```typescript
const model = injector.resolveAndInstantiate(
  ProductCardModel,
  ['card-1', { productId: 123 }]
);
```

##### createChild

```typescript
createChild(name?: string): Injector
```

Creates a child Injector.

**Parameters**:
- `name` - Child Injector name (optional)

**Returns**: Child Injector

##### dispose

```typescript
dispose(): void
```

Destroys the Injector and all its child Injectors and services.

**Section sources**
- [instantiation-service.ts](file://packages/h5-builder/src/bedrock/di/instantiation-service.ts#L61-L467)
- [base.ts](file://packages/h5-builder/src/bedrock/di/base.ts#L49-L66)

### DisposableStore

Resource manager that disposes resources in LIFO (Last-In-First-Out) order.

#### Methods

##### add

```typescript
add(disposable: IDisposable | (() => void)): void
```

Adds a resource for management.

**Parameters**:
- `disposable` - Disposable object or cleanup function

**Example**:
```typescript
const store = new DisposableStore();
store.add(() => clearInterval(timer));
```

##### dispose

```typescript
dispose(): void
```

Cleans up all resources in LIFO order.

**Section sources**
- [disposable-store.ts](file://packages/h5-builder/src/bedrock/dispose/disposable-store.ts#L6-L83)

### BaseComponentModel

Base class for component models, implementing the IDisposable interface.

#### Constructor

```typescript
constructor(public id: string, public props: TProps)
```

**Parameters**:
- `id` - Unique component ID
- `props` - Component properties

#### Lifecycle Methods

##### init

```typescript
init(): void | Promise<void>
```

Initializes the component. Calls `onInit()`.

##### activate

```typescript
activate(): void
```

Activates the component. Calls `onActive()`.

##### deactivate

```typescript
deactivate(): void
```

Deactivates the component. Calls `onInactive()`.

##### dispose

```typescript
dispose(): void
```

Disposes the component. Calls `onDestroy()` and cleans up all resources.

#### Hook Methods (to be implemented by subclasses)

```typescript
protected abstract onInit(): void | Promise<void>;
protected onActive(): void;
protected onInactive(): void;
protected onDestroy(): void;
```

#### Utility Methods

##### register

```typescript
protected register(disposable: IDisposable | (() => void)): void
```

Registers a resource to be automatically cleaned up when the component is disposed.

**Example**:
```typescript
protected onInit() {
  const timer = setInterval(() => {}, 1000);
  this.register(() => clearInterval(timer));
}
```

#### Properties

- `id: string` - Component ID
- `props: TProps` - Component properties
- `isInited: boolean` - Initialization status
- `isActive: boolean` - Activation status
- `data: any` - Data container
- `loading: boolean` - Loading status
- `error: Error | null` - Error information

**Section sources**
- [model.ts](file://packages/h5-builder/src/bedrock/model.ts#L10-L155)

### BaseContainerModel

Base class for container models, extending `BaseComponentModel`.

#### Properties

- `children: BaseComponentModel[]` - Array of child components

#### Methods

##### addChild

```typescript
addChild(child: BaseComponentModel): void
```

Adds a child component.

##### removeChild

```typescript
removeChild(child: BaseComponentModel): void
```

Removes a child component.

##### clearChildren

```typescript
clearChildren(): void
```

Clears all child components.

**Section sources**
- [model.ts](file://packages/h5-builder/src/bedrock/model.ts#L168-L242)

## Infrastructure Layer

### BridgeService

JSBridge adapter for native communication.

#### Constructor

```typescript
constructor(isDebug = false)
```

**Parameters**:
- `isDebug` - Enables debug mode (mock mode)

#### Methods

##### call

```typescript
async call<T>(method: string, params: BridgeCallParams = {}, timeout = 5000): Promise<T>
```

Calls a JSBridge method.

**Parameters**:
- `method` - Method name
- `params` - Call parameters
- `timeout` - Timeout in milliseconds

**Returns**: Promise<T>

**Example**:
```typescript
const userInfo = await bridge.call('getUserInfo');
```

##### setMockResponse

```typescript
setMockResponse(method: string, data: any): void
```

Sets a mock response for testing in debug mode.

##### setMockResponses

```typescript
setMockResponses(responses: Record<string, any>): void
```

Sets multiple mock responses at once.

**Section sources**
- [bridge.service.ts](file://packages/h5-builder/src/services/bridge.service.ts#L39-L226)

### HttpService

HTTP request service built on top of BridgeService.

#### Constructor

```typescript
constructor(options: HttpServiceOptions | undefined, @IBridgeService private bridge: BridgeService)
```

**Parameters**:
- `options` - Configuration options
- `bridge` - BridgeService instance (injected)

#### Methods

##### request

```typescript
async request<T>(config: HttpRequestConfig): Promise<T>
```

Makes an HTTP request.

**Parameters**:
- `config` - Request configuration

**Returns**: Promise<T>

##### get / post / put / delete

```typescript
async get<T>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>): Promise<T>
async post<T>(url: string, data?: any, config?): Promise<T>
async put<T>(url: string, data?: any, config?): Promise<T>
async delete<T>(url: string, config?): Promise<T>
```

Convenience methods for common HTTP operations.

**Example**:
```typescript
const data = await http.get('/api/product/123');
await http.post('/api/product', { name: 'Product' });
```

##### addRequestInterceptor

```typescript
addRequestInterceptor(interceptor: RequestInterceptor): () => void
```

Adds a request interceptor.

**Returns**: Function to remove the interceptor

**Example**:
```typescript
http.addRequestInterceptor((config) => {
  config.headers['Authorization'] = 'Bearer token';
  return config;
});
```

##### addResponseInterceptor

```typescript
addResponseInterceptor(interceptor: ResponseInterceptor): () => void
```

Adds a response interceptor.

##### addErrorInterceptor

```typescript
addErrorInterceptor(interceptor: ErrorInterceptor): () => void
```

Adds an error interceptor.

##### cancelAll

```typescript
cancelAll(): void
```

Cancels all pending requests.

**Section sources**
- [http.service.ts](file://packages/h5-builder/src/services/http.service.ts#L56-L270)

### TrackerService

Analytics and tracking service.

#### Constructor

```typescript
constructor(config: TrackerConfig = {}, @IBridgeService private bridge: BridgeService)
```

**Configuration**:
```typescript
interface TrackerConfig {
  debug?: boolean;           // Debug mode
  maxBatchSize?: number;     // Maximum batch size (default 20)
  flushInterval?: number;    // Flush interval in ms (default 5000)
  enablePersistence?: boolean; // Enable localStorage persistence
  storageKey?: string;       // localStorage key
}
```

#### Methods

##### track

```typescript
track(event: string, params: Record<string, any> = {}): void
```

Tracks an event.

**Example**:
```typescript
tracker.track('PRODUCT_CLICK', {
  productId: 123,
  productName: 'Product Name',
});
```

##### flush

```typescript
async flush(): Promise<void>
```

Immediately flushes all queued events.

##### clear

```typescript
clear(): void
```

Clears the event queue.

##### get queueSize

```typescript
get queueSize(): number
```

Gets the current queue size.

**Section sources**
- [tracker.service.ts](file://packages/h5-builder/src/services/tracker.service.ts#L34-L227)

### PageContextService

Service for managing page-level context and state.

#### Properties

- `userInfo: UserInfo | null` - User information
- `envInfo: EnvInfo | null` - Environment information
- `routeInfo: RouteInfo | null` - Routing information
- `isDebug: boolean` - Debug mode status
- `isVisible: boolean` - Page visibility status
- `customState: Record<string, any>` - Custom state storage

#### Methods

##### setUserInfo

```typescript
setUserInfo(userInfo: UserInfo): void
```

Sets user information.

##### setEnvInfo

```typescript
setEnvInfo(envInfo: EnvInfo): void
```

Sets environment information.

##### detectEnv

```typescript
detectEnv(): EnvInfo
```

Detects environment information from user agent.

##### parseRouteFromURL

```typescript
parseRouteFromURL(url?: string): RouteInfo
```

Parses routing information from URL.

##### setCustomState

```typescript
setCustomState(key: string, value: any): void
```

Sets custom state.

##### getCustomState

```typescript
getCustomState<T = any>(key: string): T | undefined
```

Gets custom state.

**Section sources**
- [context.service.ts](file://packages/h5-builder/src/services/context.service.ts#L38-L136)

## Flow Layer

### JobScheduler

Task scheduler for managing application lifecycle phases.

#### Methods

##### registerJob

```typescript
registerJob<Ctor extends new (...args: any[]) => AbstractJob<T, K>>(
  phase: K,
  ctor: Ctor,
  ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>
): void
```

Registers a job to be instantiated at a specific phase.

**Parameters**:
- `phase` - Execution phase
- `ctor` - Job constructor
- `args` - Constructor arguments

##### addJob

```typescript
addJob(job: AbstractJob<T, K>): void
```

Adds a pre-constructed job.

##### getJob

```typescript
getJob<J extends AbstractJob<T, K>>(name: string): J | undefined
```

Retrieves a job by name.

##### prepare

```typescript
prepare(phase: K): boolean
```

Prepares all jobs for a phase.

##### wait

```typescript
async wait(phase: K): Promise<void>
```

Waits for all jobs that should wait on a phase.

##### advanceToPhase

```typescript
advanceToPhase(phase: K): void
```

Advances to a phase (only if no jobs require waiting).

**Section sources**
- [job-scheduler.ts](file://packages/h5-builder/src/bedrock/launch/job-scheduler.ts#L16-L122)

### ComponentService

Service responsible for component registration, loading, and model tree construction.

#### Methods

##### register

```typescript
register(type: string, ModelClass: any): void
```

Registers a component type.

##### registerAll

```typescript
registerAll(components: Record<string, any>): void
```

Registers multiple components at once.

##### buildTree

```typescript
buildTree(schema: ComponentSchema): BaseComponentModel
```

Builds a model tree from a component schema.

**Parameters**:
- `schema` - Component schema definition

**Returns**: Root model

**Example**:
```typescript
const schema = {
  type: 'ProductCard',
  id: 'card-1',
  props: { productId: 123 },
};
const model = loader.buildTree(schema);
```

##### registerAsync

```typescript
registerAsync(
  componentName: string,
  config: {
    model?: () => Promise<any>;
    view?: () => Promise<any>;
    loader?: () => Promise<{ Model: any; View: any }>;
  },
  metadata?: ComponentMetadata
): void
```

Registers an asynchronous component with lazy loading support.

##### preloadComponentsUnified

```typescript
preloadComponentsUnified(schema: ComponentSchema): {
  modelTreeReady: Promise<void>;
  viewsReady: Promise<void>;
}
```

Preloads all components in a schema with unified concurrency control.

**Returns**: Object containing promises for model tree readiness and view readiness

##### getModelTreeReady

```typescript
getModelTreeReady(): Promise<void>
```

Gets the promise that resolves when all models are loaded.

##### getViewsReady

```typescript
getViewsReady(): Promise<void>
```

Gets the promise that resolves when all views are loaded and mappings are established.

##### buildModelTree

```typescript
buildModelTree(schema: ComponentSchema): BaseComponentModel
```

Builds the model tree synchronously after all models are preloaded.

**Section sources**
- [component.service.ts](file://packages/h5-builder/src/services/component.service.ts#L100-L734)

## Components

### ModelRenderer

Recursive renderer component that renders models based on their type.

#### Props

```typescript
interface ModelRendererProps {
  model: BaseComponentModel;
}
```

#### Usage

```tsx
<ModelRenderer model={rootModel} />
```

#### Registration Methods

##### registerModelView

```typescript
registerModelView(ModelClass: any, ViewComponent: React.ComponentType<any>): void
```

Registers a model-view mapping.

**Example**:
```typescript
registerModelView(ProductCardModel, ProductCardView);
```

##### registerModelViews

```typescript
registerModelViews(mappings: Array<[any, React.ComponentType<any>]>): void
```

Registers multiple model-view mappings at once.

**Section sources**
- [model-renderer.tsx](file://packages/h5-builder/src/components/model-renderer.tsx#L1-L104)

### VirtualList

Virtualized list component for efficient rendering of large datasets.

#### Model

```typescript
class VirtualListModel extends BaseComponentModel<VirtualListProps>
```

**Props**:
```typescript
interface VirtualListProps {
  itemHeight?: number;           // Fixed item height
  estimatedItemHeight?: number;  // Estimated height for dynamic mode
  containerHeight: number;       // Container height
  overscan?: number;             // Number of items to render beyond viewport
}
```

**Methods**:
- `setItems(items: any[]): void` - Sets the data source
- `handleScroll(scrollTop: number): void` - Handles scroll events
- `updateItemHeight(index: number, height: number): void` - Updates item height (dynamic mode)

**Computed Properties**:
- `visibleItems: Array<{ item: any; index: number; top: number; height: number }>` - Visible items with positioning
- `totalHeight: number` - Total scrollable height
- `startIndex: number` - Start index of visible items
- `endIndex: number` - End index of visible items

#### View

```tsx
<VirtualListView
  model={virtualListModel}
  renderItem={(item, index) => <div>{item.name}</div>}
/>
```

**Props**:
```typescript
interface VirtualListViewProps {
  model: VirtualListModel;
  renderItem: (item: any, index: number) => React.ReactNode;
}
```

**Section sources**
- [virtual-list.model.ts](file://packages/h5-builder/src/components/virtual-list/virtual-list.model.ts#L20-L216)
- [virtual-list.view.tsx](file://packages/h5-builder/src/components/virtual-list/virtual-list.view.tsx#L78-L128)

## Configuration and Versioning

### Default Configuration Values

#### TrackerService Configuration
- `debug`: false
- `maxBatchSize`: 20
- `flushInterval`: 5000 (5 seconds)
- `enablePersistence`: false
- `storageKey`: 'h5_builder_tracker_queue'

#### HttpService Configuration
- `baseURL`: undefined
- `token`: undefined
- Default headers: { 'Content-Type': 'application/json' }
- Default timeout: 10000 (10 seconds)

#### Component Loading Concurrency
- Model concurrency: 5
- View concurrency: 3
- Total unified concurrency: 6

### Versioning Considerations

The H5 Builder Framework follows semantic versioning principles. Breaking changes will increment the major version number. Minor versions include backward-compatible features, and patch versions include backward-compatible bug fixes.

The framework maintains backward compatibility for:
- Public API methods and signatures
- Component schema structure
- Service identifiers
- Model lifecycle hooks

Deprecation periods of at least one major version will be provided before removing any public API.

**Section sources**
- [tracker.service.ts](file://packages/h5-builder/src/services/tracker.service.ts#L17-L28)
- [http.service.ts](file://packages/h5-builder/src/services/http.service.ts#L47-L50)
- [component.service.ts](file://packages/h5-builder/src/services/component.service.ts#L279-L281)

## Migration Guide

### Deprecated APIs

#### createHttpService (Deprecated)

**Replacement**: Use `new HttpService()` constructor directly.

**Migration**:
```typescript
// Old way (deprecated)
const http = createHttpService(bridge, { baseURL: '/api' });

// New way
const http = new HttpService({ baseURL: '/api' }, bridge);
```

The `createHttpService` function is deprecated and will be removed in the next major version. Direct instantiation provides better type safety and is consistent with other service patterns in the framework.

### Version 2.0 Migration Guide

When upgrading to version 2.0, please note the following breaking changes:

1. **ComponentService Loading Pattern**: The async loading pattern has been unified. Use `preloadComponentsUnified()` instead of separate model/view loading methods.

2. **Service Identifiers**: All services should use the new decorator-based identifiers (e.g., `IHttpService`, `ITrackerService`) rather than class references for dependency injection.

3. **VirtualList API**: The VirtualList component now supports both fixed and dynamic height modes. The `itemHeight` prop is optional for dynamic height mode.

4. **Error Handling**: Error reporting has been standardized. Use the `trackError` method from `TrackerHelpers` for consistent error tracking.

**Section sources**
- [http.service.ts](file://packages/h5-builder/src/services/http.service.ts#L276-L280)
- [service-identifiers.ts](file://packages/h5-builder/src/services/service-identifiers.ts#L14-L20)