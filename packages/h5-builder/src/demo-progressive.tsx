import { useEffect, useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { IInstantiationService, InstantiationService, ServiceRegistry, SyncDescriptor } from './bedrock/di/index.common';
import { IHttpService, ITrackerService, IBridgeService, IPageContextService, IComponentService, ISchemaService, IPrefetchService } from './services/service-identifiers';
import { BridgeService } from './services/bridge.service';
import { HttpService } from './services/http.service';
import { TrackerService } from './services/tracker.service';
import { PageContextService } from './services/context.service';
import { ComponentService } from './services/component.service';
import { JobScheduler } from './bedrock/launch';
import { ModelRenderer } from './components';
import { BaseComponentModel } from './bedrock/model/model';
import { PageLifecycle, LoadComponentsJob, BuildTreeJob, InitFirstScreenDataJob, ActivateTreeJob, EnsureViewReadyJob, TriggerRenderJob } from './jobs';
import { SchemaService } from './services/schema.service';
import { PrefetchService } from './services/prefetch.service';
import { GetSchemaJob } from './jobs/get-schema-job';
import { debounce } from './bedrock/function/debounce';
import './demo.css';



/**
 * 渐进式渲染 Demo 应用
 */
function ProgressiveDemoApp() {
  const { modelTree, lifecycle, panic, refresh } = useLaunch()

  if (panic) {
    return (
      <>
        <div>{"启动流程出错了 - panic"}</div>
        <button onClick={refresh}>点击刷新</button>
      </>
    );
  }

  return (
    <div className="app">
      <header className="app-header" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d3436 100%)' }}>
        <h3>搭建 C 端落地页新架构 Demo</h3>
        <h2>新架构主要特点：</h2>
        <ul className="features-list">
          <li>基于 DI</li>
          <li>流式启动 & Job 调度</li>
          <li>逻辑驱动</li>
          <li>组件逻辑 UI 和 逻辑模型分离模式</li>
          <li>优先构建逻辑树</li>
          <li>渐进式渲染</li>
        </ul>
        <div className="status-badge">
          <h3>当前应用生命周期: <span className="rainbow-text">{lifecycle}</span></h3>
        </div>
      </header>
      <main className="app-main">
        <div style={{ height: '720px', overflow: 'auto' }}>
          {/* 关键点：这里渲染时，子组件的数据可能还在加载中 */}
          {modelTree && <ModelRenderer model={modelTree} />}
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
  setModelTree: (model: BaseComponentModel | null) => void
) {
  const jobScheduler = instantiationService.createInstance(
    JobScheduler<PageLifecycle>,
    PageLifecycle.Open
  );

  // 注册 Jobs
  jobScheduler.registerJob(PageLifecycle.Open, GetSchemaJob);
  jobScheduler.registerJob(PageLifecycle.LoadComponentLogic, LoadComponentsJob);
  jobScheduler.registerJob(PageLifecycle.Prepare, BuildTreeJob);
  jobScheduler.registerJob(PageLifecycle.RenderReady, EnsureViewReadyJob);
  // 🔥 Render 阶段：触发渲染 + 激活组件树
  jobScheduler.registerJob(PageLifecycle.Render, TriggerRenderJob, setModelTree);
  jobScheduler.registerJob(PageLifecycle.Render, ActivateTreeJob);
  // Completed 阶段：数据初始化
  jobScheduler.registerJob(PageLifecycle.Completed, InitFirstScreenDataJob);

  return jobScheduler;
}

/**
 * 驱动 JobScheduler 执行各个生命周期阶段
 */
async function driveJobScheduler(
  jobScheduler: JobScheduler<PageLifecycle>,
  setLifecycle: (cycle: PageLifecycle) => void,
) {

  // const debouncedFunc = debounce((c: PageLifecycle) => {
  //   setLifecycle(c);
  // }, 10);

  const debouncedFunc = (c: PageLifecycle) => setLifecycle(c);



  // Open: 初始化 加载组件资源 & 预请求首屏数据
  console.log('%c==========================Open 阶段开始==========', 'color: #3498db; font-weight: bold;');
  console.time('==========================Open 阶段耗时');
  jobScheduler.prepare(PageLifecycle.Open);
  debouncedFunc(PageLifecycle.Open);
  await jobScheduler.wait(PageLifecycle.Open);

  console.log('%c==========================Open 阶段完成==========', 'color: #3498db; font-weight: bold;');
  console.timeEnd('==========================Open 阶段耗时');

  // LoadResouse: 保证组件资源 model 加载完成
  console.log('%c==========================LoadResouse 阶段开始==========', 'color: #27ae60; font-weight: bold;');
  console.time('==========================LoadResouse 阶段耗时');
  jobScheduler.prepare(PageLifecycle.LoadComponentLogic);
  debouncedFunc(PageLifecycle.LoadComponentLogic);
  await jobScheduler.wait(PageLifecycle.LoadComponentLogic);

  console.log('%c==========================LoadResouse 阶段完成==========', 'color: #27ae60; font-weight: bold;');
  console.timeEnd('==========================LoadResouse 阶段耗时');

  // Prepare: 构建模型树
  console.log('%c==========================Prepare 阶段开始===========', 'color: #9b59b6; font-weight: bold;');
  console.time('==========================Prepare 阶段耗时');
  jobScheduler.prepare(PageLifecycle.Prepare);
  debouncedFunc(PageLifecycle.Prepare);
  await jobScheduler.wait(PageLifecycle.Prepare);


  console.log('%c==========================Prepare 阶段完成==========', 'color: #9b59b6; font-weight: bold;');
  console.timeEnd('==========================Prepare 阶段耗时');

  // RenderReady: 准备完成
  console.log('%c==========================RenderReady 阶段开始===========', 'color: #e67e22; font-weight: bold;');
  console.time('==========================RenderReady 阶段耗时');
  jobScheduler.prepare(PageLifecycle.RenderReady);
  debouncedFunc(PageLifecycle.RenderReady);
  await jobScheduler.wait(PageLifecycle.RenderReady);

  console.log('%c==========================RenderReady 阶段完成==========', 'color: #e67e22; font-weight: bold;');
  console.timeEnd('==========================RenderReady 阶段耗时');


  // 🔥 Render: 触发渲染 + 激活组件树
  console.log('%c==========================Render 阶段开始=======', 'color: #e74c3c; font-weight: bold;');
  console.time('==========================Render 阶段完成耗时');
  jobScheduler.prepare(PageLifecycle.Render);
  debouncedFunc(PageLifecycle.Render);
  await jobScheduler.wait(PageLifecycle.Render);  // TriggerRenderJob（触发渲染）和 ActivateTreeJob（激活）在这里执行


  console.log('%c==========================Render 阶段完成==========', 'color: #e74c3c; font-weight: bold;');
  console.timeEnd('==========================Render 阶段完成耗时');


  // Completed: 非首屏数据加载启动（后台）
  console.log('%c==========================Completed 阶段开始==========', 'color: #1abc9c; font-weight: bold;');
  console.time('==========================Completed 阶段完成耗时');
  jobScheduler.prepare(PageLifecycle.Completed);
  debouncedFunc(PageLifecycle.Completed);
  await jobScheduler.wait(PageLifecycle.Completed);


  console.log('%c==========================Completed 阶段完成======', 'color: #1abc9c; font-weight: bold;');
  console.timeEnd('==========================Completed 阶段完成耗时');

  // 打印性能数据
  console.log('%c性能统计:', 'color: #f39c12; font-weight: bold;', jobScheduler.getCost());

  console.log('%c==========================Idle 阶段开始==========', 'color: #7cebf3ff; font-weight: bold;');
  console.time('==========================Idle 阶段耗时');
  jobScheduler.prepare(PageLifecycle.Idle);
  debouncedFunc(PageLifecycle.Idle);
  await jobScheduler.wait(PageLifecycle.Idle);

  console.log('%c==========================Idle 阶段完成==========', 'color: #7cebf3ff; font-weight: bold;');
  console.timeEnd('==========================Idle 阶段耗时');

  console.log('==========================应用初始化完成==========');
  console.timeEnd('==========================应用完全可以 TTI 的完成时间==========');

}


function makeContainerService() {
  console.log('==========================应用初始化开始==========');
  console.time('==========================应用初始化耗时==========');
  console.time('==========================首屏 TTI 完成时间==========');
  console.time('==========================应用完全可以 TTI 的完成时间==========');
  console.log('==========================DI 容器 & 基础 services 初始化开始===========');
  console.time('==========================DI 容器 & 基础services 初始化耗时');

  const registry = new ServiceRegistry();
  registry.register(IBridgeService, new SyncDescriptor(BridgeService, [true]));
  registry.register(IPageContextService, PageContextService);
  registry.register(ISchemaService, SchemaService);
  registry.register(IHttpService, new SyncDescriptor(HttpService, [
    { baseURL: 'https://api.example.com' }
  ]));
  registry.register(ITrackerService, new SyncDescriptor(TrackerService, [
    { debug: true }
  ]));
  registry.register(IComponentService, ComponentService);
  registry.register(IPrefetchService, PrefetchService);

  const instantiationService = new InstantiationService(registry.makeCollection());

  console.log('==========================DI 容器 & 基础 services 初始化完成===========');
  console.timeEnd('==========================DI 容器 & 基础services 初始化耗时');
  return instantiationService
}



function useLaunch() {
  const [lifecycle, setLifecycle] = useState(PageLifecycle.Open);
  const [panic, setPanic] = useState(false);
  const [_instantiationService] = useState(makeContainerService)
  const instantiationService = useRef(_instantiationService);
  const jobScheduler = useRef<JobScheduler<PageLifecycle> | null>(null);
  const [modelTree, setModelTree] = useState<BaseComponentModel | null>(null);

  useEffect(() => {
    jobScheduler.current = makeJobScheduler(instantiationService.current, setModelTree);
  }, []);

  const bootstrap = useCallback(() => {
    'background-only';
    console.log('====================开始驱动生命周期调度=====')
    driveJobScheduler(jobScheduler.current!, setLifecycle).catch((err) => {
      console.error('Page init failure:', err);
      setPanic(true);
    });
  }, [setPanic]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const refresh = useCallback(() => {
    'background-only';
    // 重新构造jobScheduler
    jobScheduler.current = makeJobScheduler(instantiationService.current, setModelTree);
    bootstrap();
    setPanic(false);
  }, [setPanic]);

  return {
    lifecycle,
    panic,
    instantiationService,
    refresh,
    modelTree
  };
}


// 挂载
const container = document.getElementById('root-progressive');
if (container) {
  const root = createRoot(container);
  root.render(<ProgressiveDemoApp />);
}
