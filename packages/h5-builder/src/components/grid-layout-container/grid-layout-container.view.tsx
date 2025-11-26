import React from 'react';
import { observer } from 'mobx-vue-lite';
import { GridLayoutContainerModel } from './grid-layout-container.model';
import { ModelRenderer } from '../model-renderer';

export interface GridLayoutContainerViewProps {
  model: GridLayoutContainerModel;
}

/**
 * 网格布局容器 View
 */
export const GridLayoutContainerView: React.FC<GridLayoutContainerViewProps> = observer(
  (props: GridLayoutContainerViewProps) => {
    const { model } = props;
    const columns = model.props.columns || 2;
    const gap = model.props.gap || 8;

    return (
      <div
        className="grid-layout-container"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`,
          marginBottom: '8px',
        }}
      >
        {model.children.map((child: any) => (
          <ModelRenderer key={child.id} model={child} />
        ))}
      </div>
    );
  }
);

GridLayoutContainerView.displayName = 'GridLayoutContainerView';
