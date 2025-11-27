import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { InstantiationService, ServiceRegistry, SyncDescriptor } from './bedrock/di/index.common';
import { IHttpService, ITrackerService, IBridgeService, IPageContextService, IJobScheduler } from './services/service-identifiers';
import { BridgeService } from './modules/bridge.service';
import { HttpService } from './modules/http.service';
import { TrackerService } from './modules/tracker.service';
import { PageContextService } from './modules/context.service';
import { JobScheduler as LifecycleJobScheduler, AbstractJob } from './bedrock/launch';
import { JobScheduler as SimpleJobScheduler } from './flow/scheduler';
import { Barrier } from './bedrock/async/barrier';
import { ComponentLoader, ComponentSchema } from './flow/component-loader';
import { ModelRenderer } from './components';
import { BaseComponentModel } from './bedrock/model';
import './demo.css';

/**
 * 页面生命周期枚举
 */
enum PageLifecycle {
  Open = 0,      // 组件资源加载
  Prepare = 1,   // 构建模型树
  Ready = 2,     // 视图加载完成（暂未使用）
  Completed = 3, // 数据初始化
  Idle = 4,      // 闲时任务（暂未使用）
}


const textContents = [
  '这是一段简短的文本内容。',
  '这是一段中等长度的文本内容，包含了更多的信息和细节描述。',
  '这是一段较长的文本内容，包含了非常详细的信息描述，可以用来测试不同高度的组件在虚拟滚动中的表现。我们需要确保虚拟滚动能够正确处理各种高度的组件。',
  '这是一段非常长的文本内容，包含了大量的详细信息和描述。这段文本可以用来测试组件在不同高度下的渲染效果，以及虚拟滚动在处理大量不同高度组件时的性能表现。我们希望通过这个测试来验证虚拟滚动的稳定性和可靠性。',
];

// 6. 定义 Schema - 展示动态高度虚拟滚动 + 嵌套容器
const schema: ComponentSchema = {
  type: 'TabsContainer',
  id: 'main-tabs',
  props: {
    defaultIndex: 0,
    // 虚拟滚动配置
    virtualScroll: {
      threshold: 25,             // 超过 15 个就启用虚拟滚动
      estimatedItemHeight: 120,  // 估算高度（动态高度模式）
      containerHeight: 600,      // 容器高度
    },
  },
  children: [
    // Tab 1: 混合高度组件（文本卡片 + 商品卡片）
    {
      type: 'ProductList',
      id: 'tab-1-list',
      props: {},
      children: Array.from({ length: 20 }, (_, i) => {
        // 每 3 个商品卡片插入 1-2 个文本卡片
        if (i % 3 === 0) {
          const textCards = [];
          // 随机 1-2 个文本卡片
          const textCardCount = (i % 2) + 1;
          for (let j = 0; j < textCardCount; j++) {
            const lines = ((i + j) % 4) + 1; // 1-4 行
            textCards.push({
              type: 'TextCard',
              id: `tab1-text-${i}-${j}`,
              props: {
                title: `文本卡片 #${i}-${j}`,
                content: textContents[(i + j) % textContents.length],
                lines: lines,
              },
            });
          }
          return textCards;
        }
        // 商品卡片
        return {
          type: 'ProductCard',
          id: `tab1-product-${i}`,
          props: {
            productId: i + 1,
            showPrice: true,
          },
        };
      }).flat(),
    },

    // Tab 2: 嵌套容器 - 实验容器根据实验信息动态渲染
    {
      type: 'ProductList',
      id: 'tab-2-list',
      props: {},
      children: Array.from({ length: 30 }, (_, i) => {
        // 每 5 个商品插入一个实验容器
        if (i % 5 === 0) {
          return {
            type: 'ExperimentContainer',
            id: `tab2-experiment-${i}`,
            props: {
              experimentKey: `product_card_style_${i}`,
              variants: {
                control: [],       // 对照组：不显示
                variant_a: [0],    // 实验组 A：显示文本卡片 (索引 0)
                variant_b: [1],    // 实验组 B：显示商品卡片 (索引 1)
              },
            },
            // 实验容器的子组件（根据实验分组决定渲染哪些）
            children: [
              {
                type: 'TextCard',
                id: `tab2-experiment-${i}-text`,
                props: {
                  title: `🧪 实验组内容 #${i}`,
                  content: `这是实验容器内的文本卡片，根据实验分组动态渲染。${textContents[i % textContents.length]}`,
                  lines: 3,
                },
              },
              {
                type: 'ProductCard',
                id: `tab2-experiment-${i}-product`,
                props: {
                  productId: i + 100,
                  showPrice: true,
                },
              },
            ],
          };
        }
        // 普通商品卡片
        return {
          type: 'ProductCard',
          id: `tab2-product-${i}`,
          props: {
            productId: i + 50,
            showPrice: true,
          },
        };
      }),
    },

    // Tab 3: 大量混合组件（测试虚拟滚动性能）
    {
      type: 'ProductList',
      id: 'tab-3-list',
      props: {},
      children: Array.from({ length: 100 }, (_, i) => {
        const type = i % 4;
        if (type === 0) {
          // 短文本卡片
          return {
            type: 'TextCard',
            id: `tab3-text-short-${i}`,
            props: {
              title: `短文本 #${i}`,
              content: textContents[0],
              lines: 1,
            },
          };
        } else if (type === 1) {
          // 长文本卡片
          return {
            type: 'TextCard',
            id: `tab3-text-long-${i}`,
            props: {
              title: `长文本 #${i}`,
              content: textContents[3],
              lines: 5,
            },
          };
        } else {
          // 商品卡片
          return {
            type: 'ProductCard',
            id: `tab3-product-${i}`,
            props: {
              productId: i + 200,
              showPrice: true,
            },
          };
        }
      }),
    },

    // Tab 4: 深度嵌套容器（展示容器嵌套能力）
    {
      type: 'ProductList',
      id: 'tab-4-list',
      props: {},
      children: [
        // 第1层：时间段容器
        {
          type: 'TimeBasedContainer',
          id: 'tab4-time-container',
          props: {
            timeSlots: {
              morning: { startHour: 6, endHour: 12 },
              afternoon: { startHour: 12, endHour: 18 },
              evening: { startHour: 18, endHour: 24 },
              night: { startHour: 0, endHour: 6 },
            },
          },
          children: [
            // 第2层：条件容器（VIP 用户）
            {
              type: 'ConditionalContainer',
              id: 'tab4-vip-container',
              props: {
                condition: 'user_vip',
              },
              children: [
                {
                  type: 'TextCard',
                  id: 'tab4-vip-welcome',
                  props: {
                    title: '🌟 VIP 专属',
                    content: '尊贵的 VIP 用户，欢迎您！享受专属优惠和服务。',
                    lines: 2,
                  },
                },
                // 第3层：网格布局容器
                {
                  type: 'GridLayoutContainer',
                  id: 'tab4-vip-grid',
                  props: {
                    columns: 2,
                    gap: 8,
                  },
                  children: [
                    {
                      type: 'ProductCard',
                      id: 'tab4-vip-product-1',
                      props: { productId: 301, showPrice: true },
                    },
                    {
                      type: 'ProductCard',
                      id: 'tab4-vip-product-2',
                      props: { productId: 302, showPrice: true },
                    },
                  ],
                },
              ],
            },

            // 第2层：条件容器（新用户）
            {
              type: 'ConditionalContainer',
              id: 'tab4-new-user-container',
              props: {
                condition: 'user_new',
              },
              children: [
                {
                  type: 'TextCard',
                  id: 'tab4-new-user-welcome',
                  props: {
                    title: '👋 新用户欢迎',
                    content: '欢迎新用户！这里有新手专享优惠等你来领取。',
                    lines: 2,
                  },
                },
                // 第3层：实验容器
                {
                  type: 'ExperimentContainer',
                  id: 'tab4-new-user-experiment',
                  props: {
                    experimentKey: 'new_user_guide',
                    variants: {
                      control: [],       // 对照组：不显示
                      variant_a: [0],    // 实验组 A：显示指南
                      variant_b: [1],    // 实验组 B：显示步骤网格
                    },
                  },
                  children: [
                    {
                      type: 'TextCard',
                      id: 'tab4-experiment-guide',
                      props: {
                        title: '📖 新手指南',
                        content: '跟随指引，快速了解我们的产品和服务。',
                        lines: 3,
                      },
                    },
                    // 第4层：网格布局
                    {
                      type: 'GridLayoutContainer',
                      id: 'tab4-experiment-grid',
                      props: {
                        columns: 3,
                        gap: 4,
                      },
                      children: [
                        {
                          type: 'TextCard',
                          id: 'tab4-guide-1',
                          props: { title: '步骤1', content: '注册账号', lines: 1 },
                        },
                        {
                          type: 'TextCard',
                          id: 'tab4-guide-2',
                          props: { title: '步骤2', content: '完善资料', lines: 1 },
                        },
                        {
                          type: 'TextCard',
                          id: 'tab4-guide-3',
                          props: { title: '步骤3', content: '开始购物', lines: 1 },
                        },
                      ],
                    },
                  ],
                },
              ],
            },

            // 第2层：随机惊喜容器
            {
              type: 'ConditionalContainer',
              id: 'tab4-surprise-container',
              props: {
                condition: 'random',
                probability: 0.7, // 70% 概率显示
              },
              children: [
                {
                  type: 'TextCard',
                  id: 'tab4-surprise',
                  props: {
                    title: '🎁 惊喜福利',
                    content: '恭喜你！获得了一个随机惊喜福利，快来领取吧！',
                    lines: 2,
                  },
                },
                // 第3层：网格布局（惊喜商品）
                {
                  type: 'GridLayoutContainer',
                  id: 'tab4-surprise-grid',
                  props: {
                    columns: 2,
                    gap: 8,
                  },
                  children: Array.from({ length: 4 }, (_, i) => ({
                    type: 'ProductCard',
                    id: `tab4-surprise-product-${i}`,
                    props: { productId: 400 + i, showPrice: true },
                  })),
                },
              ],
            },
          ],
        },

        // 普通商品列表（作为对比）
        ...Array.from({ length: 10 }, (_, i) => ({
          type: 'ProductCard',
          id: `tab4-normal-product-${i}`,
          props: { productId: 500 + i, showPrice: true },
        })),
      ],
    },
  ],
};

/**
 * Job 1: 加载组件资源（Model 和 View）
 */
class LoadComponentsJob extends AbstractJob<PageLifecycle> {
  protected _name = 'LoadComponents';

  constructor(
    private loader: ComponentLoader,
    private schema: ComponentSchema,
    private onProgress: (msg: string) => void
  ) {
    super();
  }

  protected _executePhase(phase: PageLifecycle) {
    if (phase !== PageLifecycle.Open) return;

    const barrier = new Barrier();
    this._setBarrier(phase, barrier);

    this.onProgress('加载组件资源中...');
    console.log('==========================组件的model资源加载开始');
    console.time('==========================组件的model资源加载完成');

    const { modelTreeReady, viewsReady } = this.loader.preloadComponents(this.schema);

    // 等待 Model 和 View 都加载完成
    Promise.all([modelTreeReady, viewsReady])
      .then(() => {
        console.timeEnd('==========================组件的model资源加载完成');
        console.log('==================开始加载组件 view 资源');
        console.time('==================组件 view 资源加载完成');
        console.timeEnd('==================组件 view 资源加载完成');
        this.onProgress('组件资源加载完成');
        barrier.open();
      })
      .catch(err => {
        console.error('组件资源加载失败:', err);
        barrier.open(); // 即使失败也要 open，避免死锁
      });
  }
}

/**
 * Job 2: 构建模型树
 */
class BuildTreeJob extends AbstractJob<PageLifecycle> {
  protected _name = 'BuildTree';
  private rootModel?: BaseComponentModel;

  constructor(
    private loader: ComponentLoader,
    private schema: ComponentSchema,
    private onProgress: (model: BaseComponentModel | null, msg: string) => void
  ) {
    super();
  }

  protected _executePhase(phase: PageLifecycle) {
    if (phase !== PageLifecycle.Prepare) return;

    this.onProgress(null, '构建模型树中...');
    console.log('==================开始构建逻辑树');
    console.time('==================构建逻辑树完成');

    this.rootModel = this.loader.buildModelTree(this.schema);

    console.timeEnd('==================构建逻辑树完成');
    this.onProgress(this.rootModel, '模型树构建完成');
  }

  getRootModel() {
    return this.rootModel;
  }
}

/**
 * Job 3: 初始化数据（后台异步）
 */
class InitDataJob extends AbstractJob<PageLifecycle> {
  protected _name = 'InitData';

  constructor(
    private getBuildTreeJob: () => BuildTreeJob,
    private onProgress: (msg: string) => void
  ) {
    super();
  }

  protected _executePhase(phase: PageLifecycle) {
    if (phase !== PageLifecycle.Completed) return;

    const barrier = new Barrier();
    this._setBarrier(phase, barrier);

    const rootModel = this.getBuildTreeJob().getRootModel();
    if (!rootModel) {
      console.warn('rootModel 不存在，跳过数据初始化');
      barrier.open();
      return;
    }

    this.onProgress('初始化数据中...');
    console.log('==========================数据初始化开始');
    console.time('==========================数据初始化完成');

    rootModel.init()
      .then(() => {
        console.timeEnd('==========================数据初始化完成');
        this.onProgress('数据初始化完成');
        barrier.open();
      })
      .catch(err => {
        console.error('数据初始化失败:', err);
        barrier.open();
      });
  }
}

/**
 * 渐进式渲染 Demo 应用
 */
function ProgressiveDemoApp() {
  const [rootModel, setRootModel] = useState<BaseComponentModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('Initializing...');

  useEffect(() => {
    // 启动初始化流程
    initializeProgressiveApp((model, step) => {
      if (model) {
        console.log('[ProgressiveDemo] ⚡️ Model tree ready, rendering immediately!');
        setRootModel(model);
        setLoading(false);
      }
      if (step) {
        setStatus(step);
      }
    }).catch(err => {
      console.error('[ProgressiveDemo] Failed:', err);
      setStatus(`Error: ${err.message}`);
    });
  }, []);

  return (
    <div className="app">
      <header className="app-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <h1>Demo - 渐进式渲染</h1>
        <p>Model Tree 构建即渲染 · 数据后台加载</p>
        <div className="status-badge">
          状态: {status}
        </div>
      </header>

      <main className="app-main">
        {loading ? (
          <div className="app-loading">
            <div className="spinner"></div>
            <p>正在构建组件树...</p>
          </div>
        ) : (
          <div style={{ height: '720px', overflow: 'auto' }}>
            {/* 关键点：这里渲染时，子组件的数据可能还在加载中 */}
            {rootModel && <ModelRenderer model={rootModel} />}
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * 创建并配置 JobScheduler
 */
function makeJobScheduler(
  instantiationService: InstantiationService,
  loader: ComponentLoader,
  schema: ComponentSchema,
  onProgress: (model: BaseComponentModel | null, step: string) => void
) {
  const jobScheduler = instantiationService.createInstance(
    LifecycleJobScheduler<PageLifecycle>,
    PageLifecycle.Open
  );

  // 创建 Job 实例
  const buildTreeJob = new BuildTreeJob(loader, schema, onProgress);

  // 注册 Jobs
  jobScheduler.addJob(new LoadComponentsJob(loader, schema, (msg) => onProgress(null, msg)));
  jobScheduler.addJob(buildTreeJob);
  jobScheduler.addJob(new InitDataJob(() => buildTreeJob, (msg) => onProgress(null, msg)));

  return { jobScheduler, buildTreeJob };
}

/**
 * 驱动 JobScheduler 执行各个生命周期阶段
 */
async function driveJobScheduler(
  jobScheduler: LifecycleJobScheduler<PageLifecycle>,
  buildTreeJob: BuildTreeJob,
  onProgress: (model: BaseComponentModel | null, step: string) => void
) {
  // Open: 加载组件资源
  console.log('==========================Open 阶段开始');
  console.time('==========================Open 阶段完成');
  jobScheduler.prepare(PageLifecycle.Open);
  await jobScheduler.wait(PageLifecycle.Open);
  console.timeEnd('==========================Open 阶段完成');

  // Prepare: 构建模型树
  console.log('==========================Prepare 阶段开始');
  console.time('==========================Prepare 阶段完成');
  jobScheduler.prepare(PageLifecycle.Prepare);
  await jobScheduler.wait(PageLifecycle.Prepare);
  console.timeEnd('==========================Prepare 阶段完成');

  // 立即返回 rootModel 进行渲染
  const rootModel = buildTreeJob.getRootModel();
  if (rootModel) {
    onProgress(rootModel, '模型树就绪，开始渲染');
    rootModel.activate();
  }

  // Completed: 数据初始化（后台）
  console.log('==========================Completed 阶段开始');
  console.time('==========================Completed 阶段完成');
  jobScheduler.prepare(PageLifecycle.Completed);
  await jobScheduler.wait(PageLifecycle.Completed);
  console.timeEnd('==========================Completed 阶段完成');

  // 打印性能数据
  console.log('性能统计:', jobScheduler.getCost());
}

/**
 * 渐进式初始化函数
 * @param onProgress 回调函数，用于更新进度和返回 Model
 */
async function initializeProgressiveApp(
  onProgress: (model: BaseComponentModel | null, step: string) => void
): Promise<void> {
  // 1. 初始化服务
  console.log('==========================services 开始初始化');
  console.time('==========================services 初始化完成');

  const registry = new ServiceRegistry();
  registry.register(IBridgeService, new SyncDescriptor(BridgeService, [true]));
  registry.register(IPageContextService, PageContextService);
  registry.register(IJobScheduler, SimpleJobScheduler); // 旧的 JobScheduler 供组件使用
  registry.register(IHttpService, new SyncDescriptor(HttpService, [
    { baseURL: 'https://api.example.com' }
  ]));
  registry.register(ITrackerService, new SyncDescriptor(TrackerService, [
    { debug: true }
  ]));

  const instantiationService = new InstantiationService(registry.makeCollection());
  console.timeEnd('==========================services 初始化完成');

  // 2. 创建 ComponentLoader 并注册组件
  const loader = instantiationService.createInstance(ComponentLoader);

  console.log('==========================组件加载器开始注册组件');
  console.time('==========================组件加载器注册组件完成');

  loader.registerAsync('ProductCard', {
    model: () => import('./components/product-card').then(m => m.ProductCardModel),
    view: () => import('./components/product-card').then(m => m.ProductCardView),
  }, { priority: 'high', delayRange: [200, 800] });

  loader.registerAsync('TextCard', {
    model: () => import('./components/text-card').then(m => m.TextCardModel),
    view: () => import('./components/text-card').then(m => m.TextCardView),
  }, { priority: 'normal', delayRange: [300, 1000] });

  loader.registerAsync('TabsContainer', {
    model: () => import('./components/tabs-container').then(m => m.TabsContainerModel),
    view: () => import('./components/tabs-container').then(m => m.TabsContainerView),
  }, { priority: 'critical', delayRange: [100, 500] });

  loader.registerAsync('ProductList', {
    model: () => import('./components/simple-list').then(m => m.SimpleListModel),
    view: () => import('./components/simple-list').then(m => m.SimpleListView),
  }, { priority: 'high', delayRange: [150, 600] });

  loader.registerAsync('ExperimentContainer', {
    model: () => import('./components/experiment-container').then(m => m.ExperimentContainerModel),
    view: () => import('./components/experiment-container').then(m => m.ExperimentContainerView),
  }, { priority: 'normal', dependencies: ['TextCard', 'ProductCard'], delayRange: [400, 1200] });

  loader.registerAsync('TimeBasedContainer', {
    model: () => import('./components/time-based-container').then(m => m.TimeBasedContainerModel),
    view: () => import('./components/time-based-container').then(m => m.TimeBasedContainerView),
  }, { priority: 'high', delayRange: [300, 900] });

  loader.registerAsync('GridLayoutContainer', {
    model: () => import('./components/grid-layout-container').then(m => m.GridLayoutContainerModel),
    view: () => import('./components/grid-layout-container').then(m => m.GridLayoutContainerView),
  }, { priority: 'normal', delayRange: [250, 800] });

  loader.registerAsync('ConditionalContainer', {
    model: () => import('./components/conditional-container').then(m => m.ConditionalContainerModel),
    view: () => import('./components/conditional-container').then(m => m.ConditionalContainerView),
  }, { priority: 'normal', delayRange: [300, 1000] });

  console.timeEnd('==========================组件加载器注册组件完成');

  // 3. 创建并驱动 JobScheduler
  const { jobScheduler, buildTreeJob } = makeJobScheduler(
    instantiationService,
    loader,
    schema,
    onProgress
  );

  await driveJobScheduler(jobScheduler, buildTreeJob, onProgress);
}

// 挂载
const container = document.getElementById('root-progressive');
if (container) {
  const root = createRoot(container);
  root.render(<ProgressiveDemoApp />);
}
