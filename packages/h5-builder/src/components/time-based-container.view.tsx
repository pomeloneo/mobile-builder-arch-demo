import React from 'react';
import { observer } from 'mobx-vue-lite';
import { TimeBasedContainerModel } from './time-based-container.model';
import { ModelRenderer } from './model-renderer';

export interface TimeBasedContainerViewProps {
  model: TimeBasedContainerModel;
}

/**
 * 时间段容器 View
 */
export const TimeBasedContainerView: React.FC<TimeBasedContainerViewProps> = observer(
  (props: TimeBasedContainerViewProps) => {
    const { model } = props;

    return (
      <div className="time-based-container" style={{ marginBottom: '8px' }}>
        {/* 调试信息 */}
        <div
          style={{
            padding: '4px 8px',
            backgroundColor: '#fff3e0',
            fontSize: '10px',
            color: '#e65100',
            marginBottom: '8px',
            borderRadius: '4px',
          }}
        >
          ⏰ Time Slot: {model.currentSlot}
        </div>

        {/* 渲染子组件 */}
        {model.children.map((child: any) => (
          <ModelRenderer key={child.id} model={child} />
        ))}
      </div>
    );
  }
);

TimeBasedContainerView.displayName = 'TimeBasedContainerView';
