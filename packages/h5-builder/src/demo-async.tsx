import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { InstantiationService, ServiceRegistry, SyncDescriptor } from './bedrock/di/index.common';
import { IHttpService, ITrackerService, IBridgeService, IPageContextService, IComponentService, ISchemaService } from './services/service-identifiers';
import { BridgeService } from './services/bridge.service';
import { HttpService } from './services/http.service';
import { TrackerService } from './services/tracker.service';
import { PageContextService } from './services/context.service';
import { JobScheduler as LifecycleJobScheduler } from './bedrock/launch';

import { ComponentService, ComponentSchema } from './services/component.service';
import { ModelRenderer } from './components';
import { BaseComponentModel } from './bedrock/model';
import './demo.css';

import { schema } from './mock/demo-data';
import { PageLifecycle, LoadComponentsJob, BuildTreeJob, InitDataJob, RenderJob } from './jobs';
import { GetSchemaJob } from './jobs/get-schema-job';
import { SchemaService } from './services/schema.service';

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
  schema: ComponentSchema,
  onProgress: (model: BaseComponentModel | null, msg: string) => void
) {
  const jobScheduler = instantiationService.createInstance(
    LifecycleJobScheduler<PageLifecycle>,
    PageLifecycle.Open
  );

  // 注册 Jobs
  jobScheduler.registerJob(PageLifecycle.Open, GetSchemaJob);
  jobScheduler.registerJob(PageLifecycle.LoadComponentLogic, LoadComponentsJob);
  jobScheduler.registerJob(PageLifecycle.Prepare, BuildTreeJob);
  jobScheduler.registerJob(PageLifecycle.RenderReady, RenderJob);
  jobScheduler.registerJob(PageLifecycle.Render, InitDataJob);

  return jobScheduler
}

/**
 * 驱动 JobScheduler 执行各个生命周期阶段
 */
async function driveJobScheduler(
  jobScheduler: LifecycleJobScheduler<PageLifecycle>,
  onProgress: (model: BaseComponentModel | null, msg: string) => void
) {
  // Open: 初始化
  console.log('==========================Open 阶段开始');
  console.time('==========================Open 阶段完成');
  jobScheduler.prepare(PageLifecycle.Open);
  await jobScheduler.wait(PageLifecycle.Open);
  console.timeEnd('==========================Open 阶段完成');


  // LoadResouse: 加载组件资源
  console.log('==========================LoadResouse 阶段开始');
  console.time('==========================LoadResouse 阶段完成');
  jobScheduler.prepare(PageLifecycle.LoadComponentLogic);
  await jobScheduler.wait(PageLifecycle.LoadComponentLogic);
  console.timeEnd('==========================LoadResouse 阶段完成');

  // Prepare: 构建模型树
  console.log('==========================Prepare 阶段开始');
  console.time('==========================Prepare 阶段完成');
  jobScheduler.prepare(PageLifecycle.Prepare);
  await jobScheduler.wait(PageLifecycle.Prepare);
  console.timeEnd('==========================Prepare 阶段完成');

  // Render: 渲染
  jobScheduler.prepare(PageLifecycle.RenderReady);
  await jobScheduler.wait(PageLifecycle.RenderReady);

  // Completed: 数据初始化（后台）
  console.log('==========================Completed 阶段开始');
  console.time('==========================Completed 阶段完成');
  jobScheduler.prepare(PageLifecycle.Render);
  await jobScheduler.wait(PageLifecycle.Render);
  console.timeEnd('==========================Completed 阶段完成');

  // 打印性能数据
  console.log('性能统计:', jobScheduler.getCost());

  jobScheduler.prepare(PageLifecycle.Idle);
  await jobScheduler.wait(PageLifecycle.Idle);

}

/**
 * 初始化应用
 */
async function initializeApp(): Promise<BaseComponentModel | null> {
  // 1. 初始化服务
  const registry = new ServiceRegistry();
  registry.register(IBridgeService, new SyncDescriptor(BridgeService, [true]));
  registry.register(IPageContextService, PageContextService);
  registry.register(ISchemaService, SchemaService);
  registry.register(IHttpService, new SyncDescriptor(HttpService, [
    { baseURL: 'https://api.example.com' }
  ]));
  registry.register(ITrackerService, new SyncDescriptor(TrackerService, [
    { debug: true, maxBatchSize: 10, flushInterval: 3000 }
  ]));
  registry.register(IComponentService, ComponentService);

  const instantiationService = new InstantiationService(registry.makeCollection());

  // 2. 初始化上下文
  const context = instantiationService.invokeFunction(accessor => accessor.get(IPageContextService));
  context.setEnvInfo(context.detectEnv());
  context.setRouteInfo(context.parseRouteFromURL());

  // 3. 创建并驱动 JobScheduler
  const jobScheduler = makeJobScheduler(
    instantiationService,
    schema,
    (model: BaseComponentModel | null, msg: string) => console.log('[Demo-Async]', msg)
  );

  await driveJobScheduler(jobScheduler, (model, msg) => console.log('[Demo-Async]', msg));
  return instantiationService.invokeFunction((accessor) => accessor.get(IComponentService).getModelTree())
}

// 启动应用
const container = document.getElementById('root-async');
if (container) {
  const root = createRoot(container);
  root.render(<DemoApp />);
}
