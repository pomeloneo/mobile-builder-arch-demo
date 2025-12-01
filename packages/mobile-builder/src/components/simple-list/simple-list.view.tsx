import React from 'react';
import { observer } from 'mobx-vue-lite';
import { SimpleListModel } from './simple-list.model';
import { ModelRenderer } from '../model-renderer';

/**
 * SimpleList View
 * 
 * SimpleList 是一个纯容器组件，只负责渲染子组件。
 */
export interface SimpleListViewProps {
  model: SimpleListModel;
}

export const SimpleListView: React.FC<SimpleListViewProps> = observer((props: SimpleListViewProps) => {
  const { model } = props;

  console.log(`[SimpleListView:${model.id}] Rendering, children count:`, model.children.length);

  return (
    <div className="simple-list">
      {model.children.map((child) => (
        <ModelRenderer key={child.id} model={child} />
      ))}
    </div>
  );
});

SimpleListView.displayName = 'SimpleListView';
