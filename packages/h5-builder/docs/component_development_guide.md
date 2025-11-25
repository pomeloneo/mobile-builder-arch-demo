# H5 Builder 组件开发指南

## 📖 概述

本指南将教你如何在 H5 Builder 框架下开发业务组件，贯彻 **UI 和逻辑完全分离** 的原则。

---

## 🎯 核心原则

### Model-View 分离

```
Model (业务逻辑)          View (UI 渲染)
    ↓                         ↓
- 数据加载              - 纯 UI 组件
- 状态管理              - 接收 model 作为 props
- 业务逻辑              - 使用 observer HOC
- 埋点上报              - 调用 model 的方法
- 无 JSX                - 无业务逻辑
```

### 关键规则

✅ **Model 层**：
- 不包含任何 JSX
- 不直接操作 DOM
- 只负责业务逻辑和状态管理

✅ **View 层**：
- 不包含业务逻辑
- 不直接调用服务（HTTP、Tracker 等）
- 只负责 UI 渲染和事件转发

---

## 🚀 快速开始

### 步骤 1: 创建 Model

```typescript
// src/components/my-component.model.ts
import { BaseComponentModel } from '../kernel/model';
import { Inject } from '../kernel/di';
import { HttpService } from '../modules/http.service';
import { TrackerService } from '../modules/tracker.service';

export interface MyComponentProps {
  id: number;
  title?: string;
}

export class MyComponentModel extends BaseComponentModel<MyComponentProps> {
  // 响应式状态
  public loading = false;
  public error: Error | null = null;
  public data: any = null;

  constructor(
    id: string,
    props: MyComponentProps,
    @Inject(HttpService) private http: HttpService,
    @Inject(TrackerService) private tracker: TrackerService
  ) {
    super(id, props);
  }

  // 初始化：加载数据
  protected async onInit(): Promise<void> {
    await this.loadData();
  }

  // 激活：上报曝光
  protected onActive(): void {
    this.tracker.track('MY_COMPONENT_EXPOSURE', {
      id: this.props.id,
    });
  }

  // 加载数据
  private async loadData(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      this.data = await this.http.get(`/api/data/${this.props.id}`);
    } catch (error) {
      this.error = error as Error;
    } finally {
      this.loading = false;
    }
  }

  // 处理点击
  handleClick(): void {
    this.tracker.track('MY_COMPONENT_CLICK', {
      id: this.props.id,
    });
    // 其他业务逻辑...
  }
}
```

### 步骤 2: 创建 View

```tsx
// src/components/my-component.view.tsx
import React from 'react';
import { observer } from 'mobx-vue-lite';
import { MyComponentModel } from './my-component.model';

export interface MyComponentViewProps {
  model: MyComponentModel;
}

export const MyComponentView: React.FC<MyComponentViewProps> = observer(
  (props: MyComponentViewProps) => {
    const { model } = props;

    // Loading 状态
    if (model.loading) {
      return <div className="loading">加载中...</div>;
    }

    // Error 状态
    if (model.error) {
      return (
        <div className="error">
          <p>加载失败: {model.error.message}</p>
          <button onClick={() => model.init()}>重试</button>
        </div>
      );
    }

    // 正常渲染
    return (
      <div className="my-component" onClick={() => model.handleClick()}>
        <h3>{model.props.title}</h3>
        {model.data && <div>{JSON.stringify(model.data)}</div>}
      </div>
    );
  }
);

MyComponentView.displayName = 'MyComponentView';
```

### 步骤 3: 注册组件

```typescript
// 在 demo.tsx 或应用初始化代码中
loader.register('MyComponent', MyComponentModel);

// 在 ModelRenderer 中注册映射
registerModelView(MyComponentModel, MyComponentView);
```

### 步骤 4: 在 Schema 中使用

```typescript
const schema: ComponentSchema = {
  type: 'MyComponent',
  id: 'my-component-1',
  props: {
    id: 123,
    title: '我的组件',
  },
};
```

---

## 📚 常见模式

### 1. 数据加载模式

```typescript
class MyModel extends BaseComponentModel {
  public loading = false;
  public error: Error | null = null;
  public data: any = null;

  protected async onInit(): Promise<void> {
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      this.data = await this.http.get('/api/data');
    } catch (error) {
      this.error = error as Error;
      this.tracker.track('LOAD_ERROR', { error: error.message });
    } finally {
      this.loading = false;
    }
  }

  // 提供重试方法
  async retry(): Promise<void> {
    await this.loadData();
  }
}
```

### 2. 计算属性模式

```typescript
class ProductModel extends BaseComponentModel {
  public price = 99.99;
  public discount = 0.8;

  // 计算属性
  get finalPrice(): number {
    return this.price * this.discount;
  }

  get formattedPrice(): string {
    return `¥${this.finalPrice.toFixed(2)}`;
  }
}
```

### 3. 定时器管理模式

```typescript
class CountdownModel extends BaseComponentModel {
  public seconds = 60;

  protected onInit(): void {
    const timer = setInterval(() => {
      this.seconds--;
      if (this.seconds <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    // 注册清理函数
    this.register(() => clearInterval(timer));
  }
}
```

### 4. 事件订阅模式

```typescript
class MyModel extends BaseComponentModel {
  constructor(
    id: string,
    props: any,
    @Inject(EventBus) private eventBus: EventBus
  ) {
    super(id, props);
  }

  protected onInit(): void {
    // 订阅事件
    const unsubscribe = this.eventBus.on('SOME_EVENT', (data) => {
      // 处理事件
    });

    // 注册取消订阅
    this.register(unsubscribe);
  }
}
```

### 5. 容器组件模式

```typescript
class MyContainerModel extends BaseContainerModel {
  protected onInit(): void {
    // 只初始化第一个子组件
    if (this.children.length > 0) {
      this.children[0].init();
      this.children[0].activate();
    }

    // 闲时预热其他子组件
    this.children.slice(1).forEach((child) => {
      this.scheduler.scheduleIdleTask(() => {
        child.init();
      });
    });
  }

  switchTo(index: number): void {
    const oldChild = this.children[this.activeIndex];
    const newChild = this.children[index];

    // 懒加载
    if (!newChild.isInited) {
      newChild.init();
    }

    // 生命周期管理
    oldChild.deactivate();
    newChild.activate();

    this.activeIndex = index;
  }
}
```

---

## ✅ 最佳实践

### 1. 状态管理

```typescript
// ✅ 好的做法
class GoodModel extends BaseComponentModel {
  public loading = false;  // 响应式
  public data: any = null; // 响应式

  async loadData() {
    this.loading = true;  // 自动触发 UI 更新
    this.data = await this.http.get('/api');
    this.loading = false; // 自动触发 UI 更新
  }
}

// ❌ 不好的做法
class BadModel extends BaseComponentModel {
  private _data: any = null;

  getData() {
    return this._data; // 不是响应式的
  }
}
```

### 2. 错误处理

```typescript
// ✅ 好的做法
class GoodModel extends BaseComponentModel {
  public error: Error | null = null;

  async loadData() {
    try {
      this.data = await this.http.get('/api');
    } catch (error) {
      this.error = error as Error;
      this.tracker.track('ERROR', { message: error.message });
    }
  }
}
```

### 3. 资源清理

```typescript
// ✅ 好的做法
class GoodModel extends BaseComponentModel {
  protected onInit() {
    const timer = setInterval(() => {}, 1000);
    this.register(() => clearInterval(timer)); // 自动清理
  }
}

// ❌ 不好的做法
class BadModel extends BaseComponentModel {
  private timer?: number;

  protected onInit() {
    this.timer = setInterval(() => {}, 1000);
  }

  // 忘记清理，会导致内存泄漏
}
```

### 4. View 组件

```tsx
// ✅ 好的做法
export const GoodView = observer((props: ViewProps) => {
  const { model } = props;
  
  return (
    <div onClick={() => model.handleClick()}>
      {model.data.name}
    </div>
  );
});

// ❌ 不好的做法
export const BadView = (props: ViewProps) => {
  const { model } = props;
  
  // 直接调用服务 - 违反了 View 层原则
  const handleClick = async () => {
    await http.post('/api/click');
  };
  
  return <div onClick={handleClick}>{model.data.name}</div>;
};
```

---

## 🧪 测试

### Model 测试示例

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Injector } from '../kernel/di';
import { MyComponentModel } from './my-component.model';
import { HttpService } from '../modules/http.service';
import { TrackerService } from '../modules/tracker.service';

describe('MyComponentModel', () => {
  let injector: Injector;
  let model: MyComponentModel;

  beforeEach(() => {
    injector = new Injector();
    // 注册 mock 服务
    injector.registerInstance(HttpService, mockHttp);
    injector.registerInstance(TrackerService, mockTracker);

    model = injector.resolveAndInstantiate(
      MyComponentModel,
      ['test-id', { id: 123 }]
    );
  });

  it('should load data on init', async () => {
    await model.init();
    
    expect(model.loading).toBe(false);
    expect(model.data).toBeTruthy();
  });

  it('should handle click', () => {
    model.handleClick();
    
    expect(mockTracker.track).toHaveBeenCalledWith(
      'MY_COMPONENT_CLICK',
      expect.any(Object)
    );
  });
});
```

---

## 🐛 常见问题

### 1. 状态不更新？

**问题**：修改了 Model 的属性，但 View 没有更新。

**解决**：确保属性是响应式的（直接在类上声明）。

```typescript
// ✅ 正确
class MyModel extends BaseComponentModel {
  public count = 0; // 响应式
}

// ❌ 错误
class MyModel extends BaseComponentModel {
  private _count = 0;
  getCount() { return this._count; } // 不是响应式
}
```

### 2. 内存泄漏？

**问题**：定时器、事件监听器没有清理。

**解决**：使用 `this.register()` 注册清理函数。

```typescript
protected onInit() {
  const timer = setInterval(() => {}, 1000);
  this.register(() => clearInterval(timer)); // 自动清理
}
```

### 3. 依赖注入失败？

**问题**：`@Inject` 装饰器不工作。

**解决**：
1. 确保 `tsconfig.json` 开启了 `experimentalDecorators`
2. 确保服务已在 Injector 中注册
3. 确保使用 `Injector.resolveAndInstantiate()` 创建实例

---

## 📖 完整示例

查看以下文件获取完整示例：
- [ProductCardModel](file:///Users/neo/github/mobx/packages/h5-builder/src/components/product-card.model.ts)
- [ProductCardView](file:///Users/neo/github/mobx/packages/h5-builder/src/components/product-card.view.tsx)
- [TabsContainerModel](file:///Users/neo/github/mobx/packages/h5-builder/src/components/tabs-container.model.ts)
- [TabsContainerView](file:///Users/neo/github/mobx/packages/h5-builder/src/components/tabs-container.view.tsx)
- [Demo 应用](file:///Users/neo/github/mobx/packages/h5-builder/src/demo.tsx)

---

**祝你开发愉快！** 🚀
