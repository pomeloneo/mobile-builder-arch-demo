import { BaseContainerModel } from '../../bedrock/model';
import { IPrefetchService } from '../../services/service-identifiers';
import type { PrefetchService } from '../../services/prefetch.service';

/**
 * 实验容器 Props
 */
export interface ExperimentContainerProps {
  experimentKey: string; // 实验 key
  variants: {
    [variantName: string]: number[]; // 每个实验分组对应的子组件索引列表
  };
}

/**
 * 实验容器 Model
 * 根据实验信息动态决定渲染哪些子组件
 * 
 * 业务场景：
 * - A/B 测试：不同用户看到不同的组件
 * - 灰度发布：部分用户看到新功能
 * - 个性化推荐：根据用户特征展示不同内容
 */
export class ExperimentContainerModel extends BaseContainerModel<ExperimentContainerProps> {
  // 当前命中的实验分组
  public variant: string = 'control';

  // 是否正在加载实验信息
  public loading = false;

  constructor(
    id: string,
    props: ExperimentContainerProps,
    @IPrefetchService prefetchService: PrefetchService  // 🔥 新增
  ) {
    super(id, props, prefetchService);  // 🔥 传递给基类
  }

  protected async onInit(): Promise<void> {
    // 1. 获取实验信息（使用 Mock 数据）
    this.fetchExperiment();

    // 2. 根据实验分组初始化对应的子组件
    for (const child of this.activeChildren) {
      await child.init();
    }
  }

  /**
   * 获取当前实验分组对应的子组件
   */
  get activeChildren(): any[] {
    const indices = this.props.variants[this.variant] || [];
    return indices.map(index => this.children[index]).filter(Boolean);
  }

  /**
   * 获取实验信息（Mock 实现）
   */
  private fetchExperiment(): void {
    // Mock 实验分组（随机选择）
    const variants = Object.keys(this.props.variants);
    const variantIndex = Math.floor(Math.random() * variants.length);
    this.variant = variants[variantIndex] || 'control';

    console.log(`[ExperimentContainer:${this.id}] Experiment ${this.props.experimentKey} hit variant: ${this.variant}`);
  }

  protected onActive(): void {
    // 激活所有子组件
    for (const child of this.activeChildren) {
      child.activate();
    }
  }

  protected onInactive(): void {
    // 停用所有子组件
    for (const child of this.activeChildren) {
      child.deactivate();
    }
  }
}
