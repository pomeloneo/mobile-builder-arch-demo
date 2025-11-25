import { BaseContainerModel } from '../kernel/model';
import { Inject } from '../kernel/di';
import { TrackerService } from '../modules/tracker.service';
import { JobScheduler, JobPriority } from '../flow/scheduler';

/**
 * Tabs 容器 Props
 */
export interface TabsContainerProps {
  defaultIndex?: number;
}

/**
 * Tabs 容器 Model
 * 展示如何管理子组件、懒加载、闲时预热
 */
export class TabsContainerModel extends BaseContainerModel<TabsContainerProps> {
  // 当前激活的 Tab 索引
  public activeIndex: number;

  constructor(
    id: string,
    props: TabsContainerProps,
    @Inject(TrackerService) private tracker: TrackerService,
    @Inject(JobScheduler) private scheduler: JobScheduler
  ) {
    super(id, props);
    this.activeIndex = props.defaultIndex ?? 0;
  }

  /**
   * 初始化：只初始化第一个 Tab
   */
  protected onInit(): void {
    if (this.children.length === 0) {
      console.warn(`[TabsContainer:${this.id}] No children to initialize`);
      return;
    }

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
    });
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
          console.log(`[TabsContainer:${this.id}] Prewarming tab ${relativeIndex + 1}`);
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
