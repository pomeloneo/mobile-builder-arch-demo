import { useEffect, useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { IInstantiationService, InstantiationService, ServiceRegistry, SyncDescriptor } from './bedrock/di/index.common';
import { IHttpService, ITrackerService, IBridgeService, IPageContextService, IComponentService, ISchemaService } from './services/service-identifiers';
import { BridgeService } from './services/bridge.service';
import { HttpService } from './services/http.service';
import { TrackerService } from './services/tracker.service';
import { PageContextService } from './services/context.service';
import { ComponentService } from './services/component.service';
import { JobScheduler } from './bedrock/launch';
import { ModelRenderer } from './components';
import { BaseComponentModel } from './bedrock/model';
import { PageLifecycle, LoadComponentsJob, BuildTreeJob, InitDataJob, RenderJob, EnsureViewReadyJob } from './jobs';
import { SchemaService } from './services/schema.service';
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
  if (lifecycle === PageLifecycle.RenderReady || lifecycle === PageLifecycle.Open || lifecycle === PageLifecycle.Prepare || lifecycle === PageLifecycle.LoadComponentLogic) {
    return <div>渲染前准备阶段：{lifecycle}</div>;
  }
  return (
    <div className="app">
      <header className="app-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <h1>Demo - 渐进式渲染</h1>
        <p>Model Tree 构建即渲染 · 数据后台加载</p>
        <div className="status-badge">
          当前所处阶段: {lifecycle}
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
  // TODO: 这个任务是不是没有，或者位置不对？
  jobScheduler.registerJob(PageLifecycle.RenderReady, RenderJob);
  jobScheduler.registerJob(PageLifecycle.Render, InitDataJob);
  return jobScheduler
}

/**
 * 驱动 JobScheduler 执行各个生命周期阶段
 */
async function driveJobScheduler(
  jobScheduler: JobScheduler<PageLifecycle>,
  setLifecycle: (cycle: PageLifecycle) => void,
  setModelTree: (model: BaseComponentModel | null) => void,
  instantiationService: IInstantiationService
) {

  const debouncedFunc = debounce((c: PageLifecycle) => {
    setLifecycle(c);
  }, 10);

  // const debouncedFunc = (c: PageLifecycle) => {
  //   setLifecycle(c);
  // }


  // Open: 初始化
  console.log('==========================Open 阶段开始');
  console.time('==========================Open 阶段完成');
  jobScheduler.prepare(PageLifecycle.Open);
  await jobScheduler.wait(PageLifecycle.Open);
  debouncedFunc(PageLifecycle.Open);
  console.timeEnd('==========================Open 阶段完成');

  // LoadResouse: 加载组件资源
  console.log('==========================LoadResouse 阶段开始');
  console.time('==========================LoadResouse 阶段完成');
  jobScheduler.prepare(PageLifecycle.LoadComponentLogic);
  await jobScheduler.wait(PageLifecycle.LoadComponentLogic);
  debouncedFunc(PageLifecycle.LoadComponentLogic);
  console.timeEnd('==========================LoadResouse 阶段完成');

  // Prepare: 构建模型树
  console.log('==========================Prepare 阶段开始');
  console.time('==========================Prepare 阶段完成');
  jobScheduler.prepare(PageLifecycle.Prepare);
  await jobScheduler.wait(PageLifecycle.Prepare);
  debouncedFunc(PageLifecycle.Prepare);
  console.timeEnd('==========================Prepare 阶段完成');

  // Render: 渲染
  jobScheduler.prepare(PageLifecycle.RenderReady);
  await jobScheduler.wait(PageLifecycle.RenderReady);
  debouncedFunc(PageLifecycle.RenderReady);
  setModelTree(instantiationService.invokeFunction((accessor) => accessor.get(IComponentService).getModelTree()));

  // Completed: 数据初始化（后台）
  console.log('==========================Render 阶段开始');
  console.time('==========================Render 阶段完成');
  jobScheduler.prepare(PageLifecycle.Render);
  await jobScheduler.wait(PageLifecycle.Render);
  debouncedFunc(PageLifecycle.Render);
  console.timeEnd('==========================Render 阶段完成');


  // Completed: 数据初始化（后台）
  console.log('==========================Completed 阶段开始');
  console.time('==========================Completed 阶段完成');
  jobScheduler.prepare(PageLifecycle.Completed);
  await jobScheduler.wait(PageLifecycle.Completed);
  debouncedFunc(PageLifecycle.Completed);
  console.timeEnd('==========================Completed 阶段完成');

  // 打印性能数据
  console.log('性能统计:', jobScheduler.getCost());
  jobScheduler.prepare(PageLifecycle.Idle);
  await jobScheduler.wait(PageLifecycle.Idle);
  debouncedFunc(PageLifecycle.Idle);

}


function makeContainerService() {
  // 1. 初始化服务
  console.log('==========================services 开始初始化');
  console.time('==========================services 初始化完成');

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

  const instantiationService = new InstantiationService(registry.makeCollection());
  console.timeEnd('==========================services 初始化完成');
  return instantiationService
}



function useLaunch() {
  const [lifecycle, setLifecycle] = useState(PageLifecycle.Open);
  const [panic, setPanic] = useState(false);
  const instantiationService = useRef(makeContainerService());
  const jobScheduler = useRef<JobScheduler<PageLifecycle> | null>(null);
  const [modelTree, setModelTree] = useState<BaseComponentModel | null>(null);

  useEffect(() => {
    jobScheduler.current = makeJobScheduler(instantiationService.current);
  }, []);

  const bootstrap = useCallback(() => {
    'background-only';
    driveJobScheduler(jobScheduler.current!, setLifecycle, setModelTree, instantiationService.current).catch((err) => {
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
    jobScheduler.current = makeJobScheduler(instantiationService.current);
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
