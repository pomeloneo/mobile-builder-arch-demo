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
 * 虚拟列表项组件
 * 负责测量自身高度并通知 Model
 */
interface VirtualListItemProps {
  model: VirtualListModel;
  item: any;
  index: number;
  top: number;
  height: number;
  renderItem: (item: any, index: number) => React.ReactNode;
}

const VirtualListItem: React.FC<VirtualListItemProps> = observer((props: VirtualListItemProps) => {
  const { model, item, index, top, height, renderItem } = props;
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = itemRef.current;
    if (!element) return;

    // 使用 requestAnimationFrame 确保在下一帧测量
    // 这样可以确保元素已经完全渲染
    const rafId = requestAnimationFrame(() => {
      const currentHeight = element.offsetHeight;
      if (currentHeight > 0) {
        model.updateItemHeight(index, currentHeight);
      }
    });

    // 使用 ResizeObserver 监听后续的高度变化
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;
        if (newHeight > 0) {
          model.updateItemHeight(index, newHeight);
        }
      }
    });

    resizeObserver.observe(element);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [model, index]);

  return (
    <div
      ref={itemRef}
      className="virtual-list-item"
    >
      {renderItem(item, index)}
    </div>
  );
});

VirtualListItem.displayName = 'VirtualListItem';

/**
 * 虚拟列表 View
 * 使用流式布局 + padding 实现虚拟滚动
 * 支持固定高度和动态高度
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

    // 计算上下 padding
    const paddingTop = model.startIndex > 0 ? model.getOffsetTop(model.startIndex) : 0;
    const paddingBottom = model.endIndex < model.items.length
      ? model.totalHeight - model.getOffsetTop(model.endIndex)
      : 0;

    return (
      <div
        ref={containerRef}
        className="virtual-list-container"
        style={{
          height: model.props.containerHeight,
          overflow: 'auto',
        }}
        onScroll={handleScroll}
      >
        {/* 上方占位 */}
        {paddingTop > 0 && <div style={{ height: paddingTop }} />}

        {/* 可见项：使用流式布局 */}
        {model.visibleItems.map(({ item, index }) => (
          <VirtualListItem
            key={index}
            model={model}
            item={item}
            index={index}
            top={0}
            height={0}
            renderItem={renderItem}
          />
        ))}

        {/* 下方占位 */}
        {paddingBottom > 0 && <div style={{ height: paddingBottom }} />}
      </div>
    );
  }
);

VirtualListView.displayName = 'VirtualListView';
