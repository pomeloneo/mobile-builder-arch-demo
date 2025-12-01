import { BaseComponentModel } from '../../bedrock/model/model';
import type { PrefetchService } from '../../services/prefetch.service';
import { IPrefetchService } from '../../services/service-identifiers';

/**
 * 虚拟列表 Props
 */
export interface VirtualListProps {
  itemHeight?: number;           // 固定高度模式（向后兼容）
  estimatedItemHeight?: number;  // 估算高度（动态高度模式）
  containerHeight: number;        // 容器高度
  overscan?: number;              // 预渲染项数（上下各多渲染几项）
}

/**
 * 虚拟列表 Model
 * 支持固定高度和动态高度两种模式
 * 
 * 固定高度模式：指定 itemHeight
 * 动态高度模式：不指定 itemHeight，或指定 estimatedItemHeight
 */
export class VirtualListModel extends BaseComponentModel<VirtualListProps> {
  // 滚动位置
  public scrollTop = 0;

  // 数据源（由外部设置）
  public items: any[] = [];

  // 高度缓存（index -> height）
  private heightCache = new Map<number, number>();

  // 位置缓存（index -> offsetTop）
  private offsetCache = new Map<number, number>();

  // 是否使用固定高度模式
  private get isFixedHeight(): boolean {
    return this.props.itemHeight !== undefined;
  }

  // 估算高度
  private get estimatedHeight(): number {
    return this.props.itemHeight ?? this.props.estimatedItemHeight ?? 120;
  }

  constructor(id: string, props: VirtualListProps, @IPrefetchService prefetchService: PrefetchService) {
    super(id, props, prefetchService);
  }

  protected async onInit(): Promise<void> {
    // 初始化
  }

  /**
   * 处理滚动
   */
  handleScroll(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  /**
   * 设置数据源
   */
  setItems(items: any[]): void {
    this.items = items;
    // 清空缓存
    this.heightCache.clear();
    this.offsetCache.clear();
  }

  /**
   * 更新项的高度（动态高度模式）
   */
  updateItemHeight(index: number, height: number): void {
    if (this.isFixedHeight) return; // 固定高度模式不需要更新

    const oldHeight = this.heightCache.get(index);
    if (oldHeight === height) return; // 高度没变，不需要更新

    this.heightCache.set(index, height);

    // 清除后续项的位置缓存（因为位置会受影响）
    for (let i = index; i < this.items.length; i++) {
      this.offsetCache.delete(i);
    }
  }

  /**
   * 获取项的高度
   */
  getItemHeight(index: number): number {
    if (this.isFixedHeight) {
      return this.props.itemHeight!;
    }
    return this.heightCache.get(index) ?? this.estimatedHeight;
  }

  /**
   * 获取项的偏移位置（相对于列表顶部）
   */
  getOffsetTop(index: number): number {
    // 检查缓存
    if (this.offsetCache.has(index)) {
      return this.offsetCache.get(index)!;
    }

    // 计算偏移量
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += this.getItemHeight(i);
    }

    // 缓存结果
    this.offsetCache.set(index, offset);
    return offset;
  }

  /**
   * 计算属性：可见区域的起始索引
   * 使用二分查找优化性能
   */
  get startIndex(): number {
    if (this.items.length === 0) return 0;

    const overscan = this.props.overscan ?? 3;

    // 固定高度模式：简单计算
    if (this.isFixedHeight) {
      const index = Math.floor(this.scrollTop / this.props.itemHeight!);
      return Math.max(0, index - overscan);
    }

    // 动态高度模式：二分查找
    let left = 0;
    let right = this.items.length - 1;
    let result = 0;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const offset = this.getOffsetTop(mid);

      if (offset < this.scrollTop) {
        result = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return Math.max(0, result - overscan);
  }

  /**
   * 计算属性：可见区域的结束索引
   */
  get endIndex(): number {
    if (this.items.length === 0) return 0;

    const overscan = this.props.overscan ?? 3;
    const viewportBottom = this.scrollTop + this.props.containerHeight;

    // 固定高度模式：简单计算
    if (this.isFixedHeight) {
      const visibleCount = Math.ceil(this.props.containerHeight / this.props.itemHeight!);
      return Math.min(
        this.items.length,
        this.startIndex + visibleCount + overscan * 2
      );
    }

    // 动态高度模式：累加查找
    let index = this.startIndex;
    let offset = this.getOffsetTop(index);

    while (index < this.items.length && offset < viewportBottom + overscan * this.estimatedHeight) {
      offset += this.getItemHeight(index);
      index++;
    }

    return Math.min(this.items.length, index);
  }

  /**
   * 计算属性：可见的项
   */
  get visibleItems(): Array<{ item: any; index: number; top: number; height: number }> {
    const result: Array<{ item: any; index: number; top: number; height: number }> = [];

    for (let i = this.startIndex; i < this.endIndex; i++) {
      result.push({
        item: this.items[i],
        index: i,
        top: this.getOffsetTop(i),
        height: this.getItemHeight(i),
      });
    }

    return result;
  }

  /**
   * 计算属性：总高度
   */
  get totalHeight(): number {
    if (this.items.length === 0) return 0;

    // 固定高度模式：简单计算
    if (this.isFixedHeight) {
      return this.items.length * this.props.itemHeight!;
    }

    // 动态高度模式：累加所有项的高度
    let total = 0;
    for (let i = 0; i < this.items.length; i++) {
      total += this.getItemHeight(i);
    }
    return total;
  }
}
