/**
 * H5 Builder 框架使用示例
 * 展示如何使用 DI、Model 和生命周期管理
 */

import { Injector, Inject, BaseComponentModel, BaseContainerModel } from './index';

// ===== 1. 定义 Service =====

/**
 * HTTP 服务
 * 负责网络请求
 */
class HttpService {
  async get(url: string): Promise<any> {
    console.log(`[HttpService] GET ${url}`);
    // 模拟网络请求
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: 123,
          name: 'Product Name',
          price: 99.99,
        });
      }, 100);
    });
  }
}

/**
 * 埋点服务
 * 负责数据上报
 */
class TrackerService {
  track(event: string, params: any): void {
    console.log(`[Tracker] ${event}`, params);
  }
}

// ===== 2. 定义业务 Model =====

/**
 * 商品卡片 Model
 * 展示如何使用依赖注入和生命周期
 */
class ProductCardModel extends BaseComponentModel<{ productId: number }> {
  // 响应式状态
  public loading = false;
  public data: any = null;
  public error: Error | null = null;

  constructor(
    id: string,
    props: { productId: number },
    // 依赖注入
    @Inject(HttpService) private http: HttpService,
    @Inject(TrackerService) private tracker: TrackerService
  ) {
    super(id, props);
  }

  protected async onInit(): Promise<void> {
    console.log(`[ProductCard:${this.id}] Loading product ${this.props.productId}`);

    try {
      this.loading = true;
      this.data = await this.http.get(`/api/product/${this.props.productId}`);

      // 埋点
      this.tracker.track('PRODUCT_LOADED', {
        productId: this.props.productId,
        productName: this.data.name,
      });
    } catch (error) {
      this.error = error as Error;
      this.tracker.track('PRODUCT_LOAD_ERROR', {
        productId: this.props.productId,
        error: (error as Error).message,
      });
    } finally {
      this.loading = false;
    }
  }

  protected onActive(): void {
    console.log(`[ProductCard:${this.id}] Became visible`);
    this.tracker.track('PRODUCT_VIEW', { productId: this.props.productId });
  }

  protected onInactive(): void {
    console.log(`[ProductCard:${this.id}] Became hidden`);
  }
}

/**
 * 倒计时 Model
 * 展示如何管理定时器资源
 */
class CountdownModel extends BaseComponentModel<{ endTime: number }> {
  public timeLeft = 0;

  protected onInit(): void {
    this.updateTime();

    // 注册定时器到垃圾袋，销毁时自动清理
    const timerId = setInterval(() => this.updateTime(), 1000);
    this.register(() => {
      console.log(`[Countdown:${this.id}] Clearing timer`);
      clearInterval(timerId);
    });
  }

  private updateTime(): void {
    this.timeLeft = Math.max(0, this.props.endTime - Date.now());
    if (this.timeLeft === 0) {
      console.log(`[Countdown:${this.id}] Time's up!`);
    }
  }

  protected onActive(): void {
    // Tab 切回时，立即更新时间
    this.updateTime();
  }
}

/**
 * Tabs 容器 Model
 * 展示如何管理子 Model 和懒加载
 */
class TabsContainerModel extends BaseContainerModel<any, ProductCardModel> {
  public activeIndex = 0;

  constructor(
    id: string,
    props: any,
    @Inject(HttpService) private http: HttpService,
    @Inject(TrackerService) private tracker: TrackerService
  ) {
    super(id, props);
  }

  protected onInit(): void {
    // 创建 3 个 Tab
    for (let i = 0; i < 3; i++) {
      const child = new ProductCardModel(
        `tab-${i}`,
        { productId: 100 + i },
        this.http,
        this.tracker
      );
      this.addChild(child);
    }

    // 只初始化第一个 Tab
    const firstTab = this.children[0];
    if (firstTab) {
      firstTab.init();
      firstTab.activate();
    }

    console.log(`[Tabs:${this.id}] Initialized with ${this.children.length} tabs`);
  }

  switchTab(index: number): void {
    if (index === this.activeIndex || index >= this.children.length) {
      return;
    }

    const oldTab = this.children[this.activeIndex];
    const newTab = this.children[index];

    // 懒加载：如果新 Tab 还没初始化，现在初始化
    if (!newTab.isInited) {
      console.log(`[Tabs:${this.id}] Lazy loading tab ${index}`);
      newTab.init();
    }

    // 生命周期管理
    oldTab.deactivate();
    newTab.activate();

    this.activeIndex = index;

    this.tracker.track('TAB_SWITCH', {
      from: this.activeIndex,
      to: index,
    });
  }
}

// ===== 3. 使用示例 =====

async function main() {
  console.log('=== H5 Builder Framework Demo ===\n');

  // 1. 创建全局 Injector
  const globalInjector = new Injector(undefined, 'GlobalInjector');

  // 2. 注册全局服务
  globalInjector.registerInstance(HttpService, new HttpService());
  globalInjector.registerInstance(TrackerService, new TrackerService());

  console.log('✓ Global services registered\n');

  // 3. 创建页面级 Injector（模拟页面初始化）
  const pageInjector = globalInjector.createChild('PageInjector');

  console.log('✓ Page injector created\n');

  // 4. 创建 Tabs 容器
  const tabs: TabsContainerModel = pageInjector.resolveAndInstantiate(
    TabsContainerModel,
    ['tabs-container', {}]
  );

  // 5. 初始化
  tabs.init();

  console.log('\n--- Waiting for data to load ---\n');
  await new Promise((resolve) => setTimeout(resolve, 200));

  // 6. 切换 Tab
  console.log('\n--- Switching to Tab 1 ---\n');
  tabs.switchTab(1);

  await new Promise((resolve) => setTimeout(resolve, 200));

  // 7. 切换 Tab
  console.log('\n--- Switching to Tab 2 ---\n');
  tabs.switchTab(2);

  await new Promise((resolve) => setTimeout(resolve, 200));

  // 8. 销毁页面（模拟用户退出）
  console.log('\n--- User exiting, disposing page ---\n');
  pageInjector.dispose();

  console.log('\n=== Demo Complete ===');
}

// 运行示例
if (require.main === module) {
  main().catch(console.error);
}

export { main as runDemo };
