import { BaseComponentModel } from '../kernel/model';
import { Inject } from '../kernel/di';

/**
 * 虚拟列表 Props
 */
export interface VirtualListProps {
  itemHeight: number;      // 每项高度
  containerHeight: number; // 容器高度
  overscan?: number;       // 预渲染项数（上下各多渲染几项）
}

/**
 * 虚拟列表 Model
 * 实现高性能的长列表渲染
 */
export class VirtualListModel extends BaseComponentModel<VirtualListProps> {
  // 滚动位置
  public scrollTop = 0;

  // 数据源（由外部设置）
  public items: any[] = [];

  constructor(id: string, props: VirtualListProps) {
    super(id, props);
  }

  protected onInit(): void {
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
  }

  /**
   * 计算属性：可见区域的起始索引
   */
  get startIndex(): number {
    const index = Math.floor(this.scrollTop / this.props.itemHeight);
    const overscan = this.props.overscan ?? 3;
    return Math.max(0, index - overscan);
  }

  /**
   * 计算属性：可见区域的结束索引
   */
  get endIndex(): number {
    const visibleCount = Math.ceil(this.props.containerHeight / this.props.itemHeight);
    const overscan = this.props.overscan ?? 3;
    return Math.min(
      this.items.length,
      this.startIndex + visibleCount + overscan * 2
    );
  }

  /**
   * 计算属性：可见的项
   */
  get visibleItems(): any[] {
    return this.items.slice(this.startIndex, this.endIndex);
  }

  /**
   * 计算属性：总高度
   */
  get totalHeight(): number {
    return this.items.length * this.props.itemHeight;
  }

  /**
   * 计算属性：偏移量
   */
  get offsetY(): number {
    return this.startIndex * this.props.itemHeight;
  }
}
