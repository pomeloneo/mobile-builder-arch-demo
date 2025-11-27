import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { InstantiationService, ServiceRegistry, SyncDescriptor } from './bedrock/di/index.common';
import { IHttpService, ITrackerService, IBridgeService, IPageContextService } from './services/service-identifiers';
import { BridgeService } from './services/bridge.service';
import { HttpService } from './services/http.service';
import { TrackerService } from './services/tracker.service';
import { PageContextService } from './services/context.service';
import { JobScheduler as LifecycleJobScheduler, AbstractJob } from './bedrock/launch';
import { Barrier } from './bedrock/async/barrier';
import { ComponentLoader, ComponentSchema } from './flow/component-loader';
import { ModelRenderer } from './components';
import { BaseComponentModel } from './bedrock/model';
import './demo.css';

import { schema } from './mock/demo-data';
import { PageLifecycle, LoadComponentsJob, BuildTreeJob, InitDataJob, RegisterComponentsJob, RenderJob } from './jobs';

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

  jobScheduler.addJob(new RegisterComponentsJob(loader));
  jobScheduler.addJob(new LoadComponentsJob(loader, schema, (msg) => onProgress(null, msg)));
  jobScheduler.addJob(buildTreeJob);
  jobScheduler.addJob(new RenderJob(buildTreeJob, (model, msg) => onProgress(model, msg)));
  jobScheduler.addJob(new InitDataJob(() => buildTreeJob, (msg) => onProgress(null, msg)));

  return { jobScheduler, buildTreeJob };
}

/**
 * 驱动 JobScheduler 执行各个生命周期阶段
 */
async function driveJobScheduler(
  jobScheduler: LifecycleJobScheduler<PageLifecycle>,
  onProgress: (model: BaseComponentModel | null, msg: string) => void
) {
  // Open: 加载组件资源
  jobScheduler.prepare(PageLifecycle.Open);
  await jobScheduler.wait(PageLifecycle.Open);

  // Prepare: 构建模型树
  jobScheduler.prepare(PageLifecycle.Prepare);
  await jobScheduler.wait(PageLifecycle.Prepare);

  // Render: 渲染
  jobScheduler.prepare(PageLifecycle.Render);
  await jobScheduler.wait(PageLifecycle.Render);

  // Completed: 数据初始化（阻塞式）
  jobScheduler.prepare(PageLifecycle.Completed);
  await jobScheduler.wait(PageLifecycle.Completed);



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



  // 4. 创建并驱动 JobScheduler
  const { jobScheduler, buildTreeJob } = makeJobScheduler(
    instantiationService,
    loader,
    schema,
    (model, msg) => console.log('[Demo-Async]', msg)
  );

  await driveJobScheduler(jobScheduler, (model, msg) => console.log('[Demo-Async]', msg));

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
