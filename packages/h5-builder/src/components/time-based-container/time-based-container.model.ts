import { BaseContainerModel } from '../../bedrock/model';

/**
 * 时间段容器 Props
 */
export interface TimeBasedContainerProps {
  timeSlots: {
    [slotName: string]: {
      startHour: number; // 开始小时（0-23）
      endHour: number;   // 结束小时（0-23）
    };
  };
}

/**
 * 时间段容器 Model
 * 根据当前时间决定渲染哪些子组件
 * 
 * 业务场景：
 * - 早餐/午餐/晚餐推荐
 * - 工作时间/休息时间内容
 * - 限时活动展示
 */
export class TimeBasedContainerModel extends BaseContainerModel<TimeBasedContainerProps> {
  // 当前时间段
  public currentSlot: string = 'default';

  constructor(id: string, props: TimeBasedContainerProps) {
    super(id, props);
  }

  protected async onInit(): Promise<void> {
    // 1. 确定当前时间段
    this.determineTimeSlot();

    // 2. 初始化子组件
    for (const child of this.children) {
      await child.init();
    }
  }

  /**
   * 确定当前时间段（Mock 实现）
   */
  private determineTimeSlot(): void {
    const now = new Date();
    const currentHour = now.getHours();

    // 查找匹配的时间段
    for (const [slotName, slot] of Object.entries(this.props.timeSlots)) {
      if (currentHour >= slot.startHour && currentHour < slot.endHour) {
        this.currentSlot = slotName;
        break;
      }
    }

    console.log(
      `[TimeBasedContainer:${this.id}] Current hour: ${currentHour}, slot: ${this.currentSlot}`
    );
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
