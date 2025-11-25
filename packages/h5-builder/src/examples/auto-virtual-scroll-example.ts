// 示例：自动虚拟滚动的使用

import { ComponentSchema } from '../flow/component-loader';

// ============================================
// 示例 1: 自动检测（推荐）
// ============================================

// 当 Tab 的子组件超过 20 个时，自动启用虚拟滚动
const autoSchema: ComponentSchema = {
  type: 'TabsContainer',
  id: 'auto-tabs',
  props: {
    // 不需要配置任何虚拟滚动相关的参数
  },
  children: [
    {
      type: 'ProductListTab',
      id: 'tab-1',
      props: {},
      children: Array.from({ length: 100 }, (_, i) => ({
        type: 'ProductCard',
        id: `card-${i}`,
        props: { productId: i },
      })),
      // ✅ 100 个子组件，自动启用虚拟滚动
    },
    {
      type: 'ProductListTab',
      id: 'tab-2',
      props: {},
      children: Array.from({ length: 10 }, (_, i) => ({
        type: 'ProductCard',
        id: `card-${i}`,
        props: { productId: i },
      })),
      // ✅ 10 个子组件，不启用虚拟滚动（低于阈值）
    },
  ],
};

// ============================================
// 示例 2: 自定义配置
// ============================================

const customSchema: ComponentSchema = {
  type: 'TabsContainer',
  id: 'custom-tabs',
  props: {
    virtualScroll: {
      threshold: 10,        // 超过 10 个就启用虚拟滚动
      itemHeight: 150,      // 每项高度 150px
      containerHeight: 800, // 容器高度 800px
      overscan: 5,          // 预渲染 5 项
    },
  },
  children: [
    {
      type: 'ProductListTab',
      id: 'tab-1',
      props: {},
      children: Array.from({ length: 50 }, (_, i) => ({
        type: 'ProductCard',
        id: `card-${i}`,
        props: { productId: i },
      })),
    },
  ],
};

// ============================================
// 示例 3: 强制启用/禁用
// ============================================

const forceEnabledSchema: ComponentSchema = {
  type: 'TabsContainer',
  id: 'force-enabled-tabs',
  props: {
    virtualScroll: {
      enabled: true, // 强制启用，即使子组件很少
    },
  },
  children: [
    {
      type: 'ProductListTab',
      id: 'tab-1',
      props: {},
      children: Array.from({ length: 5 }, (_, i) => ({
        type: 'ProductCard',
        id: `card-${i}`,
        props: { productId: i },
      })),
      // ✅ 只有 5 个子组件，但强制启用虚拟滚动
    },
  ],
};

const forceDisabledSchema: ComponentSchema = {
  type: 'TabsContainer',
  id: 'force-disabled-tabs',
  props: {
    virtualScroll: {
      enabled: false, // 强制禁用，即使子组件很多
    },
  },
  children: [
    {
      type: 'ProductListTab',
      id: 'tab-1',
      props: {},
      children: Array.from({ length: 100 }, (_, i) => ({
        type: 'ProductCard',
        id: `card-${i}`,
        props: { productId: i },
      })),
      // ❌ 100 个子组件，但强制禁用虚拟滚动
    },
  ],
};

// ============================================
// 使用方式
// ============================================

/*
// 1. 注册组件
loader.registerAll({
  TabsContainer: TabsContainerModel,
  ProductListTab: BaseContainerModel, // 简单容器
  ProductCard: ProductCardModel,
});

// 2. 注册 Model-View 映射
registerModelViews([
  [TabsContainerModel, TabsContainerView],
  [ProductCardModel, ProductCardView],
]);

// 3. 构建 Model Tree
const rootModel = loader.buildTree(autoSchema);

// 4. 初始化
await rootModel.init();

// 5. 渲染
<ModelRenderer model={rootModel} />

// ✅ 虚拟滚动自动生效，无需修改 Schema！
*/

// ============================================
// 控制台输出示例
// ============================================

/*
当启用虚拟滚动时，控制台会输出：

[TabsContainer:auto-tabs] Virtual scroll enabled for tab 0 (100 items)
[TabsContainer:auto-tabs] Prewarming tab 1

当切换 Tab 时：

[TabsContainer:auto-tabs] Lazy loading tab 1
TAB_SWITCH: {
  tabsId: 'auto-tabs',
  from: 0,
  to: 1,
  virtualScrollEnabled: false  // Tab 1 没有启用虚拟滚动
}
*/

export {
  autoSchema,
  customSchema,
  forceEnabledSchema,
  forceDisabledSchema,
};
