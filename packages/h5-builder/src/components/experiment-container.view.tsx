import React from 'react';
import { observer } from 'mobx-vue-lite';
import { ExperimentContainerModel } from './experiment-container.model';
import { ModelRenderer } from './model-renderer';

export interface ExperimentContainerViewProps {
  model: ExperimentContainerModel;
}

/**
 * 实验容器 View
 * 渲染根据实验分组选择的子组件
 */
export const ExperimentContainerView: React.FC<ExperimentContainerViewProps> = observer((props: ExperimentContainerViewProps) => {
  const { model } = props;

  if (model.loading) {
    return (
      <div style={{
        padding: '16px',
        textAlign: 'center',
        color: '#999',
        fontSize: '12px',
      }}>
        Loading experiment...
      </div>
    );
  }

  return (
    <div className="experiment-container" style={{
      position: 'relative',
    }}>
      {/* 调试信息 */}
      <div style={{
        padding: '4px 8px',
        backgroundColor: '#e3f2fd',
        fontSize: '10px',
        color: '#1976d2',
        marginBottom: '8px',
        borderRadius: '4px',
      }}>
        🧪 Experiment: {model.props.experimentKey} | Variant: {model.variant}
      </div>

      {/* 渲染子组件 */}
      {model.children.map((child: any) => (
        <ModelRenderer key={child.id} model={child} />
      ))}
    </div>
  );
});

ExperimentContainerView.displayName = 'ExperimentContainerView';
