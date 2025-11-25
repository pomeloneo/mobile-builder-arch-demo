import React from 'react';
import { BaseComponentModel } from '../kernel/model';
import { ProductCardModel } from './product-card.model';
import { TabsContainerModel } from './tabs-container.model';
import { ErrorPlaceholderModel, LoadingPlaceholderModel, EmptyPlaceholderModel } from '../flow/placeholders';
import { ProductCardView } from './product-card.view';
import { TabsContainerView } from './tabs-container.view';

/**
 * Model Renderer Props
 */
export interface ModelRendererProps {
  model: BaseComponentModel;
}

/**
 * Model → View 映射表
 * 根据 Model 类型渲染对应的 View 组件
 */
const MODEL_VIEW_MAP = new Map<any, React.ComponentType<any>>([
  [ProductCardModel, ProductCardView],
  [TabsContainerModel, TabsContainerView],
  // 可以继续添加更多组件映射
]);

/**
 * Model Renderer
 * 递归渲染 Model Tree 为 React 组件树
 * 
 * 核心功能：
 * 1. 根据 Model 类型查找对应的 View 组件
 * 2. 处理占位组件（Error, Loading, Empty）
 * 3. 递归渲染子组件
 */
export const ModelRenderer: React.FC<ModelRendererProps> = ({ model }) => {
  // 处理错误占位
  if (model instanceof ErrorPlaceholderModel) {
    return (
      <div className="error-placeholder">
        <p>组件加载失败</p>
        {model.props.originalType && <p>类型: {model.props.originalType}</p>}
        <p>错误: {model.props.error}</p>
      </div>
    );
  }

  // 处理加载占位
  if (model instanceof LoadingPlaceholderModel) {
    return (
      <div className="loading-placeholder">
        <p>加载中...</p>
      </div>
    );
  }

  // 处理空状态占位
  if (model instanceof EmptyPlaceholderModel) {
    return (
      <div className="empty-placeholder">
        <p>暂无数据</p>
      </div>
    );
  }

  // 查找对应的 View 组件
  const ViewComponent = MODEL_VIEW_MAP.get(model.constructor);

  if (!ViewComponent) {
    console.error(`[ModelRenderer] No view component found for model: ${model.constructor.name}`);
    return (
      <div className="unknown-component">
        <p>未知组件类型: {model.constructor.name}</p>
      </div>
    );
  }

  // 渲染 View 组件
  return <ViewComponent model={model} />;
};

/**
 * 注册 Model-View 映射
 */
export function registerModelView(ModelClass: any, ViewComponent: React.ComponentType<any>): void {
  MODEL_VIEW_MAP.set(ModelClass, ViewComponent);
}

/**
 * 批量注册 Model-View 映射
 */
export function registerModelViews(mappings: Record<string, [any, React.ComponentType<any>]>): void {
  Object.values(mappings).forEach(([ModelClass, ViewComponent]) => {
    registerModelView(ModelClass, ViewComponent);
  });
}
