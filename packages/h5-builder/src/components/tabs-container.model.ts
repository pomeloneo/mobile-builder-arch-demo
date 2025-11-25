import { BaseContainerModel } from '../kernel/model';
import { Inject } from '../kernel/di';
import { TrackerService } from '../modules/tracker.service';
import { JobScheduler, JobPriority } from '../flow/scheduler';
import { VirtualListModel } from './virtual-list.model';

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
    @Inject(TrackerService) private tracker: TrackerService,
    @Inject(JobScheduler) private scheduler: JobScheduler
  ) {
    super(id, props);
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
   */
  protected onInit(): void {
    if (this.children.length === 0) {
      console.warn(`[TabsContainer:${this.id}] No children to initialize`);
      return;
    }

    // 检测所有 Tab 是否需要虚拟滚动
    this.detectAndEnableVirtualScroll();

    // 只初始化第一个 Tab
    const firstTab = this.children[this.activeIndex];
    if (firstTab) {
      firstTab.init();
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
          `[TabsContainer:${this.id}] Virtual scroll enabled for tab ${index} (${childCount} items)`
        );
      }
    });
  }

  /**
   * 为指定 Tab 启用虚拟滚动
   */
  private enableVirtualScrollForTab(tab: BaseContainerModel, index: number): void {
    // 创建虚拟列表
    const virtualList = new VirtualListModel(`${this.id}-tab-${index}-virtual`, {
      itemHeight: this.ITEM_HEIGHT,
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
  switchTab(index: number): void {
    if (index === this.activeIndex) {
      return;
    }

    if (index < 0 || index >= this.children.length) {
      console.warn(`[TabsContainer:${this.id}] Invalid tab index: ${index}`);
      return;
    }

    const oldTab = this.children[this.activeIndex];
    const newTab = this.children[index];

    // 懒加载：如果新 Tab 还没初始化，现在初始化
    if (!newTab.isInited) {
      console.log(`[TabsContainer:${this.id}] Lazy loading tab ${index}`);
      newTab.init();
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
   * 闲时预热其他 Tab
   */
  private schedulePrewarm(): void {
    // 跳过已经初始化的第一个 Tab
    const tabsToPrewarm = this.children.filter((_, index) => index !== this.activeIndex);

    tabsToPrewarm.forEach((tab, relativeIndex) => {
      this.scheduler.scheduleIdleTask(() => {
        if (!tab.isInited) {
          const actualIndex = relativeIndex >= this.activeIndex ? relativeIndex + 1 : relativeIndex;
          console.log(`[TabsContainer:${this.id}] Prewarming tab ${actualIndex}`);
          tab.init();
        }
      });
    });
  }

  /**
   * 获取当前激活的 Tab
   */
  get activeTab() {
    return this.children[this.activeIndex];
  }
}
