import { BaseContainerModel } from '../kernel/model';

/**
 * 简单列表容器 Model
 * 用于包含一组子组件，不包含额外的业务逻辑
 */
export class SimpleListModel extends BaseContainerModel {
  protected async onInit(): Promise<void> {
    // 简单容器不需要额外的初始化逻辑
    // 子组件会由 ComponentLoader 自动添加
    console.log(`[SimpleListModel:${this.id}] onInit called, children count:`, this.children.length);
  }
}
