import { ComponentSchema } from './component-loader';
import { LoadingStrategy, LoadingContext } from './loading-strategy';

/**
 * Tab 感知加载策略选项
 */
export interface TabAwareStrategyOptions {
  // 是否预加载下一个 Tab
  preloadNextTab?: boolean;

  // 是否懒加载其他 Tab
  lazyLoadOtherTabs?: boolean;
}

/**
 * Tab 感知加载策略
 * 根据首屏 Tab 索引控制组件加载顺序
 */
export class TabAwareStrategy implements LoadingStrategy {
  constructor(
    private activeTabIndex: number = 0,
    private options: TabAwareStrategyOptions = {}
  ) { }

  shouldLoad(schema: ComponentSchema, context: LoadingContext): boolean {
    // 1. 如果不是 Tab 容器的子组件，正常加载
    const tabIndex = this.getTabIndex(schema);
    if (tabIndex === -1) {
      return true;
    }

    // 2. 使用 context 中的 activeTabIndex（优先）
    const activeIndex = context.activeTabIndex ?? this.activeTabIndex;

    // 3. 首屏 Tab：立即加载
    if (tabIndex === activeIndex) {
      return true;
    }

    // 4. 下一个 Tab：根据配置决定是否预加载
    if (this.options.preloadNextTab && tabIndex === activeIndex + 1) {
      return true;
    }

    // 5. 其他 Tab：根据配置决定是否懒加载
    if (this.options.lazyLoadOtherTabs) {
      return false; // 不加载，等切换到时再加载
    }

    return true; // 默认加载
  }

  adjustPriority(schema: ComponentSchema, basePriority: number): number {
    const tabIndex = this.getTabIndex(schema);

    if (tabIndex === -1) {
      return basePriority; // 不是 Tab 子组件，保持原优先级
    }

    const activeIndex = this.activeTabIndex;

    if (tabIndex === activeIndex) {
      // 首屏 Tab：提升优先级
      return basePriority + 1000;
    }

    if (tabIndex === activeIndex + 1) {
      // 下一个 Tab：中等优先级
      return basePriority + 100;
    }

    // 其他 Tab：降低优先级
    return basePriority - 100 * Math.abs(tabIndex - activeIndex);
  }

  /**
   * 获取组件所属的 Tab 索引
   */
  private getTabIndex(schema: ComponentSchema): number {
    // 从 schema 的 id 中提取 Tab 索引
    // 支持多种格式：
    // - tab-1-list -> 索引 0
    // - tab1-product-1 -> 索引 0
    // - tab-2-experiment-0 -> 索引 1
    // - tab2-text-1 -> 索引 1

    // 匹配 tab-数字 或 tab数字
    const match = schema.id.match(/tab-?(\d+)/);
    if (match) {
      return parseInt(match[1]) - 1; // tab-1 或 tab1 -> index 0
    }

    // 检查父级路径（如果有的话）
    // 这里简化处理，实际可以通过 schema 树结构判断
    return -1;
  }
}
