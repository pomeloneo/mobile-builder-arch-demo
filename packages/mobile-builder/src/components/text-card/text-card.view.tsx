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
    <div className="text-card">
      <h4>
        {model.props.title}
      </h4>
      <p style={{
        WebkitLineClamp: lines,
      }}>
        {model.props.content}
      </p>
    </div>
  );
});

TextCardView.displayName = 'TextCardView';
