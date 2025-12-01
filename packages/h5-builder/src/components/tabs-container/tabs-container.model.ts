import { BaseContainerModel } from '../../bedrock/model';
import { ITrackerService, IPrefetchService } from '../../services/service-identifiers';
import type { TrackerService } from '../../services/tracker.service';
import type { PrefetchService } from '../../services/prefetch.service';
import { VirtualListModel } from '../virtual-list/virtual-list.model';

/**
 * Tabs 容器 Props
 */
export interface TabsContainerProps {
  defaultIndex?: number;
  virtualScroll?: {
    enabled?: boolean;        // 是否启用虚拟滚动（默认自动检测）
    threshold?: number;       // 子组件数量阈值（默认 20）
    itemHeight?: number;      // 每项高度（默认 120）
    containerHeight?: number; // 容器高度（默认 600）
    overscan?: number;        // 预渲染项数（默认 3）
  };
}

/**
 * Tabs 容器 Model
 * 展示如何管理子组件、懒加载、闲时预热
 * 
 * 新增功能：自动虚拟滚动优化
 * - 当 Tab 的子组件数量超过阈值时，自动启用虚拟滚动
 * - 对 Schema 完全透明，不需要修改 Schema
 * - 可通过 props 配置虚拟滚动行为
 */
export class TabsContainerModel extends BaseContainerModel<TabsContainerProps> {
  // 当前激活的 Tab 索引
  public activeIndex: number;

  // 虚拟列表缓存（key: tab index, value: VirtualListModel）
  private virtualLists = new Map<number, VirtualListModel>();

  // 虚拟滚动配置
  private readonly VIRTUAL_THRESHOLD: number;
  private readonly ITEM_HEIGHT: number;
  private readonly CONTAINER_HEIGHT: number;
  private readonly OVERSCAN: number;

  constructor(
    id: string,
    props: TabsContainerProps,
    @ITrackerService private tracker: TrackerService,
    @IPrefetchService prefetchService: PrefetchService  // 🔥 新增
  ) {
    super(id, props, prefetchService);  // 🔥 传递给基类
    this.activeIndex = props.defaultIndex ?? 0;

    // 初始化虚拟滚动配置
    const vsConfig = props.virtualScroll || {};
    this.VIRTUAL_THRESHOLD = vsConfig.threshold ?? 20;
    this.ITEM_HEIGHT = vsConfig.itemHeight ?? 120;
    this.CONTAINER_HEIGHT = vsConfig.containerHeight ?? 600;
    this.OVERSCAN = vsConfig.overscan ?? 3;
  }

  /**
   * 初始化：只初始化第一个 Tab，并检测是否需要虚拟滚动
   * 
   * ⚠️ 注意：这里不调用 super.onInit()，因为 BaseContainerModel 会初始化所有子组件
   * 而 TabsContainer 需要懒加载（只初始化当前激活的 Tab）
   * 
   * 🎯 设计原则：
   * - 内部正确 await，让 Promise 链完整
   * - 外层通过是否 await rootModel.init() 来控制阻塞/渐进式
   */
  protected async onInit(): Promise<void> {
    if (this.children.length === 0) {
      console.warn(`[TabsContainer:${this.id}] No children to initialize`);
      return;
    }

    // 检测所有 Tab 是否需要虚拟滚动
    this.detectAndEnableVirtualScroll();

    // 初始化第一个 Tab（正确 await，让 Promise 链完整）
    const firstTab = this.children[this.activeIndex];
    const initPromise = firstTab.init();
    if (firstTab) {
      await initPromise;
      firstTab.activate();
    }

    // 闲时预热其他 Tab
    this.schedulePrewarm();

    this.tracker.track('TABS_INIT', {
      tabsId: this.id,
      totalTabs: this.children.length,
      activeIndex: this.activeIndex,
      virtualScrollEnabled: this.virtualLists.size > 0,
    });

    return initPromise
  }

  /**
   * 检测并启用虚拟滚动
   */
  private detectAndEnableVirtualScroll(): void {
    const vsConfig = this.props.virtualScroll || {};
    const forceEnabled = vsConfig.enabled === true;
    const forceDisabled = vsConfig.enabled === false;

    this.children.forEach((tab, index) => {
      // 如果强制禁用，跳过
      if (forceDisabled) {
        return;
      }

      // 检查是否是容器组件
      if (!(tab instanceof BaseContainerModel)) {
        return;
      }

      // 检查子组件数量
      const childCount = tab.children.length;
      const shouldEnable = forceEnabled || childCount > this.VIRTUAL_THRESHOLD;

      if (shouldEnable && childCount > 0) {
        this.enableVirtualScrollForTab(tab, index);
        console.log(
          `[TabsContainer:${this.id}] Virtual scroll enabled for tab ${index}(${childCount} items)`
        );
      }
    });
  }

  /**
   * 为指定 Tab 启用虚拟滚动
   */
  private enableVirtualScrollForTab(tab: BaseContainerModel, index: number): void {
    // 创建虚拟列表（使用动态高度模式）
    const virtualList = new VirtualListModel(`${this.id} -tab - ${index} -virtual`, {
      estimatedItemHeight: this.ITEM_HEIGHT, // 使用估算高度，而不是固定高度
      containerHeight: this.CONTAINER_HEIGHT,
      overscan: this.OVERSCAN,
    });

    // 设置数据（使用 Tab 的子组件）
    virtualList.setItems(tab.children);

    // 缓存
    this.virtualLists.set(index, virtualList);

    // 注册清理
    this.register(() => {
      virtualList.dispose();
      this.virtualLists.delete(index);
    });
  }

  /**
   * 判断某个 Tab 是否启用了虚拟滚动
   */
  isVirtualScrollEnabled(index: number): boolean {
    return this.virtualLists.has(index);
  }

  /**
   * 获取虚拟列表
   */
  getVirtualList(index: number): VirtualListModel | undefined {
    return this.virtualLists.get(index);
  }

  /**
   * 切换 Tab
   */
  async switchTab(index: number): Promise<void> {
    if (index === this.activeIndex) {
      return;
    }

    if (index < 0 || index >= this.children.length) {
      console.warn(`[TabsContainer:${this.id}] Invalid tab index: ${index} `);
      return;
    }

    const oldTab = this.children[this.activeIndex];
    const newTab = this.children[index];

    // 懒加载：如果新 Tab 还没初始化，现在初始化
    if (!newTab.isInited) {
      console.log(`[TabsContainer:${this.id}] Lazy loading tab ${index} `);
      await newTab.init();
    }

    // 生命周期管理
    oldTab.deactivate();
    newTab.activate();

    const previousIndex = this.activeIndex;
    this.activeIndex = index;

    this.tracker.track('TAB_SWITCH', {
      tabsId: this.id,
      from: previousIndex,
      to: index,
      virtualScrollEnabled: this.isVirtualScrollEnabled(index),
    });
  }

  /**
   * 渐进式预热其他 Tab
   * 策略：
   * 1. 优先预热相邻的 Tab（左右各一个）- 延迟 500ms
   * 2. 再预热其他 Tab - 延迟 2000ms
   * 3. 超时兜底 - 5秒后强制预热所有未初始化的 Tab
   */
  private schedulePrewarm(): void {
    const currentIndex = this.activeIndex;
    const totalTabs = this.children.length;

    // 🔥 优先级 1：相邻的 Tab（左右各一个）
    const adjacentIndices = [
      currentIndex - 1,  // 左边
      currentIndex + 1   // 右边
    ].filter(i => i >= 0 && i < totalTabs);

    // 🔥 优先级 2：其他 Tab
    const otherIndices = this.children
      .map((_, i) => i)
      .filter(i => i !== currentIndex && !adjacentIndices.includes(i));

    // 先预热相邻的（延迟 500ms 起，每个间隔 200ms）
    adjacentIndices.forEach((index, priority) => {
      this.prewarmTab(index, 500 + priority * 200);
    });

    // 再预热其他的（延迟 2000ms 起，每个间隔 500ms）
    otherIndices.forEach((index, priority) => {
      this.prewarmTab(index, 2000 + priority * 500);
    });

    // 🔥 超时兜底：5秒后强制预热所有未初始化的 Tab
    setTimeout(() => {
      this.children.forEach((tab, index) => {
        if (index !== currentIndex && !tab.isInited) {
          console.log(`[TabsContainer:${this.id}] Timeout fallback: prewarming tab ${index}`);
          tab.init().catch(err => {
            console.error(`[TabsContainer:${this.id}] Prewarm failed for tab ${index}:`, err);
          });
        }
      });
    }, 5000);
  }

  /**
   * 预热单个 Tab
   */
  private prewarmTab(index: number, delay: number): void {
    const tab = this.children[index];

    setTimeout(() => {
      if (!tab.isInited) {
        console.log(`[TabsContainer:${this.id}] Prewarming tab ${index} (delay: ${delay}ms)`);
        tab.init().catch(err => {
          console.error(`[TabsContainer:${this.id}] Prewarm failed for tab ${index}:`, err);
        });
      }
    }, delay);
  }

  /**
   * 获取当前激活的 Tab
   */
  get activeTab() {
    return this.children[this.activeIndex];
  }
}
