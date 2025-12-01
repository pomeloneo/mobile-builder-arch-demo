import { BaseComponentModel } from '../../bedrock/model/model';

/**
 * 文本卡片 Props
 */
export interface TextCardProps {
  title: string;
  content: string;
  lines?: number; // 内容行数（1-5）
}

/**
 * 文本卡片 Model
 * 高度由内容行数决定（小）
 */
export class TextCardModel extends BaseComponentModel<TextCardProps> {
  protected async onInit(): Promise<void> {
    // 简单组件，无需初始化
  }
}
