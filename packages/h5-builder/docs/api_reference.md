# H5 Builder API 文档

## 📚 目录

- [Kernel Layer](#kernel-layer)
  - [Injector](#injector)
  - [DisposableStore](#disposablestore)
  - [BaseComponentModel](#basecomponentmodel)
  - [BaseContainerModel](#basecontainermodel)
- [Infrastructure Layer](#infrastructure-layer)
  - [BridgeService](#bridgeservice)
  - [HttpService](#httpservice)
  - [TrackerService](#trackerservice)
  - [PageContextService](#pagecontextservice)
- [Flow Layer](#flow-layer)
  - [JobScheduler](#jobscheduler)
  - [ComponentLoader](#componentloader)
- [Components](#components)
  - [ModelRenderer](#modelrenderer)
  - [VirtualList](#virtuallist)

---

## Kernel Layer

### Injector

依赖注入容器，管理服务的注册和获取。

#### 构造函数

```typescript
constructor(parent?: Injector, name?: string)
```

**参数**:
- `parent` - 父 Injector（可选）
- `name` - Injector 名称，用于调试（可选）

#### 方法

##### registerInstance

```typescript
registerInstance<T>(token: any, instance: T): void
```

注册服务实例。

**参数**:
- `token` - 服务标识（通常是类）
- `instance` - 服务实例

**示例**:
```typescript
const injector = new Injector();
injector.registerInstance(HttpService, new HttpService(bridge));
```

##### get

```typescript
get<T>(token: any): T
```

获取服务实例。

**参数**:
- `token` - 服务标识

**返回**: 服务实例

**示例**:
```typescript
const http = injector.get(HttpService);
```

##### resolveAndInstantiate

```typescript
resolveAndInstantiate<T>(ctor: new (...args: any[]) => T, staticArgs: any[] = []): T
```

创建实例并自动注入依赖。

**参数**:
- `ctor` - 类构造函数
- `staticArgs` - 静态参数（不通过 DI 注入）

**返回**: 实例

**示例**:
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

创建子 Injector。

**参数**:
- `name` - 子 Injector 名称（可选）

**返回**: 子 Injector

##### dispose

```typescript
dispose(): void
```

销毁 Injector 及其所有子 Injector 和服务。

---

### DisposableStore

资源管理器，LIFO 顺序清理资源。

#### 方法

##### add

```typescript
add(disposable: IDisposable | (() => void)): void
```

添加资源。

**参数**:
- `disposable` - 可销毁对象或清理函数

**示例**:
```typescript
const store = new DisposableStore();
store.add(() => clearInterval(timer));
```

##### dispose

```typescript
dispose(): void
```

清理所有资源（LIFO 顺序）。

---

### BaseComponentModel

组件 Model 基类。

#### 构造函数

```typescript
constructor(public id: string, public props: TProps)
```

**参数**:
- `id` - 组件唯一 ID
- `props` - 组件属性

#### 生命周期方法

##### init

```typescript
init(): void | Promise<void>
```

初始化组件。调用 `onInit()`。

##### activate

```typescript
activate(): void
```

激活组件。调用 `onActive()`。

##### deactivate

```typescript
deactivate(): void
```

失活组件。调用 `onInactive()`。

##### dispose

```typescript
dispose(): void
```

销毁组件。调用 `onDestroy()` 并清理所有资源。

#### 钩子方法（需子类实现）

```typescript
protected abstract onInit(): void | Promise<void>;
protected onActive(): void;
protected onInactive(): void;
protected onDestroy(): void;
```

#### 工具方法

##### register

```typescript
protected register(disposable: IDisposable | (() => void)): void
```

注册资源，组件销毁时自动清理。

**示例**:
```typescript
protected onInit() {
  const timer = setInterval(() => {}, 1000);
  this.register(() => clearInterval(timer));
}
```

#### 属性

- `id: string` - 组件 ID
- `props: TProps` - 组件属性
- `isInited: boolean` - 是否已初始化
- `isActive: boolean` - 是否已激活

---

### BaseContainerModel

容器 Model 基类，继承自 `BaseComponentModel`。

#### 属性

- `children: BaseComponentModel[]` - 子组件列表

#### 方法

##### addChild

```typescript
addChild(child: BaseComponentModel): void
```

添加子组件。

##### removeChild

```typescript
removeChild(child: BaseComponentModel): void
```

移除子组件。

##### clearChildren

```typescript
clearChildren(): void
```

清空所有子组件。

---

## Infrastructure Layer

### BridgeService

JSBridge 适配器。

#### 构造函数

```typescript
constructor(isDebug = false)
```

**参数**:
- `isDebug` - 是否开启 Debug 模式（Mock 模式）

#### 方法

##### call

```typescript
async call<T>(method: string, params: BridgeCallParams = {}, timeout = 5000): Promise<T>
```

调用 JSBridge 方法。

**参数**:
- `method` - 方法名
- `params` - 参数
- `timeout` - 超时时间（毫秒）

**返回**: Promise<T>

**示例**:
```typescript
const userInfo = await bridge.call('getUserInfo');
```

##### setMockResponse

```typescript
setMockResponse(method: string, data: any): void
```

设置 Mock 响应（Debug 模式）。

---

### HttpService

HTTP 请求服务。

#### 构造函数

```typescript
constructor(private bridge: BridgeService)
```

#### 方法

##### request

```typescript
async request<T>(config: HttpRequestConfig): Promise<T>
```

发起请求。

**参数**:
- `config` - 请求配置

**返回**: Promise<T>

##### get / post / put / delete

```typescript
async get<T>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>): Promise<T>
async post<T>(url: string, data?: any, config?): Promise<T>
async put<T>(url: string, data?: any, config?): Promise<T>
async delete<T>(url: string, config?): Promise<T>
```

便捷方法。

**示例**:
```typescript
const data = await http.get('/api/product/123');
await http.post('/api/product', { name: 'Product' });
```

##### addRequestInterceptor

```typescript
addRequestInterceptor(interceptor: RequestInterceptor): () => void
```

添加请求拦截器。

**返回**: 移除拦截器的函数

**示例**:
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

添加响应拦截器。

##### addErrorInterceptor

```typescript
addErrorInterceptor(interceptor: ErrorInterceptor): () => void
```

添加错误拦截器。

---

### TrackerService

埋点服务。

#### 构造函数

```typescript
constructor(private bridge: BridgeService, config: TrackerConfig = {})
```

**配置**:
```typescript
interface TrackerConfig {
  debug?: boolean;           // Debug 模式
  maxBatchSize?: number;     // 批量大小（默认 20）
  flushInterval?: number;    // 发送间隔（默认 5000ms）
  enablePersistence?: boolean; // 是否持久化
  storageKey?: string;       // localStorage key
}
```

#### 方法

##### track

```typescript
track(event: string, params: Record<string, any> = {}): void
```

上报埋点。

**示例**:
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

立即发送所有埋点。

##### clear

```typescript
clear(): void
```

清空队列。

---

### PageContextService

页面上下文服务。

#### 属性

- `userInfo: UserInfo | null` - 用户信息
- `envInfo: EnvInfo | null` - 环境信息
- `routeInfo: RouteInfo | null` - 路由信息
- `isDebug: boolean` - Debug 模式
- `isVisible: boolean` - 页面可见性
- `customState: Record<string, any>` - 自定义状态

#### 方法

##### setUserInfo

```typescript
setUserInfo(userInfo: UserInfo): void
```

##### setEnvInfo

```typescript
setEnvInfo(envInfo: EnvInfo): void
```

##### detectEnv

```typescript
detectEnv(): EnvInfo
```

检测环境信息。

##### parseRouteFromURL

```typescript
parseRouteFromURL(url?: string): RouteInfo
```

解析路由信息。

---

## Flow Layer

### JobScheduler

任务调度器。

#### 方法

##### register

```typescript
register(name: string, priority: JobPriority, fn: () => void | Promise<void>): void
```

注册任务。

**参数**:
- `name` - 任务名称
- `priority` - 优先级（Start=0, UserInit=1, Prepare=2, Render=3, Idle=4）
- `fn` - 任务函数

**示例**:
```typescript
scheduler.register('init-services', JobPriority.Start, () => {
  // 初始化服务
});
```

##### run

```typescript
async run(): Promise<void>
```

执行所有任务。

##### scheduleIdleTask

```typescript
scheduleIdleTask(fn: () => void): void
```

调度闲时任务。

---

### ComponentLoader

组件加载器。

#### 构造函数

```typescript
constructor(private injector: Injector, private tracker: TrackerService)
```

#### 方法

##### register

```typescript
register(type: string, ModelClass: any): void
```

注册组件。

**示例**:
```typescript
loader.register('ProductCard', ProductCardModel);
```

##### registerAll

```typescript
registerAll(components: Record<string, any>): void
```

批量注册。

##### buildTree

```typescript
buildTree(schema: ComponentSchema): BaseComponentModel
```

构建 Model Tree。

**参数**:
- `schema` - 组件 Schema

**返回**: 根 Model

**示例**:
```typescript
const schema = {
  type: 'ProductCard',
  id: 'card-1',
  props: { productId: 123 },
};
const model = loader.buildTree(schema);
```

---

## Components

### ModelRenderer

递归渲染器。

#### Props

```typescript
interface ModelRendererProps {
  model: BaseComponentModel;
}
```

#### 使用

```tsx
<ModelRenderer model={rootModel} />
```

#### 注册 Model-View 映射

```typescript
registerModelView(ModelClass: any, ViewComponent: React.ComponentType<any>): void
```

**示例**:
```typescript
registerModelView(ProductCardModel, ProductCardView);
```

---

### VirtualList

虚拟列表组件。

#### Model

```typescript
class VirtualListModel extends BaseComponentModel<VirtualListProps>
```

**Props**:
```typescript
interface VirtualListProps {
  itemHeight: number;      // 每项高度
  containerHeight: number; // 容器高度
  overscan?: number;       // 预渲染项数
}
```

**方法**:
- `setItems(items: any[]): void` - 设置数据源
- `handleScroll(scrollTop: number): void` - 处理滚动

**计算属性**:
- `visibleItems: any[]` - 可见项
- `totalHeight: number` - 总高度
- `offsetY: number` - 偏移量

#### View

```tsx
<VirtualListView
  model={virtualListModel}
  renderItem={(item, index) => <div>{item.name}</div>}
/>
```

---

**完整示例请参考**: [组件开发指南](./component_development_guide.md)
