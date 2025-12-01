import React from 'react';
import { observer } from 'mobx-vue-lite';
import { ProductCardEnhancedModel } from './product-card-enhanced.model';

/**
 * 增强版商品卡片 View Props
 */
export interface ProductCardEnhancedViewProps {
  model: ProductCardEnhancedModel;
}

/**
 * 增强版商品卡片 View
 * 🎯 演示预加载数据 + 补充数据的场景
 * 
 * 复用 product-card 的样式
 */
export const ProductCardEnhancedView: React.FC<ProductCardEnhancedViewProps> = observer((props: ProductCardEnhancedViewProps) => {
  const { model } = props;

  // 🔍 调试日志
  console.log(`[ProductCardEnhancedView:${model.id}] Rendering - loading: ${model.loading}, data: ${!!model.data}, fromPrefetch: ${model.isDataFromPrefetch}`);

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
      data-product-id={model.data.id}
      style={{ position: 'relative' }}
    >
      {/* 数据来源标识 */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        background: model.isDataFromPrefetch ? '#4CAF50' : '#2196F3',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        zIndex: 10
      }}>
        {model.isDataFromPrefetch ? '⚡ 预加载' : '📡 实时'}
      </div>

      <div className="product-image">
        <img src={model.data.image} alt={model.data.name} />

        {/* 🔥 补充数据：库存标签 */}
        {model.data.stock !== undefined && (
          <div style={{
            position: 'absolute',
            top: '40px',
            right: '8px',
            background: model.data.stock < 10 ? '#f44336' : 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            库存: {model.data.stock}
          </div>
        )}
      </div>

      <div className="product-info">
        <h3 className="product-name">{model.data.name}</h3>

        {model.data.description && (
          <p className="product-description">{model.data.description}</p>
        )}

        <div className="product-price">¥{model.data.price}</div>

        {/* 🔥 补充数据：推荐理由 */}
        {model.data.recommendations && model.data.recommendations.length > 0 && (
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {model.data.recommendations.map((reason: string, index: number) => (
              <span key={index} style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px'
              }}>
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* 🔥 补充数据：用户评价 */}
        {model.data.userReview && (
          <div style={{
            marginTop: '8px',
            background: '#f5f5f5',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666'
          }}>
            💬 {model.data.userReview}
          </div>
        )}

        {/* 🔥 补充数据：收藏状态 */}
        {model.data.isFavorited !== undefined && (
          <div
            onClick={() => model.toggleFavorite()}
            style={{
              marginTop: '8px',
              fontSize: '13px',
              color: model.data.isFavorited ? '#f44336' : '#999',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            {model.data.isFavorited ? '❤️ 已收藏' : '🤍 未收藏'}
          </div>
        )}
      </div>
    </div>
  );
});

// 设置 displayName 用于调试
ProductCardEnhancedView.displayName = 'ProductCardEnhancedView';
