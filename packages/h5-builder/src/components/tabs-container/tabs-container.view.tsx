import React from 'react';
import { observer } from 'mobx-vue-lite';
import { TabsContainerModel } from './tabs-container.model';
import { ModelRenderer } from '../model-renderer';
import { VirtualListView } from '../virtual-list/virtual-list.view';


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
 * 
 * 新增功能：自动适配虚拟滚动
 * - 如果 Tab 启用了虚拟滚动，自动使用 VirtualListView
 * - 否则使用普通的 ModelRenderer
 */
export const TabsContainerView: React.FC<TabsContainerViewProps> = observer(
  (props: TabsContainerViewProps) => {
    const { model, tabTitles = [] } = props;
    return (
      <div className="tabs-container">
        {/* Tab 头部 */}
        <div className="tabs-header">
          {model.children.map((child: any, index: number) => {
            // 获取子组件数量
            const itemCount = child.children?.length || 0;
            const isVirtual = model.isVirtualScrollEnabled(index);
            const defaultTitle = tabTitles[index] || `Tab ${index + 1}`;
            const title = `${defaultTitle} (${itemCount} items${isVirtual ? ' - Virtual' : ''})`;

            return (
              <button
                key={child.id}
                className={`tab-button ${index === model.activeIndex ? 'active' : ''}`}
                onClick={() => model.switchTab(index)}
              >
                {title}
              </button>
            );
          })}
        </div>

        {/* Tab 内容 */}
        <div className="tabs-content">
          {model.children.map((child: any, index: number) => {
            const isActive = index === model.activeIndex;
            const virtualList = model.getVirtualList(index);

            console.log(`[TabsContainerView] Rendering tab ${index}, active: ${isActive}, virtual: ${!!virtualList}, child:`, child.constructor.name);

            return (
              <div
                key={child.id}
                className={`tab-panel ${isActive ? 'active' : 'hidden'}`}
              >
                {virtualList ? (
                  // 使用虚拟滚动渲染
                  <VirtualListView
                    model={virtualList}
                    renderItem={(itemModel: any) => (
                      <ModelRenderer model={itemModel} />
                    )}
                  />
                ) : (
                  // 普通渲染
                  <ModelRenderer model={child} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

TabsContainerView.displayName = 'TabsContainerView';
