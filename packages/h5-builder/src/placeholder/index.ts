import { BaseComponentModel } from '../bedrock/model/model';

/**
 * 错误占位组件 Model
 */
export class ErrorPlaceholderModel extends BaseComponentModel<{ error: string; originalType?: string }> {
  protected async onInit(): Promise<void> {
    // 可以在这里上报错误
    console.error(`[ErrorPlaceholder] Component ${this.props.originalType} failed: ${this.props.error}`);
  }
}

/**
 * 加载占位组件 Model
 */
export class LoadingPlaceholderModel extends BaseComponentModel {
  protected async onInit(): Promise<void> {
    // 空实现
  }
}

/**
 * 空状态占位组件 Model
 */
export class EmptyPlaceholderModel extends BaseComponentModel {
  protected async onInit(): Promise<void> {
    // 空实现
  }
}
