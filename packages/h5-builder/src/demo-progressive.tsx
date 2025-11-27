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
