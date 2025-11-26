import { BaseContainerModel } from '../kernel/model';

/**
 * 条件渲染容器 Props
 */
export interface ConditionalContainerProps {
  condition: 'user_vip' | 'user_new' | 'random' | 'always'; // 条件类型
  probability?: number; // 随机概率（0-1）
}

/**
 * 条件渲染容器 Model
 * 根据条件决定是否渲染子组件
 * 
 * 业务场景：
 * - VIP 专属内容
 * - 新用户引导
 * - 随机抽奖/惊喜
 * - A/B 测试
 */
export class ConditionalContainerModel extends BaseContainerModel<ConditionalContainerProps> {
  // 是否满足条件
  public shouldRender: boolean = false;

  constructor(id: string, props: ConditionalContainerProps) {
    super(id, props);
  }

  protected async onInit(): Promise<void> {
    // 1. 判断条件
    this.evaluateCondition();

    // 2. 如果满足条件，初始化子组件
    if (this.shouldRender) {
      for (const child of this.children) {
        await child.init();
      }
    }
  }

  /**
   * 评估条件（Mock 实现）
   */
  private evaluateCondition(): void {
    switch (this.props.condition) {
      case 'user_vip':
        // Mock: 30% 概率是 VIP
        this.shouldRender = Math.random() < 0.3;
        break;
      case 'user_new':
        // Mock: 50% 概率是新用户
        this.shouldRender = Math.random() < 0.5;
        break;
      case 'random':
        // 使用指定概率
        this.shouldRender = Math.random() < (this.props.probability || 0.5);
        break;
      case 'always':
        this.shouldRender = true;
        break;
      default:
        this.shouldRender = false;
    }

    console.log(
      `[ConditionalContainer:${this.id}] Condition: ${this.props.condition}, shouldRender: ${this.shouldRender}`
    );
  }

  protected onActive(): void {
    if (this.shouldRender) {
      for (const child of this.children) {
        child.activate();
      }
    }
  }

  protected onInactive(): void {
    if (this.shouldRender) {
      for (const child of this.children) {
        child.deactivate();
      }
    }
  }
}
