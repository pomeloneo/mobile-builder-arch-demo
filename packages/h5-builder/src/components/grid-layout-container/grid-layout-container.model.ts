import { BaseContainerModel } from '../../bedrock/model';

/**
 * 网格布局容器 Props
 */
export interface GridLayoutContainerProps {
  columns: number; // 列数
  gap?: number;    // 间距（px）
}

/**
 * 网格布局容器 Model
 * 将子组件按网格布局排列
 * 
 * 业务场景：
 * - 商品网格展示
 * - 图片墙
 * - 功能入口矩阵
 */
export class GridLayoutContainerModel extends BaseContainerModel<GridLayoutContainerProps> {
  constructor(id: string, props: GridLayoutContainerProps) {
    super(id, props);
  }

  protected async onInit(): Promise<void> {
    // 初始化所有子组件
    for (const child of this.children) {
      await child.init();
    }
  }

  protected onActive(): void {
    for (const child of this.children) {
      child.activate();
    }
  }

  protected onInactive(): void {
    for (const child of this.children) {
      child.deactivate();
    }
  }
}
