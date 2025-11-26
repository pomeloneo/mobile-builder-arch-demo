import React from 'react';
import { observer } from 'mobx-vue-lite';
import { TextCardModel } from './text-card.model';

export interface TextCardViewProps {
  model: TextCardModel;
}

/**
 * 文本卡片 View
 * 高度由内容行数决定
 */
export const TextCardView: React.FC<TextCardViewProps> = observer((props: TextCardViewProps) => {
  const { model } = props;
  const lines = model.props.lines || 2;

  return (
    <div className="text-card" style={{
      padding: '12px 16px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      marginBottom: '8px',
    }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
        {model.props.title}
      </h4>
      <p style={{
        margin: 0,
        fontSize: '12px',
        color: '#666',
        lineHeight: '1.5',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: lines,
        WebkitBoxOrient: 'vertical',
      }}>
        {model.props.content}
      </p>
    </div>
  );
});

TextCardView.displayName = 'TextCardView';
