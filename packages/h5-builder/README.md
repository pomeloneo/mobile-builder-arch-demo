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

### 安装依赖

```bash
pnpm install
```

### 运行测试

```bash
pnpm test
```

### 构建

```bash
pnpm build
```

## 核心概念

### 1. Injector (DI 容器)

```typescript
const globalInjector = new Injector(undefined, 'GlobalInjector');
globalInjector.registerInstance(HttpService, new HttpService());

const pageInjector = globalInjector.createChild('PageInjector');
```

### 2. Model (业务逻辑)

```typescript
class ProductCardModel extends BaseComponentModel {
  constructor(
    public id: string,
    public props: any,
    @Inject(HttpService) private http: HttpService
  ) {
    super(id, props);
  }

  protected async onInit() {
    this.data = await this.http.get('/api/product');
  }
}
```

### 3. Disposable (资源清理)

```typescript
class CountdownModel extends BaseComponentModel {
  protected onInit() {
    const timerId = setInterval(() => this.tick(), 1000);
    this.register(() => clearInterval(timerId)); // 自动清理
  }
}
```

## 文档

详细文档请参考 `/docs` 目录。

## License

MIT
