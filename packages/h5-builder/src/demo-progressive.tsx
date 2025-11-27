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
import { schema } from './mock/demo-data';
import { PageLifecycle, LoadComponentsJob, BuildTreeJob, InitDataJob, RegisterComponentsJob } from './jobs';
import './demo.css';



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
  jobScheduler.addJob(new RegisterComponentsJob(loader));
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
