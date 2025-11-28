# H5 Builder Framework

基于 DI（依赖注入）和响应式状态管理的 H5 电商搭建框架。

## 特性

- 🎯 **依赖注入**: 基于装饰器的 DI 容器，支持父子容器隔离
- ⚡ **响应式状态**: 使用 mobx-vue-lite (Vue 3 响应式系统)
- 🧹 **资源管理**: 自动化的 Disposable 模式，防止内存泄漏
- 🔄 **生命周期**: 完整的组件生命周期管理
- 📦 **Model-View 分离**: 逻辑与视图完全解耦

## 架构

```
src/
├── kernel/          # 内核层 - DI 容器、Model 基类、资源管理
├── modules/         # 服务层 - Http、Bridge、Tracker 等基础设施
├── flow/            # 流程层 - 启动编排、任务调度
├── components/      # 领域层 - 业务组件 Model
└── ui/              # 视图层 - React 组件
```

## 快速开始

### H5 Builder Framework

> 基于 MobX + Vue Reactivity 的 H5 电商搭建框架

## 🎯 特性

- ✅ **完整的依赖注入** - 基于装饰器的 DI 容器，支持父子关系
- ✅ **响应式状态管理** - 使用 `mobx-vue-lite` 实现自动响应
- ✅ **Model-View 分离** - 业务逻辑与 UI 完全解耦
- ✅ **树形架构** - Schema → Model Tree → View Tree
- ✅ **自动资源清理** - 防止内存泄漏
- ✅ **完整生命周期** - init/activate/deactivate/dispose
- ✅ **懒加载 + 闲时预热** - 性能优化
- ✅ **错误隔离** - 子组件错误不影响其他组件
- ✅ **埋点集成** - 统一的埋点服务
- ✅ **100% 测试覆盖** - 96 个测试用例

## 📦 安装

```bash
pnpm install
```

## 🚀 快速开始

### 1. 定义 Schema

```typescript
const schema: ComponentSchema = {
  type: 'TabsContainer',
  id: 'main-tabs',
  props: { defaultIndex: 0 },
  children: [
    {
      type: 'ProductCard',
      id: 'product-1',
      props: { productId: 1 },
    },
  ],
};
```

### 2. 创建 Model

```typescript
class ProductCardModel extends BaseComponentModel<{ productId: number }> {
  public loading = false;
  public data: ProductData | null = null;

  constructor(
    id: string,
    props: any,
    @Inject(HttpService) private http: HttpService
  ) {
    super(id, props);
  }

  protected async onInit(): Promise<void> {
    this.data = await this.http.get(`/api/product/${this.props.productId}`);
  }
}
```

### 3. 创建 View

```tsx
export const ProductCardView = observer((props: { model: ProductCardModel }) => {
  const { model } = props;
  
  if (model.loading) return <div>加载中...</div>;
  
  return (
    <div>
      <h3>{model.data.name}</h3>
      <div>{model.data.price}</div>
    </div>
  );
});
```

### 4. 初始化应用

```typescript
// 创建 Injector
const injector = new Injector();

// 注册服务
injector.registerInstance(HttpService, createHttpService(bridge));
injector.registerInstance(TrackerService, new TrackerService(bridge));

// 创建 ComponentLoader
const loader = new ComponentLoader(injector, tracker);
loader.register('ProductCard', ProductCardModel);

// 构建 Model Tree
const rootModel = loader.buildTree(schema);
await rootModel.init();

// 渲染
<ModelRenderer model={rootModel} />
```

## 📚 文档

- [组件开发指南](./docs/component_development_guide.md) - 如何开发新组件
- [API 文档](./docs/api_reference.md) - 完整 API 参考
- [FAQ](./docs/faq.md) - 常见问题解答
- [完整架构方案](../../.gemini/antigravity/brain/28865198-7d4f-45cb-b9e3-d10467586d9c/h5_builder_architecture_final.md) - 架构设计文档
- [ComponentLoader 设计](../../.gemini/antigravity/brain/28865198-7d4f-45cb-b9e3-d10467586d9c/component_loader_design.md) - 核心组件详解
- [任务清单](../../.gemini/antigravity/brain/28865198-7d4f-45cb-b9e3-d10467586d9c/task.md) - 实现进度
- [实现总结](../../.gemini/antigravity/brain/28865198-7d4f-45cb-b9e3-d10467586d9c/walkthrough.md) - 完整总结

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 运行测试并查看覆盖率
pnpm test:coverage

# 监听模式
pnpm test:watch
```

## 🎨 Demo

```bash
# 运行 Demo 应用
pnpm demo
```

## 🏗️ 架构

```
┌─────────────────────────────────────────┐
│           Application Layer             │
│  (Schema Definition + Initialization)   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Business Components            │
│   (ProductCard, TabsContainer, etc.)    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│             Flow Layer                  │
│  (JobScheduler, ComponentLoader)        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        Infrastructure Layer             │
│  (Bridge, HTTP, Tracker, Context)       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│             Kernel Layer                │
│     (DI, Model, Disposable)             │
└─────────────────────────────────────────┘
```

## 📝 核心概念

### Model-View 分离

- **Model**: 纯业务逻辑，无 JSX
- **View**: 纯 UI 渲染，无业务逻辑
- **通信**: View 通过 props 接收 model，调用 model 的方法

### 生命周期

```
init() → onInit()           # 初始化
activate() → onActive()     # 激活
deactivate() → onInactive() # 失活
dispose() → onDestroy()     # 销毁
```

### 依赖注入

```typescript
constructor(
  id: string,
  props: any,
  @Inject(HttpService) private http: HttpService
) {
  super(id, props);
}
```

# job流程
阶段                     | 做什么                    | 页面状态
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Open                    | 获取 Schema               | 白屏
LoadComponentLogic      | 加载 Model/View 资源      | 白屏
Prepare                 | 构建 Model Tree           | 白屏
RenderReady             | 确保 View 准备完成        | 白屏
                        | setModelTree(...)         | 🔥 开始渲染！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Render (RenderJob)      | modelTree.activate()      | ✅ 已经渲染完成
                        | 上报曝光埋点              | ✅ 用户已经看到页面
                        | 启动定时器                |
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Completed (InitDataJob) | rootModel.init()          | ✅ 已经渲染完成
                        | 拉取接口数据              | ✅ 数据逐步填充
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
