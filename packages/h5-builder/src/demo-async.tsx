import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { InstantiationService, ServiceRegistry, SyncDescriptor } from './bedrock/di/index.common';
import { IHttpService, ITrackerService, IBridgeService, IPageContextService } from './services/service-identifiers';
import { BridgeService } from './modules/bridge.service';
import { HttpService } from './modules/http.service';
import { TrackerService } from './modules/tracker.service';
import { PageContextService } from './modules/context.service';
import { JobScheduler as LifecycleJobScheduler, AbstractJob } from './bedrock/launch';
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

/**
 * Demo 应用
 * 展示如何使用 H5 Builder 框架
 */
function DemoApp() {
  const [rootModel, setRootModel] = useState<BaseComponentModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 初始化应用
    initializeApp()
      .then((model) => {
        setRootModel(model);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[Demo] Initialization failed:', err);
        setError(err);
        setLoading(false);
      });

    // 清理
    return () => {
      if (rootModel) {
        rootModel.dispose();
      }
    };
  }, []);

  if (loading) {
    return <div className="app-loading">正在初始化...</div>;
  }

  if (error) {
    return (
      <div className="app-error">
        <h2>初始化失败</h2>
        <p>{error.message}</p>
        <pre>{error.stack}</pre>
      </div>
    );
  }

  if (!rootModel) {
    return <div className="app-error">初始化失败</div>;
  }

  console.log('[DemoApp] Rendering with rootModel:', rootModel, rootModel.constructor.name, rootModel.id);


  return (
    <div className="app" >
      <header className="app-header">
        <h1>Demo - 异步加载</h1>
        <p>新架构 · 异步组件加载演示</p>
      </header>

      <main className="app-main">
        <div style={{ height: '720px', overflow: 'auto' }}>
          <ModelRenderer model={rootModel} />
        </div>

      </main>
    </div>
  );
}


// 🎨 改进 Mock 数据生成 - 支持多种类型的请求
const productNames = [
  'iPhone 15 Pro Max', 'MacBook Pro 16"', 'AirPods Pro', 'iPad Air', 'Apple Watch Ultra',
  'Sony WH-1000XM5', 'Nintendo Switch', 'PlayStation 5', 'Xbox Series X', 'Steam Deck',
  'Canon EOS R5', 'DJI Mini 3 Pro', 'GoPro Hero 11', 'Kindle Oasis', 'Bose QuietComfort',
  '戴森吹风机', '小米扫地机器人', '华为 Mate 60 Pro', 'OPPO Find X6', 'vivo X90 Pro',
  '联想拯救者 Y9000P', '华硕 ROG 幻 16', '雷蛇灵刃 14', '微星绝影 GS66', '外星人 M15',
  '罗技 MX Master 3S', 'Keychron K8', 'HHKB Professional', '索尼 A7M4', '富士 X-T5',
];

const productCategories = [
  '手机数码', '电脑办公', '智能穿戴', '影音娱乐', '摄影摄像',
  '游戏设备', '智能家居', '运动户外', '键鼠外设', '专业设备',
];

const productDescriptions = [
  '全新升级，性能强劲，体验卓越',
  '精工细作，品质保证，值得信赖',
  '创新科技，引领潮流，彰显品味',
  '轻薄便携，续航持久，随行无忧',
  '专业级性能，满足你的所有需求',
  '时尚设计，精致工艺，尽显优雅',
  '智能体验，便捷生活，触手可及',
  '高清画质，震撼音效，沉浸体验',
  '人体工学设计，舒适握持，久用不累',
  '旗舰配置，极致性能，畅快体验',
];

import { schema, textContents } from './mock/demo-data';

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
    const { modelTreeReady, viewsReady } = this.loader.preloadComponents(this.schema);

    Promise.all([modelTreeReady, viewsReady])
      .then(() => {
        this.onProgress('组件资源加载完成');
        barrier.open();
      })
      .catch(err => {
        console.error('组件资源加载失败:', err);
        barrier.open();
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
    this.rootModel = this.loader.buildModelTree(this.schema);
    this.onProgress(this.rootModel, '模型树构建完成');
  }

  getRootModel() {
    return this.rootModel;
  }
}

/**
 * Job 3: 初始化数据（阻塞式）
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
    rootModel.init()
      .then(() => {
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
 * 创建并配置 JobScheduler
 */
function makeJobScheduler(
  instantiationService: InstantiationService,
  loader: ComponentLoader,
  schema: ComponentSchema,
  onProgress: (model: BaseComponentModel | null, msg: string) => void
) {
  const jobScheduler = instantiationService.createInstance(
    LifecycleJobScheduler<PageLifecycle>,
    PageLifecycle.Open
  );

  const buildTreeJob = new BuildTreeJob(loader, schema, onProgress);

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
  onProgress: (model: BaseComponentModel | null, msg: string) => void
) {
  // Open: 加载组件资源
  jobScheduler.prepare(PageLifecycle.Open);
  await jobScheduler.wait(PageLifecycle.Open);

  // Prepare: 构建模型树
  jobScheduler.prepare(PageLifecycle.Prepare);
  await jobScheduler.wait(PageLifecycle.Prepare);

  // Completed: 数据初始化（阻塞式）
  jobScheduler.prepare(PageLifecycle.Completed);
  await jobScheduler.wait(PageLifecycle.Completed);

  // 返回 rootModel 并激活
  const rootModel = buildTreeJob.getRootModel();
  if (rootModel) {
    onProgress(rootModel, '应用初始化完成');
    rootModel.activate();
  }

  console.log('性能统计:', jobScheduler.getCost());
}

/**
 * 初始化应用
 */
async function initializeApp(): Promise<BaseComponentModel> {
  // 1. 初始化服务
  const registry = new ServiceRegistry();
  registry.register(IBridgeService, new SyncDescriptor(BridgeService, [true]));
  registry.register(IPageContextService, PageContextService);
  registry.register(IHttpService, new SyncDescriptor(HttpService, [
    { baseURL: 'https://api.example.com' }
  ]));
  registry.register(ITrackerService, new SyncDescriptor(TrackerService, [
    { debug: true, maxBatchSize: 10, flushInterval: 3000 }
  ]));

  const instantiationService = new InstantiationService(registry.makeCollection());

  // 2. 初始化上下文
  const context = instantiationService.invokeFunction(accessor => accessor.get(IPageContextService));
  context.setEnvInfo(context.detectEnv());
  context.setRouteInfo(context.parseRouteFromURL());

  // 3. 创建 ComponentLoader 并注册组件
  const loader = instantiationService.createInstance(ComponentLoader);

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

  // 4. 创建并驱动 JobScheduler
  const { jobScheduler, buildTreeJob } = makeJobScheduler(
    instantiationService,
    loader,
    schema,
    (model, msg) => console.log('[Demo-Async]', msg)
  );

  await driveJobScheduler(jobScheduler, buildTreeJob, (model, msg) => console.log('[Demo-Async]', msg));

  const rootModel = buildTreeJob.getRootModel();
  if (!rootModel) {
    throw new Error('Failed to build root model');
  }

  return rootModel;
}

// 启动应用
const container = document.getElementById('root-async');
if (container) {
  const root = createRoot(container);
  root.render(<DemoApp />);
}
