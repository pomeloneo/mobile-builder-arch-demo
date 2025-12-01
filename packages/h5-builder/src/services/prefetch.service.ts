import { ITrackerService } from './service-identifiers';
import type { TrackerService } from './tracker.service';
import type { PrefetchConfigs, PrefetchItemConfig, ComponentSchema } from './component.service';

/**
 * 预加载服务
 * 负责收集预加载配置、调用预加载接口、缓存数据
 */
export class PrefetchService {
  readonly _serviceBrand: undefined;

  // 预加载数据缓存：nodeId -> Promise<data>
  private prefetchCache = new Map<string, Promise<any>>();

  // 预加载完成的 Promise（用于 Completed 阶段等待）
  private prefetchCompletePromise: Promise<void> | null = null;

  // 并发控制
  private readonly PREFETCH_CONCURRENCY = 6;

  constructor(
    @ITrackerService private tracker: TrackerService
  ) { }

  /**
   * 启动预加载
   * 🔥 在 GetSchemaJob 的 Open 阶段调用，不阻塞
   */
  startPrefetch(
    prefetchConfigs: PrefetchConfigs | undefined,
    rootSchema: ComponentSchema
  ): void {
    if (!prefetchConfigs || Object.keys(prefetchConfigs).length === 0) {
      console.log('[Prefetch] 没有预加载配置');
      this.prefetchCompletePromise = Promise.resolve();
      return;
    }

    console.log(`[Prefetch] 收集到 ${Object.keys(prefetchConfigs).length} 个预加载配置`);

    // 🔥 异步执行，不阻塞
    this.prefetchCompletePromise = this.executePrefetch(prefetchConfigs, rootSchema);
  }

  /**
   * 等待预加载完成
   * 🔥 在 InitFirstScreenDataJob 的 Completed 阶段调用
   */
  async waitForPrefetchComplete(): Promise<void> {
    if (this.prefetchCompletePromise) {
      await this.prefetchCompletePromise;
    }
  }

  /**
   * 执行预加载（带 Tab 优先级和并发控制）
   */
  private async executePrefetch(
    prefetchConfigs: PrefetchConfigs,
    rootSchema: ComponentSchema
  ): Promise<void> {
    // 1. 识别当前激活的 Tab
    const activeTabId = this.getActiveTabId(rootSchema);
    console.log(`[Prefetch] 当前激活的 Tab: ${activeTabId || '无'}`);

    // 2. 收集所有预加载任务，并根据 Tab 调整优先级
    const tasks = Object.entries(prefetchConfigs).map(([nodeId, config]) => {
      // 判断是否属于当前激活的 Tab
      const isInActiveTab = activeTabId ? this.isNodeInTab(nodeId, activeTabId, rootSchema) : false;

      // 调整优先级：当前 Tab 的组件优先级提升
      let adjustedPriority = config.priority || 'normal';
      if (isInActiveTab) {
        // 当前 Tab：提升优先级
        if (adjustedPriority === 'normal') adjustedPriority = 'high';
        if (adjustedPriority === 'low') adjustedPriority = 'normal';
      } else {
        // 非当前 Tab：降低优先级
        if (adjustedPriority === 'high') adjustedPriority = 'normal';
        if (adjustedPriority === 'normal') adjustedPriority = 'low';
      }

      return {
        nodeId,
        config: { ...config, priority: adjustedPriority },
        isInActiveTab
      };
    });

    // 3. 按优先级排序
    const sorted = this.sortByPriority(tasks);

    // 4. 创建预加载 Promise 并缓存
    const promises = sorted.map(({ nodeId, config }) => {
      const promise = this.fetchData(nodeId, config.params);
      this.prefetchCache.set(nodeId, promise);
      return promise;
    });

    // 5. 并发控制执行
    await this.processWithConcurrency(promises, this.PREFETCH_CONCURRENCY);

    console.log('[Prefetch] 所有预加载任务完成');
  }

  /**
   * 获取当前激活的 Tab ID
   */
  private getActiveTabId(rootSchema: ComponentSchema): string | null {
    // 假设根节点是 TabsContainer
    if (rootSchema.type === 'TabsContainer') {
      const defaultIndex = rootSchema.props?.defaultIndex ?? 0;
      const activeTab = rootSchema.children?.[defaultIndex];
      return activeTab?.id || null;
    }
    return null;
  }

  /**
   * 判断节点是否在指定的 Tab 下
   */
  private isNodeInTab(
    nodeId: string,
    tabId: string,
    rootSchema: ComponentSchema
  ): boolean {
    // 递归查找节点所属的 Tab
    const findNodeTab = (schema: ComponentSchema, currentTabId: string | null): string | null => {
      if (schema.id === nodeId) {
        return currentTabId;
      }

      if (schema.children) {
        // 如果当前节点是 Tab 的直接子节点（ProductList 或 SimpleList），更新 currentTabId
        const nextTabId = (schema.type === 'ProductList' || schema.type === 'SimpleList')
          ? schema.id
          : currentTabId;

        for (const child of schema.children) {
          const result = findNodeTab(child, nextTabId);
          if (result !== null) return result;
        }
      }

      return null;
    };

    const nodeTabId = findNodeTab(rootSchema, null);
    return nodeTabId === tabId;
  }

  /**
   * 🔥 可插拔的数据获取方法（Mock 实现）
   * 
   * 设计原则：
   * - 不依赖其他服务（除了 tracker）
   * - 改动此方法不影响前置和后置流程
   * - 可以轻松替换为真实接口调用
   */
  private async fetchData(nodeId: string, params: Record<string, any>): Promise<any> {
    try {
      console.log(`[Prefetch] 开始预加载: ${nodeId}`, params);

      // 🔥 Mock 实现（参考 ProductCardModel.fetchData）
      const data = await this.mockFetchData(nodeId, params);

      console.log(`[Prefetch] 预加载完成: ${nodeId}`);
      this.tracker.track('PREFETCH_SUCCESS', { nodeId });

      return data;
    } catch (error) {
      console.error(`[Prefetch] 预加载失败: ${nodeId}`, error);
      this.tracker.track('PREFETCH_FAILED', {
        nodeId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Mock 数据获取（模拟网络请求）
   */
  private async mockFetchData(nodeId: string, params: Record<string, any>): Promise<any> {
    // 模拟网络延迟（500ms - 1500ms）
    const delay = Math.random() * 1000 + 500;
    await new Promise(resolve => setTimeout(resolve, delay));

    // 🔥 处理商品卡片（包括 ProductCard 和 ProductCardEnhanced）
    if (nodeId.includes('product') || nodeId.includes('enhanced')) {
      const productId = params.productId || parseInt(nodeId.match(/\d+/)?.[0] || '1');

      const descriptions = [
        '这是一款超棒的产品，性能强劲，设计时尚。',
        '限时特惠！现在购买享受超值折扣，不容错过。',
        '用户评价极高，销量遥遥领先，品质有保证。',
        '采用最新科技打造，为您带来前所未有的体验。',
        '简约而不简单，细节之处见真章，值得拥有。',
      ];

      // 🔥 根据类型返回不同的图片
      const image = nodeId.includes('enhanced')
        ? 'https://p16-oec-ttp.tiktokcdn-us.com/tos-useast5-i-omjb5zjo8w-tx/664b2911bd14497cb49a6941896f5903.jpg~tplv-omjb5zjo8w-caravel-origin-fmt.image'  // ProductCardEnhanced
        : 'https://p16-oec-general-useast5.ttcdn-us.com/tos-useast5-i-omjb5zjo8w-tx/ba781dbf25134621b7b05b7919cacee8~tplv-fhlh96nyum-crop-webp:360:360.webp?dr=12190&from=1578644683&idc=useast5&ps=933b5bde&shcp=b4b98b7c&shp=5e1834cb&t=555f072d';  // ProductCard

      return {
        id: productId,
        name: nodeId.includes('enhanced') ? `商品 ${productId}（预加载 + 依赖 model 二次请求的组件）` : `商品 ${productId}（只依赖预加载的组件）`,
        price: Math.floor(Math.random() * 10000) / 100,
        image,
        description: `预加载数据。${descriptions[Math.floor(Math.random() * descriptions.length)]}`
      };
    }

    // 其他类型返回空对象
    return {};
  }

  /**
   * 获取预加载数据（返回 Promise 或 null）
   * 🔥 在 Model.init() 中调用
   */
  getData(nodeId: string): Promise<any> | null {
    return this.prefetchCache.get(nodeId) || null;
  }

  /**
   * 检查是否有预加载数据
   */
  hasPrefetchData(nodeId: string): boolean {
    return this.prefetchCache.has(nodeId);
  }

  // 工具方法：按优先级排序
  private sortByPriority(
    tasks: Array<{ nodeId: string; config: PrefetchItemConfig; isInActiveTab: boolean }>
  ) {
    const priorityWeight = { critical: 0, high: 1, normal: 2, low: 3 };
    return tasks.sort((a, b) => {
      const pa = a.config.priority || 'normal';
      const pb = b.config.priority || 'normal';
      return priorityWeight[pa] - priorityWeight[pb];
    });
  }

  // 工具方法：并发控制
  private async processWithConcurrency(
    promises: Promise<any>[],
    concurrency: number
  ): Promise<void> {
    const executing: Promise<void>[] = [];

    for (const promise of promises) {
      const wrapped = promise.then(() => {
        const index = executing.indexOf(wrapped);
        if (index !== -1) executing.splice(index, 1);
      }).catch(() => {
        // 捕获错误，避免中断其他任务
        const index = executing.indexOf(wrapped);
        if (index !== -1) executing.splice(index, 1);
      });

      executing.push(wrapped);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
  }
}
