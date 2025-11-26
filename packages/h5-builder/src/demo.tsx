import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Injector } from './kernel/di';
import { BridgeService } from './modules/bridge.service';
import { HttpService, createHttpService } from './modules/http.service';
import { TrackerService } from './modules/tracker.service';
import { PageContextService } from './modules/context.service';
import { JobScheduler, JobPriority } from './flow/scheduler';
import { ComponentLoader, ComponentSchema } from './flow/component-loader';
import {
  ProductCardModel,
  TabsContainerModel,
  SimpleListModel,
  TextCardModel,
  ExperimentContainerModel,
  TimeBasedContainerModel,
  GridLayoutContainerModel,
  ConditionalContainerModel,
  ModelRenderer,
  registerModelView,
  ProductCardView,
  TabsContainerView,
  TextCardView,
  ExperimentContainerView,
  TimeBasedContainerView,
  GridLayoutContainerView,
  ConditionalContainerView,
} from './components';
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
    <div className="app" >
      <header className="app-header">
        <h1>Demo</h1>
        <p>新架构</p>
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
 * 初始化应用
 */
async function initializeApp(): Promise<BaseComponentModel> {
  console.log('[Demo] Initializing app...');

  // 1. 创建全局 Injector
  const globalInjector = new Injector(undefined, 'GlobalInjector');

  // 2. 创建并注册服务
  const bridge = new BridgeService(true); // Debug 模式



  // 覆盖 bridge.call 方法，实现智能 Mock
  const originalCall = bridge.call.bind(bridge);
  bridge.call = async function <T>(method: string, params: any): Promise<T> {
    // 拦截商品请求
    if (method === 'fetch' && params.url?.includes('/api/product/')) {
      const productId = parseInt(params.url.split('/').pop() || '0');

      const nameIndex = productId % productNames.length;
      const categoryIndex = Math.floor(productId / 10) % productCategories.length;
      const descIndex = productId % productDescriptions.length;

      const basePrice = 999 + (productId % 50) * 100;
      const price = basePrice + (productId % 10) * 10 - 50;

      const imageColors = ['667eea', 'f093fb', '4facfe', 'fa709a', '30cfd0', 'a8edea', 'fed6e3', 'c471f5'];
      const colorIndex = productId % imageColors.length;
      const image = `https://p16-oec-general-useast5.ttcdn-us.com/tos-useast5-i-omjb5zjo8w-tx/6d9b0fd7d0604e5eae162d25cd935eb2~tplv-fhlh96nyum-crop-webp:720:720.webp?dr=12190&from=1578644683&idc=useast5&ps=933b5bde&shcp=b4b98b7c&shp=5e1834cb&t=555f072d`;

      return {
        data: {
          id: productId,
          name: productNames[nameIndex],
          price: price,
          image: image,
          description: `${productCategories[categoryIndex]} · ${productDescriptions[descIndex]}`,
          category: productCategories[categoryIndex],
          stock: 100 + (productId % 500),
          rating: 4.0 + (productId % 10) / 10,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      } as T;
    }

    // 其他请求使用原始方法
    return originalCall(method, params);
  };

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

  globalInjector.registerInstance(BridgeService, bridge);
  globalInjector.registerInstance(HttpService, http);
  globalInjector.registerInstance(TrackerService, tracker);
  globalInjector.registerInstance(PageContextService, context);
  globalInjector.registerInstance(JobScheduler, scheduler);

  // 3. 创建 ComponentLoader
  const loader = new ComponentLoader(globalInjector, tracker);

  // 4. 注册组件（使用分离加载）
  // 注意：这里为了 demo，我们使用同步 import 模拟异步加载
  // 实际项目中应该使用 dynamic import
  loader.registerAsync('ProductCard', {
    model: async () => ProductCardModel,
    view: async () => ProductCardView,
  });

  loader.registerAsync('TextCard', {
    model: async () => TextCardModel,
    view: async () => TextCardView,
  });

  loader.registerAsync('TabsContainer', {
    model: async () => TabsContainerModel,
    view: async () => TabsContainerView,
  });

  loader.registerAsync('ProductList', {
    model: () => import('./components/simple-list').then(m => m.SimpleListModel),
    view: () => import('./components/simple-list').then(m => m.SimpleListView),
  });

  loader.registerAsync('ExperimentContainer', {
    model: async () => ExperimentContainerModel,
    view: async () => ExperimentContainerView,
  });

  loader.registerAsync('TimeBasedContainer', {
    model: async () => TimeBasedContainerModel,
    view: async () => TimeBasedContainerView,
  });

  loader.registerAsync('GridLayoutContainer', {
    model: async () => GridLayoutContainerModel,
    view: async () => GridLayoutContainerView,
  });

  loader.registerAsync('ConditionalContainer', {
    model: async () => ConditionalContainerModel,
    view: async () => ConditionalContainerView,
  });

  // 5. 使用 JobScheduler 编排启动任务
  scheduler.register('init-context', JobPriority.Start, () => {
    context.setEnvInfo(context.detectEnv());
    context.setRouteInfo(context.parseRouteFromURL());
  });

  // 6. 使用分离加载构建 Model Tree
  let rootModel: BaseComponentModel;

  scheduler.register('build-model-tree', JobPriority.Prepare, async () => {
    console.log('[Demo] Starting split loading...');
    const startTime = performance.now();

    // 使用分离加载
    rootModel = await loader.buildTreeWithSplitLoading(schema);

    const endTime = performance.now();
    console.log(`[Demo] Split loading completed in ${(endTime - startTime).toFixed(0)}ms`);
  });

  // 初始化数据
  scheduler.register('init-root-model', JobPriority.Prepare, async () => {
    console.log('[Demo] Initializing root model...');
    await rootModel.init();
    console.log('[Demo] Root model initialized');
  });

  scheduler.register('activate-root-model', JobPriority.Render, () => {
    rootModel.activate();
  });

  await scheduler.run();

  console.log('[Demo] App initialized successfully');
  console.log('[Demo] Check console for split loading performance');

  return rootModel!
}

// 启动应用
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DemoApp />);
}
