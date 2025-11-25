import React from 'react';
import { observer } from 'mobx-vue-lite';
import { ProductCardModel } from './product-card.model';

/**
 * 商品卡片 View Props
 */
export interface ProductCardViewProps {
  model: ProductCardModel;
}

/**
 * 商品卡片 View
 * 纯 UI 组件，不包含任何业务逻辑
 * 
 * 关键原则：
 * - 通过 props 接收 model
 * - 使用 observer HOC 自动响应状态变化
 * - 所有交互通过调用 model 的方法处理
 * - 不包含任何业务逻辑
 */
export const ProductCardView: React.FC<ProductCardViewProps> = observer((props: ProductCardViewProps) => {
  const { model } = props;
  // Loading 状态
  if (model.loading) {
    return (
      <div className="product-card loading">
        <div className="skeleton"></div>
        <p>加载中...</p>
      </div>
    );
  }

  // Error 状态
  if (model.error) {
    return (
      <div className="product-card error">
        <p>加载失败: {model.error.message}</p>
        <button onClick={() => model.init()}>重试</button>
      </div>
    );
  }

  // 数据未加载
  if (!model.data) {
    return null;
  }

  // 正常渲染
  return (
    <div
      className="product-card"
      onClick={() => model.handleClick()}
      data-product-id={model.data.id}
    >
      <div className="product-image">
        <img src={model.data.image} alt={model.data.name} />
      </div>

      <div className="product-info">
        <h3 className="product-name">{model.data.name}</h3>

        {model.data.description && (
          <p className="product-description">{model.data.description}</p>
        )}

        {model.shouldShowPrice && (
          <div className="product-price">{model.formattedPrice}</div>
        )}
      </div>
    </div>
  );
});

// 设置 displayName 用于调试
ProductCardView.displayName = 'ProductCardView';
