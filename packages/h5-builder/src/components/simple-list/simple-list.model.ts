import { BaseContainerModel } from '../../bedrock/model';

/**
 * 简单列表容器 Model
 * 用于包含一组子组件，不包含额外的业务逻辑
 * 
 * 使用 BaseContainerModel 的默认生命周期管理：
 * - 自动初始化所有子组件
 * - 自动激活所有子组件
 * - 自动停用所有子组件
 */
export class SimpleListModel extends BaseContainerModel {
  // 不需要覆写任何生命周期方法
  // BaseContainerModel 会自动管理所有子组件
}
