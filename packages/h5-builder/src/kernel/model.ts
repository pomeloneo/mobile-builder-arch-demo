import { observable } from 'mobx-vue-lite';
import { DisposableStore, IDisposable } from './disposable';

/**
 * 组件 Model 基类
 * 所有业务组件的 Model 都应该继承此类
 * 
 * @template P Props 类型
 */
export abstract class BaseComponentModel<P = any> implements IDisposable {
  // 资源垃圾袋
  protected _disposables = new DisposableStore();

  // 状态标记（响应式）
  public isInited = false;
  public isActive = false;

  constructor(public id: string, public props: P) {
    // 使用 mobx-vue-lite 的 observable 使整个对象响应式
    return observable(this) as this;
  }

  /**
   * 注册需要清理的资源
   * @param resource 可以是 IDisposable 对象或清理函数
   * @returns 返回注册的资源，方便链式调用
   * 
   * @example
   * const timerId = setInterval(() => {}, 1000);
   * this.register(() => clearInterval(timerId));
   */
  protected register<T extends IDisposable | (() => void)>(resource: T): T {
    return this._disposables.add(resource);
  }

  /**
   * 销毁 Model
   * 会自动调用 onDestroy 钩子并清理所有注册的资源
   */
  dispose(): void {
    if (this._disposables.isDisposed) {
      console.warn(`[Model:${this.id}] Already disposed`);
      return;
    }

    console.log(`[Model:${this.id}] Disposing`);
    this.onDestroy();
    this._disposables.dispose();
  }

  /**
   * 初始化 Model
   * 确保 onInit 只执行一次
   */
  init(): void {
    if (this.isInited) {
      console.warn(`[Model:${this.id}] Already initialized`);
      return;
    }

    this.isInited = true;
    console.log(`[Model:${this.id}] Initializing`);
    this.onInit();
  }

  /**
   * 激活 Model（Tab 切入时调用）
   */
  activate(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    console.log(`[Model:${this.id}] Activated`);
    this.onActive();
  }

  /**
   * 停用 Model（Tab 切走时调用）
   */
  deactivate(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    console.log(`[Model:${this.id}] Deactivated`);
    this.onInactive();
  }

  // ===== 生命周期钩子（子类覆写） =====

  /**
   * 初始化钩子
   * 在这里发起网络请求、订阅事件等
   */
  protected abstract onInit(): void | Promise<void>;

  /**
   * 销毁钩子
   * 在这里执行自定义的清理逻辑
   */
  protected onDestroy(): void {
    // 默认空实现
  }

  /**
   * 激活钩子
   * Tab 切入时调用，可以恢复定时器、重新订阅等
   */
  protected onActive(): void {
    // 默认空实现
  }

  /**
   * 停用钩子
   * Tab 切走时调用，可以暂停定时器、取消订阅等
   */
  protected onInactive(): void {
    // 默认空实现
  }
}

/**
 * 容器 Model 基类
 * 用于包含子 Model 的容器组件（如 Tabs, List 等）
 */
export abstract class BaseContainerModel<P = any, C extends BaseComponentModel = BaseComponentModel>
  extends BaseComponentModel<P> {
  public children: C[] = [];

  /**
   * 添加子 Model
   */
  protected addChild(child: C): void {
    this.children.push(child);
    // 注册子 Model 的清理
    this.register(child);
  }

  /**
   * 移除子 Model
   */
  protected removeChild(child: C): void {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
      child.dispose();
    }
  }

  /**
   * 清空所有子 Model
   */
  protected clearChildren(): void {
    this.children.forEach((child) => child.dispose());
    this.children = [];
  }

  protected override onDestroy(): void {
    // 容器销毁时，自动销毁所有子 Model
    // 由于子 Model 已经通过 register 注册，这里不需要手动调用
    super.onDestroy();
  }
}
