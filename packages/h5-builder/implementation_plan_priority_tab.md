# Tab 优先构建策略实施方案

## 1. 目标与背景

**目标**：在多 Tab 页面场景下，优先构建高频访问的 Tab（通常是默认选中的 Tab），延迟构建其他低频 Tab，从而显著减少首屏 Model Tree 的构建时间和初始化开销，提升首屏渲染速度。

**背景**：当前架构是一次性构建完整的 Model Tree。对于包含多个复杂 Tab 的页面，即使首屏只显示一个 Tab，也会因为构建所有 Tab 的 Model 而阻塞渲染。

## 2. 核心设计思路

利用 MobX 的响应式特性和 Model Tree 的动态能力，采用 **"骨架先行 + 动态注入"** 的策略。

1.  **Schema 拆分**：将页面 Schema 逻辑上拆分为 "容器骨架 + 高频 Tab" 和 "低频 Tabs"。
2.  **分阶段构建**：
    *   **阶段一（Critical）**：构建 `TabsContainer` 和 高频 Tab 的 Model。
    *   **阶段二（Render）**：立即渲染首屏，用户可见并可交互。
    *   **阶段三（Lazy/Idle）**：在浏览器空闲时或用户交互时，构建剩余 Tab 的 Model。
3.  **动态注入**：将后续构建好的 Tab Model 动态添加到 `TabsContainer` 中，MobX 会自动驱动 UI 更新。

## 3. 架构变更与 API 设计

### 3.1 ComponentLoader 增强

我们需要一种机制来支持"部分构建"或者"Schema 预处理"。

**方案 A：Schema 预处理辅助函数（推荐，侵入性小）**
不修改 `ComponentLoader` 核心逻辑，而是提供工具函数来处理 Schema。

```typescript
// 工具函数：拆分 Schema
interface SplitSchemaResult {
  skeleton: ComponentSchema; // 包含容器和高频 Tab
  deferred: Array<{          // 延迟加载的 Tabs
    index: number;
    schema: ComponentSchema;
  }>;
}

function splitTabSchema(
  rootSchema: ComponentSchema, 
  containerId: string, 
  priorityIndex: number
): SplitSchemaResult;
```

**方案 B：Loader 支持部分构建（侵入性大，暂不推荐）**
修改 `buildTree` 方法支持 `includePaths` 参数。

### 3.2 TabsContainerModel 增强

`TabsContainerModel` 需要更好地支持动态 Tab 管理。虽然 `children` 已经是响应式的，但我们需要更语义化的 API。

```typescript
class TabsContainerModel extends BaseContainerModel {
  // ... 现有属性

  /**
   * 动态挂载 Tab
   * @param tab Tab 组件 Model
   * @param index 插入位置（可选，默认追加）
   */
  mountTab(tab: BaseComponentModel, index?: number): void {
    if (index !== undefined) {
      // 支持在指定位置插入/替换（用于占位符替换模式）
      this.children.splice(index, 0, tab);
    } else {
      this.children.push(tab);
    }
  }
  
  /**
   * 检查 Tab 是否已就绪
   */
  isTabReady(index: number): boolean {
    return !!this.children[index];
  }
}
```

### 3.3 调度策略 (Strategy)

引入 `TabLoadingStrategy` 来控制加载时机。

```typescript
type LoadingTrigger = 'idle' | 'interaction' | 'immediate';

interface TabLoadingStrategy {
  trigger: LoadingTrigger;
  delay?: number; // 延迟毫秒数
}
```

## 4. 详细实现步骤

### 步骤 1：增强 TabsContainerModel
- 修改 `packages/h5-builder/src/components/tabs-container/tabs-container.model.ts`
- 添加 `mountTab` 方法。
- 确保 `children` 变更能正确触发 `TabsContainerView` 的更新（特别是 Tab 标题栏的重新渲染）。

### 步骤 2：实现 Schema 拆分工具
- 在 `packages/h5-builder/src/utils/schema-helper.ts` (新建) 中实现 `splitTabSchema`。
- 逻辑：
  1. 找到目标 `TabsContainer` Schema。
  2. 提取 `children`。
  3. 保留高频 index 的 child。
  4. 将其他 children 移出，并生成占位符（可选）或直接留空。

### 步骤 3：实现分阶段构建流程 (Demo 验证)
- 创建 `packages/h5-builder/src/demo-priority.tsx`。
- 流程演示：
  ```typescript
  // 1. 拆分
  const { skeleton, deferred } = splitTabSchema(fullSchema, 'main-tabs', 0);
  
  // 2. 构建骨架
  const rootModel = await loader.buildTreeWithSplitLoading(skeleton);
  
  // 3. 渲染
  render(rootModel);
  
  // 4. 注册后台任务
  scheduler.register('load-other-tabs', JobPriority.Idle, async () => {
    const tabsContainer = rootModel.find('main-tabs');
    
    for (const item of deferred) {
      // 构建剩余 Tab
      const tabModel = await loader.buildTreeWithSplitLoading(item.schema);
      // 动态挂载
      tabsContainer.mountTab(tabModel, item.index);
    }
  });
  ```

## 5. 兼容性与降级

- **渐进式兼容**：此方案完全兼容现有的 `buildTreeWithSplitLoading`。如果不进行 Schema 拆分，就是原有的全量构建模式。
- **阻塞式兼容**：同理，如果不拆分，直接 `await` 构建完成，就是阻塞式。
- **降级策略**：如果高频 Tab 构建失败，可以降级为构建 Error 页或重试。

## 6. 潜在风险与应对

1.  **Tab 标题闪烁**：
    *   *问题*：初始只有一个 Tab 标题，后续加载出其他 Tab 时，标题栏会发生变化（宽度、布局）。
    *   *应对*：可以在骨架 Schema 中保留所有 Tab 的标题信息（通过 props 传递），即使内容 Model 还没加载。这需要 `TabsContainer` 支持 "只有标题，没有内容 Model" 的中间状态。

2.  **索引错乱**：
    *   *问题*：动态插入可能导致 `activeIndex` 指向错误的 Tab。
    *   *应对*：使用 `tabId` 而非 `index` 作为唯一标识，或者在插入时严格控制顺序（使用占位符替换模式最稳健）。

## 7. 结论

该方案在不破坏现有架构的前提下，通过 **Schema 预处理** 和 **Model 动态注入** 实现了 Tab 优先构建。它将复杂的构建过程分解为可调度的微任务，完美契合当前的异步调度架构。
