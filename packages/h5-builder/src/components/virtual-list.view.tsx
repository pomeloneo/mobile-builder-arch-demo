import React, { useRef, useEffect } from 'react';
import { observer } from 'mobx-vue-lite';
import { VirtualListModel } from './virtual-list.model';

/**
 * 虚拟列表 View Props
 */
export interface VirtualListViewProps {
  model: VirtualListModel;
  renderItem: (item: any, index: number) => React.ReactNode;
}

/**
 * 虚拟列表 View
 * 只渲染可见区域的项，提升长列表性能
 */
export const VirtualListView: React.FC<VirtualListViewProps> = observer(
  (props: VirtualListViewProps) => {
    const { model, renderItem } = props;
    const containerRef = useRef<HTMLDivElement>(null);

    // 处理滚动事件
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop;
      model.handleScroll(scrollTop);
    };

    return (
      <div
        ref={containerRef}
        className="virtual-list-container"
        style={{
          height: model.props.containerHeight,
          overflow: 'auto',
          position: 'relative',
        }}
        onScroll={handleScroll}
      >
        {/* 占位元素，撑起总高度 */}
        <div
          className="virtual-list-placeholder"
          style={{
            height: model.totalHeight,
            position: 'relative',
          }}
        >
          {/* 可见项容器 */}
          <div
            className="virtual-list-content"
            style={{
              transform: `translateY(${model.offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {model.visibleItems.map((item, index) => {
              const actualIndex = model.startIndex + index;
              return (
                <div
                  key={actualIndex}
                  className="virtual-list-item"
                  style={{
                    height: model.props.itemHeight,
                  }}
                >
                  {renderItem(item, actualIndex)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

VirtualListView.displayName = 'VirtualListView';
