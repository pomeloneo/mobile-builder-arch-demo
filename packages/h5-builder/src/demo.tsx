import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Injector } from './kernel/di';
import { BridgeService } from './modules/bridge.service';
import { HttpService, createHttpService } from './modules/http.service';
import { TrackerService } from './modules/tracker.service';
import { PageContextService } from './modules/context.service';
import { JobScheduler, JobPriority } from './flow/scheduler';
import { ComponentLoader, ComponentSchema } from './flow/component-loader';
import { ProductCardModel } from './components/product-card.model';
import { TabsContainerModel } from './components/tabs-container.model';
import { SimpleListModel } from './components/simple-list.model';
import { ModelRenderer } from './components/model-renderer';
import { BaseComponentModel } from './kernel/model';
import './demo.css';

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

  console.log('[DemoApp] Rendering with rootModel:', rootModel.constructor.name, rootModel.id);

  return (
    <div className="app">
      <header className="app-header">
        <h1>H5 Builder Demo</h1>
        <p>展示 Model-View 分离架构</p>
      </header>

      <main className="app-main">
        <ModelRenderer model={rootModel} />
      </main>

      <footer className="app-footer">
        <p>Powered by H5 Builder Framework</p>
      </footer>
    </div>
  );
}

/**
 * 初始化应用
 */
async function initializeApp(): Promise<BaseComponentModel> {
  console.log('[Demo] Initializing app...');

  // 1. 创建全局 Injector
  const globalInjector = new Injector(undefined, 'GlobalInjector');

  // 2. 创建并注册服务
  const bridge = new BridgeService(true); // Debug 模式
  const http = createHttpService(bridge, {
    baseURL: 'https://api.example.com',
  });
  const tracker = new TrackerService(bridge, {
    debug: true, // Debug 模式会显示 Toast
    maxBatchSize: 10,
    flushInterval: 3000,
  });
  const context = new PageContextService();
  const scheduler = new JobScheduler();

  // Mock 一些数据
  bridge.setMockResponse('fetch', {
    data: {
      id: 1,
      name: '测试商品',
      price: 99.99,
      image: 'https://via.placeholder.com/200',
      description: '这是一个测试商品',
    },
    status: 200,
    statusText: 'OK',
    headers: {},
  });

  globalInjector.registerInstance(BridgeService, bridge);
  globalInjector.registerInstance(HttpService, http);
  globalInjector.registerInstance(TrackerService, tracker);
  globalInjector.registerInstance(PageContextService, context);
  globalInjector.registerInstance(JobScheduler, scheduler);

  // 3. 创建 ComponentLoader
  const loader = new ComponentLoader(globalInjector, tracker);

  // 4. 注册组件
  loader.registerAll({
    ProductCard: ProductCardModel,
    TabsContainer: TabsContainerModel,
    ProductList: SimpleListModel, // 简单容器，用于包含商品列表
  });

  // 5. 定义 Schema - 展示自动虚拟滚动
  const schema: ComponentSchema = {
    type: 'TabsContainer',
    id: 'main-tabs',
    props: {
      defaultIndex: 0,
      // 自定义虚拟滚动配置
      virtualScroll: {
        threshold: 15,        // 超过 15 个就启用虚拟滚动
        itemHeight: 120,      // 每项高度
        containerHeight: 600, // 容器高度
      },
    },
    children: [
      // Tab 1: 少量商品（不会启用虚拟滚动）
      {
        type: 'ProductList',
        id: 'tab-1-list',
        props: {},
        children: Array.from({ length: 10 }, (_, i) => ({
          type: 'ProductCard',
          id: `tab1-product-${i}`,
          props: {
            productId: i + 1,
            showPrice: true,
          },
        })),
      },
      // Tab 2: 大量商品（会自动启用虚拟滚动）
      {
        type: 'ProductList',
        id: 'tab-2-list',
        props: {},
        children: Array.from({ length: 50 }, (_, i) => ({
          type: 'ProductCard',
          id: `tab2-product-${i}`,
          props: {
            productId: i + 100,
            showPrice: true,
          },
        })),
      },
      // Tab 3: 超大量商品（会自动启用虚拟滚动）
      {
        type: 'ProductList',
        id: 'tab-3-list',
        props: {},
        children: Array.from({ length: 100 }, (_, i) => ({
          type: 'ProductCard',
          id: `tab3-product-${i}`,
          props: {
            productId: i + 1000,
            showPrice: i % 2 === 0, // 一半显示价格
          },
        })),
      },
    ],
  };

  // 6. 构建 Model Tree
  const rootModel = loader.buildTree(schema);

  // 7. 使用 JobScheduler 编排启动任务
  scheduler.register('init-context', JobPriority.Start, () => {
    context.setEnvInfo(context.detectEnv());
    context.setRouteInfo(context.parseRouteFromURL());
  });

  scheduler.register('init-root-model', JobPriority.Prepare, () => {
    rootModel.init();
  });

  scheduler.register('activate-root-model', JobPriority.Render, () => {
    rootModel.activate();
  });

  await scheduler.run();

  console.log('[Demo] App initialized successfully');
  console.log('[Demo] Check console for virtual scroll status');

  return rootModel;
}

// 启动应用
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DemoApp />);
}
