import React from 'react';
import { observer } from 'mobx-vue-lite';
import { ConditionalContainerModel } from './conditional-container.model';
import { ModelRenderer } from './model-renderer';

export interface ConditionalContainerViewProps {
  model: ConditionalContainerModel;
}

/**
 * 条件渲染容器 View
 */
export const ConditionalContainerView: React.FC<ConditionalContainerViewProps> = observer(
  (props: ConditionalContainerViewProps) => {
    const { model } = props;

    if (!model.shouldRender) {
      return null; // 不满足条件，不渲染
    }

    return (
      <div className="conditional-container" style={{ marginBottom: '8px' }}>
        {/* 调试信息 */}
        <div
          style={{
            padding: '4px 8px',
            backgroundColor: '#f3e5f5',
            fontSize: '10px',
            color: '#6a1b9a',
            marginBottom: '8px',
            borderRadius: '4px',
          }}
        >
          ✨ Condition: {model.props.condition} (Rendered)
        </div>

        {/* 渲染子组件 */}
        {model.children.map((child: any) => (
          <ModelRenderer key={child.id} model={child} />
        ))}
      </div>
    );
  }
);

ConditionalContainerView.displayName = 'ConditionalContainerView';
