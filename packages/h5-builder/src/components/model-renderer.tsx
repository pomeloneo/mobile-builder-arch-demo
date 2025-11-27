import React from 'react';
import { BaseComponentModel, BaseContainerModel } from '../bedrock/model';
import { ProductCardModel, ProductCardView } from './product-card';
import { TabsContainerModel, TabsContainerView } from './tabs-container';
import { ErrorPlaceholderModel, LoadingPlaceholderModel, EmptyPlaceholderModel } from '../flow/placeholders';

/**
 * Model-View 映射表
 */
const modelViewMap = new Map<any, React.ComponentType<any>>();

/**
 * 注册 Model-View 映射
 */
export function registerModelView(
  ModelClass: any,
  ViewComponent: React.ComponentType<any>
): void {
  modelViewMap.set(ModelClass, ViewComponent);
}

/**
 * 批量注册 Model-View 映射
 */
export function registerModelViews(
  mappings: Array<[any, React.ComponentType<any>]>
): void {
  mappings.forEach(([ModelClass, ViewComponent]) => {
    registerModelView(ModelClass, ViewComponent);
  });
}

// 注册默认的 Model-View 映射
registerModelViews([
  [ProductCardModel, ProductCardView],
  [TabsContainerModel, TabsContainerView],
]);

/**
 * ModelRenderer Props
 */
export interface ModelRendererProps {
  model: BaseComponentModel;
}

/**
 * ModelRenderer
 * 根据 Model 类型渲染对应的 View
 */
export const ModelRenderer: React.FC<ModelRendererProps> = ({ model }) => {
  // console.log(`[ModelRenderer] Rendering model:`, model.constructor.name, model.id);

  // 查找对应的 View 组件
  const ViewComponent = modelViewMap.get(model.constructor);

  if (ViewComponent) {
    console.log(`[ModelRenderer] Found ViewComponent for:`, model.constructor.name);
    return <ViewComponent model={model} />;
  }

  // 占位组件处理
  if (model instanceof ErrorPlaceholderModel) {
    return (
      <div className="placeholder error-placeholder">
        <p>❌ 错误: {(model as any).error?.message || '未知错误'}</p>
      </div>
    );
  }

  if (model instanceof LoadingPlaceholderModel) {
    return (
      <div className="placeholder loading-placeholder">
        <p>⏳ 加载中...</p>
      </div>
    );
  }

  if (model instanceof EmptyPlaceholderModel) {
    return (
      <div className="placeholder empty-placeholder">
        <p>📭 暂无内容</p>
      </div>
    );
  }

  // 如果是容器组件但没有注册 View，直接渲染子组件
  if (model instanceof BaseContainerModel) {
    console.log(`[ModelRenderer] Rendering BaseContainerModel: ${model.constructor.name}, children:`, model.children.length);
    return (
      <div className="container-default">
        {model.children.map((child: any) => (
          <ModelRenderer key={child.id} model={child} />
        ))}
      </div>
    );
  }

  // 未知组件类型
  return (
    <div className="placeholder unknown-placeholder">
      <p>⚠️ 未知组件类型: {model.constructor.name}</p>
    </div>
  );
};
