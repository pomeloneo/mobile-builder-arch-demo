/**
 * 增强版商品卡片组件注册
 * 🎯 演示预加载数据 + 补充数据的场景
 */
import { ProductCardEnhancedModel } from './product-card-enhanced.model';
import { ProductCardEnhancedView } from './product-card-enhanced.view';

export const ProductCardEnhancedComponent = {
  type: 'ProductCardEnhanced',
  Model: ProductCardEnhancedModel,
  View: ProductCardEnhancedView,
};

export { ProductCardEnhancedModel, ProductCardEnhancedView };
export type { ProductCardEnhancedProps, EnhancedProductData } from './product-card-enhanced.model';
