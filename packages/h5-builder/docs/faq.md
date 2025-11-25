# H5 Builder 常见问题 (FAQ)

## 📖 目录

- [入门问题](#入门问题)
- [Model-View 分离](#model-view-分离)
- [依赖注入](#依赖注入)
- [生命周期](#生命周期)
- [性能优化](#性能优化)
- [测试](#测试)
- [调试](#调试)
- [常见错误](#常见错误)

---

## 入门问题

### Q: H5 Builder 适合什么场景？

**A**: H5 Builder 适合以下场景：
- 电商 H5 页面（商品列表、详情页、活动页）
- 需要 Schema 驱动的动态页面
- 需要严格 UI-逻辑分离的项目
- 需要高性能长列表的场景
- 需要完整生命周期管理的复杂应用

### Q: 为什么要用 MobX + Vue Reactivity？

**A**: 
- **MobX**: 提供简单的响应式 API（`observable`）
- **Vue Reactivity**: 轻量级、性能好
- **mobx-vue-lite**: 结合两者优势，提供 React 集成

相比直接用 MobX-React，这个方案更轻量，bundle 更小。

### Q: 必须用 TypeScript 吗？

**A**: 强烈推荐使用 TypeScript，因为：
- 依赖注入需要装饰器（`@Inject`）
- 类型安全能避免很多运行时错误
- 更好的 IDE 支持

---

## Model-View 分离

### Q: Model 和 View 如何通信？

**A**: 
1. **View → Model**: 调用 Model 的方法
2. **Model → View**: 通过响应式状态自动更新

```tsx
// View 调用 Model 方法
<button onClick={() => model.handleClick()}>点击</button>

// Model 更新状态，View 自动响应
class MyModel extends BaseComponentModel {
  public count = 0; // 响应式
  
  handleClick() {
    this.count++; // View 自动更新
  }
}
```

### Q: Model 可以访问 DOM 吗？

**A**: **不可以**。Model 层不应该包含任何 DOM 操作或 JSX。如果需要操作 DOM，应该：
1. 在 Model 中暴露状态
2. 在 View 中根据状态操作 DOM

```tsx
// ❌ 错误
class BadModel extends BaseComponentModel {
  handleClick() {
    document.querySelector('.btn').classList.add('active');
  }
}

// ✅ 正确
class GoodModel extends BaseComponentModel {
  public isActive = false;
  
  handleClick() {
    this.isActive = true;
  }
}

// View
<button className={model.isActive ? 'active' : ''}>
```

### Q: View 可以调用 HttpService 吗？

**A**: **不可以**。View 层不应该直接调用服务。所有业务逻辑都应该在 Model 中。

```tsx
// ❌ 错误
const MyView = ({ model }) => {
  const handleClick = async () => {
    const data = await http.get('/api/data');
    // ...
  };
};

// ✅ 正确
class MyModel extends BaseComponentModel {
  async handleClick() {
    const data = await this.http.get('/api/data');
    // ...
  }
}
```

---

## 依赖注入

### Q: 为什么依赖注入不工作？

**A**: 检查以下几点：
1. `tsconfig.json` 开启了 `experimentalDecorators`
2. 服务已在 Injector 中注册
3. 使用 `Injector.resolveAndInstantiate()` 创建实例

```typescript
// 1. tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}

// 2. 注册服务
injector.registerInstance(HttpService, httpService);

// 3. 创建实例
const model = injector.resolveAndInstantiate(MyModel, ['id', props]);
```

### Q: 如何在 Model 中注入多个服务？

**A**: 
```typescript
class MyModel extends BaseComponentModel {
  constructor(
    id: string,
    props: any,
    @Inject(HttpService) private http: HttpService,
    @Inject(TrackerService) private tracker: TrackerService,
    @Inject(PageContextService) private context: PageContextService
  ) {
    super(id, props);
  }
}
```

### Q: 父子 Injector 有什么用？

**A**: 
- **全局 Injector**: 存放全局服务（HttpService、TrackerService）
- **页面 Injector**: 存放页面级服务（PageContextService）
- **组件 Injector**: 存放组件级服务

子 Injector 可以访问父 Injector 的服务，但反之不行。

---

## 生命周期

### Q: init、activate、deactivate 有什么区别？

**A**: 
- **init**: 组件创建时调用一次，用于数据加载
- **activate**: 组件激活时调用，用于上报曝光、开始动画等
- **deactivate**: 组件失活时调用，用于暂停动画、停止轮询等
- **dispose**: 组件销毁时调用，用于清理资源

**典型场景**:
```typescript
class TabModel extends BaseComponentModel {
  protected async onInit() {
    // 加载数据（只执行一次）
    this.data = await this.http.get('/api/data');
  }
  
  protected onActive() {
    // 上报曝光
    this.tracker.track('TAB_EXPOSURE');
    // 开始轮询
    this.startPolling();
  }
  
  protected onInactive() {
    // 停止轮询
    this.stopPolling();
  }
  
  protected onDestroy() {
    // 清理资源
  }
}
```

### Q: 如何避免内存泄漏？

**A**: 使用 `this.register()` 注册所有需要清理的资源：

```typescript
protected onInit() {
  // 定时器
  const timer = setInterval(() => {}, 1000);
  this.register(() => clearInterval(timer));
  
  // 事件监听
  const handler = () => {};
  window.addEventListener('resize', handler);
  this.register(() => window.removeEventListener('resize', handler));
  
  // 订阅
  const unsubscribe = eventBus.on('event', handler);
  this.register(unsubscribe);
}
```

---

## 性能优化

### Q: 如何实现懒加载？

**A**: 在容器组件中，只初始化第一个子组件：

```typescript
class TabsContainerModel extends BaseContainerModel {
  protected onInit() {
    // 只初始化第一个 Tab
    if (this.children.length > 0) {
      this.children[0].init();
    }
  }
  
  switchTab(index: number) {
    const newTab = this.children[index];
    
    // 懒加载：如果还没初始化，现在初始化
    if (!newTab.isInited) {
      newTab.init();
    }
    
    newTab.activate();
  }
}
```

### Q: 如何实现闲时预热？

**A**: 使用 `JobScheduler.scheduleIdleTask()`：

```typescript
protected onInit() {
  // 闲时预热其他 Tab
  this.children.slice(1).forEach(tab => {
    this.scheduler.scheduleIdleTask(() => {
      if (!tab.isInited) {
        tab.init();
      }
    });
  });
}
```

### Q: 长列表如何优化？

**A**: 使用 `VirtualListModel`：

```typescript
const virtualList = new VirtualListModel('list', {
  itemHeight: 100,
  containerHeight: 600,
  overscan: 3,
});

virtualList.setItems(items); // 设置数据

// View
<VirtualListView
  model={virtualList}
  renderItem={(item, index) => <div>{item.name}</div>}
/>
```

---

## 测试

### Q: 如何测试 Model？

**A**: 
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Injector } from '../kernel/di';
import { MyModel } from './my-model';

describe('MyModel', () => {
  let injector: Injector;
  let model: MyModel;

  beforeEach(() => {
    injector = new Injector();
    // 注册 mock 服务
    injector.registerInstance(HttpService, mockHttp);
    
    model = injector.resolveAndInstantiate(MyModel, ['id', {}]);
  });

  it('should load data on init', async () => {
    await model.init();
    expect(model.data).toBeTruthy();
  });
});
```

### Q: 如何 Mock 服务？

**A**: 
```typescript
const mockHttp = {
  get: vi.fn().mockResolvedValue({ data: 'test' }),
  post: vi.fn(),
};

injector.registerInstance(HttpService, mockHttp);
```

---

## 调试

### Q: 如何开启 Debug 模式？

**A**: 
```typescript
// BridgeService Debug 模式（Mock 模式）
const bridge = new BridgeService(true);

// TrackerService Debug 模式（同步发送 + Toast）
const tracker = new TrackerService(bridge, { debug: true });
```

### Q: 如何查看 Model Tree？

**A**: 在浏览器控制台：
```javascript
// 假设 rootModel 是全局变量
console.log(rootModel);
console.log(rootModel.children);
```

### Q: 如何追踪生命周期？

**A**: 在 Model 中添加日志：
```typescript
protected onInit() {
  console.log(`[${this.id}] onInit`);
}

protected onActive() {
  console.log(`[${this.id}] onActive`);
}
```

---

## 常见错误

### Q: 状态不更新怎么办？

**A**: 
1. 确保属性是响应式的（直接在类上声明）
2. 确保 View 使用了 `observer` HOC
3. 检查是否直接修改了嵌套对象（需要替换整个对象）

```typescript
// ❌ 错误
class MyModel {
  private _count = 0;
  getCount() { return this._count; }
}

// ✅ 正确
class MyModel {
  public count = 0; // 响应式
}
```

### Q: "Cannot find name 'window'" 错误？

**A**: 这是测试环境的类型定义问题，不影响功能。可以忽略或在 `tsconfig.json` 中添加：
```json
{
  "compilerOptions": {
    "lib": ["DOM", "ES2020"]
  }
}
```

### Q: 组件没有渲染？

**A**: 检查：
1. 组件是否已注册到 ComponentLoader
2. Model-View 映射是否已注册到 ModelRenderer
3. Schema 的 `type` 是否正确

```typescript
// 1. 注册组件
loader.register('MyComponent', MyComponentModel);

// 2. 注册映射
registerModelView(MyComponentModel, MyComponentView);

// 3. Schema
const schema = {
  type: 'MyComponent', // 必须匹配
  id: 'my-1',
  props: {},
};
```

---

## 更多问题？

查看以下文档：
- [组件开发指南](./component_development_guide.md)
- [API 文档](./api_reference.md)
- [完整架构](./h5_builder_architecture_final.md)

或提交 Issue！
