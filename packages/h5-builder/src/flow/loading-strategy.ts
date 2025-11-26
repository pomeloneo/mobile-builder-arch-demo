import { ComponentSchema } from './component-loader';

/**
 * 加载上下文
 */
export interface LoadingContext {
  // 首屏 Tab 索引
  activeTabIndex?: number;

  // 可见区域
  viewport?: {
    top: number;
    bottom: number;
  };

  // 用户信息
  user?: {
    isVip?: boolean;
    isNew?: boolean;
  };

  // 网络状态
  network?: {
    type: '4g' | '5g' | 'wifi' | 'slow';
    speed: number; // Mbps
  };

  // 设备信息
  device?: {
    memory: number; // GB
    cpu: string;
  };
}

/**
 * 加载策略接口
 */
export interface LoadingStrategy {
  /**
   * 判断是否应该加载组件
   */
  shouldLoad(schema: ComponentSchema, context: LoadingContext): boolean;

  /**
   * 调整组件加载优先级（可选）
   */
  adjustPriority?(schema: ComponentSchema, basePriority: number): number;
}
