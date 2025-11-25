import React from 'react';
import { observer } from 'mobx-vue-lite';
import { TabsContainerModel } from './tabs-container.model';
import { ModelRenderer } from './model-renderer';

/**
 * Tabs 容器 View Props
 */
export interface TabsContainerViewProps {
  model: TabsContainerModel;
  tabTitles?: string[];
}

/**
 * Tabs 容器 View
 * 展示如何渲染子组件、处理 Tab 切换
 */
export const TabsContainerView: React.FC<TabsContainerViewProps> = observer(
  (props: TabsContainerViewProps) => {
    const { model, tabTitles = [] } = props;

    return (
      <div className="tabs-container">
        {/* Tab 头部 */}
        <div className="tabs-header">
          {model.children.map((child: any, index: number) => (
            <button
              key={child.id}
              className={`tab-button ${index === model.activeIndex ? 'active' : ''}`}
              onClick={() => model.switchTab(index)}
            >
              {tabTitles[index] || `Tab ${index + 1}`}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <div className="tabs-content">
          {model.children.map((child: any, index: number) => (
            <div
              key={child.id}
              className={`tab-panel ${index === model.activeIndex ? 'active' : 'hidden'}`}
            >
              {/* 使用 ModelRenderer 递归渲染子组件 */}
              <ModelRenderer model={child} />
            </div>
          ))}
        </div>
      </div>
    );
  }
);

TabsContainerView.displayName = 'TabsContainerView';
