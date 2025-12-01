import { observable } from 'mobx-vue-lite';
import { DisposableStore, IDisposable } from '../dispose';
import { IPrefetchService } from '../../services/service-identifiers';
import type { PrefetchService } from '../../services/prefetch.service';

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

  // 数据获取相关状态（响应式）
  public data: any = null;
  public loading = false;
  public error: Error | null = null;

  // 🔥 新增：标记数据来源
  private _dataFromPrefetch = false;

  constructor(
    public id: string,
    public props: P,
    @IPrefetchService protected prefetchService: PrefetchService  // 🔥 必选依赖
  ) {
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
    if (typeof resource === 'function') {
      this._disposables.add({ dispose: resource });
      return resource as T;
    }
    return this._disposables.add(resource as IDisposable) as T;
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
   * 🔥 支持三种场景：
   * 1. 只有预加载数据 - 使用预加载数据，可选调用 onInitWithPrefetchData
   * 2. 预加载失败 - 降级到 onInit
   * 3. 无预加载数据 - 直接调用 onInit
   */
  async init(): Promise<void> {
    if (this.isInited) {
      console.warn(`[Model:${this.id}] Already initialized`);
      return;
    }

    this.isInited = true;
    console.log(`[Model:${this.id}] Initializing`);

    // 1. 先尝试获取预加载 Promise
    const prefetchPromise = this.prefetchService.getData(this.id);

    if (prefetchPromise) {
      // 有预加载数据，等待 Promise 完成
      console.log(`[Model:${this.id}] 发现预加载数据，等待加载...`);

      try {
        this.data = await prefetchPromise;
        this._dataFromPrefetch = true;
        console.log(`[Model:${this.id}] 预加载数据加载成功`);

        // 🔥 检查子类是否覆写了 onInitWithPrefetchData 方法
        // 只有覆写了才调用，避免不必要的空调用
        const hasCustomPrefetchHandler = this.onInitWithPrefetchData !== BaseComponentModel.prototype.onInitWithPrefetchData;

        if (hasCustomPrefetchHandler) {
          console.log(`[Model:${this.id}] 调用 onInitWithPrefetchData 加载补充数据...`);
          await this.onInitWithPrefetchData(this.data);
        } else {
          console.log(`[Model:${this.id}] 无需加载补充数据，直接使用预加载数据`);
        }
      } catch (error) {
        // 预加载失败，降级到 onInit
        console.warn(`[Model:${this.id}] 预加载失败，降级到 onInit`, error);
        this._dataFromPrefetch = false;
        await this.onInit();
      }
    } else {
      // 没有预加载数据，走正常流程
      console.log(`[Model:${this.id}] 无预加载数据，执行 onInit`);
      await this.onInit();
    }
  }

  /**
   * 检查数据是否来自预加载
   */
  get isDataFromPrefetch(): boolean {
    return this._dataFromPrefetch;
  }

  /**
   * 激活 Model（Tab 切入时调用）
   */
  activate(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
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
    this.onInactive();
  }

  /**
   * 获取数据
   * 子类可以覆写此方法来实现具体的数据获取逻辑
   */
  async fetchData(): Promise<void> {
    // 默认空实现
  }

  /**
   * 刷新数据
   */
  async refresh(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      await this.fetchData();
    } catch (err) {
      this.error = err as Error;
      console.error(`[Model:${this.id}] Fetch data failed:`, err);
    } finally {
      this.loading = false;
    }
  }

  // ===== 生命周期钩子（子类覆写） =====

  /**
   * 初始化钩子
   * 在这里发起网络请求、订阅事件等
   * 注意：此方法必须返回 Promise，即使是同步操作也要用 async
   */
  protected abstract onInit(): Promise<void>;

  /**
   * 预加载数据初始化钩子
   * 🔥 当组件有预加载数据时调用，允许子类执行额外的初始化逻辑
   * 
   * @param prefetchedData 预加载的数据
   * 
   * @example
   * // 场景1：只使用预加载数据，不需要额外逻辑
   * protected async onInitWithPrefetchData(prefetchedData: any): Promise<void> {
   *   // 不实现或留空，只使用预加载数据
   * }
   * 
   * @example
   * // 场景2：预加载主数据 + 加载补充数据
   * protected async onInitWithPrefetchData(prefetchedData: ProductData): Promise<void> {
   *   // prefetchedData 已经被赋值到 this.data
   *   // 加载补充数据（如用户收藏状态、实时库存等）
   *   const [isFavorited, stock] = await Promise.all([
   *     this.checkFavoriteStatus(prefetchedData.id),
   *     this.fetchRealTimeStock(prefetchedData.id)
   *   ]);
   *   
   *   // 合并到 this.data
   *   this.data = {
   *     ...this.data,
   *     isFavorited,
   *     stock
   *   };
   * }
   */
  protected async onInitWithPrefetchData(prefetchedData: any): Promise<void> {
    // 默认空实现，子类可以选择性覆写
  }

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
 * 
 * 默认行为：
 * - onInit: 自动初始化所有子组件
 * - onActive: 自动激活所有子组件
 * - onInactive: 自动停用所有子组件
 * 
 * 子类可以覆写这些方法来实现自定义逻辑（记得调用 super）
 */
export abstract class BaseContainerModel<P = any, C extends BaseComponentModel = BaseComponentModel> extends BaseComponentModel<P> {
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

  /**
   * 默认初始化：初始化所有子组件
   * 子类可以覆写此方法来实现自定义逻辑（例如懒加载、闲时预热等）
   */
  protected async onInit(): Promise<void> {
    console.log(`[BaseContainer:${this.id}] Initializing ${this.children.length} children`);

    // 并行初始化所有子组件
    await Promise.all(this.children.map(child => child.init()));

    console.log(`[BaseContainer:${this.id}] All children initialized`);
  }

  /**
   * 默认激活：激活所有子组件
   * 子类可以覆写此方法来实现自定义逻辑（例如只激活当前 Tab）
   */
  protected onActive(): void {
    console.log(`[BaseContainer:${this.id}] Activating ${this.children.length} children`);

    // 默认激活所有子组件
    for (const child of this.children) {
      child.activate();
    }
  }

  /**
   * 默认停用：停用所有子组件
   * 子类可以覆写此方法来实现自定义逻辑
   */
  protected onInactive(): void {
    console.log(`[BaseContainer:${this.id}] Deactivating ${this.children.length} children`);

    // 默认停用所有子组件
    for (const child of this.children) {
      child.deactivate();
    }
  }

  protected override onDestroy(): void {
    // 容器销毁时，自动销毁所有子 Model
    // 由于子 Model 已经通过 register 注册，这里不需要手动调用
    super.onDestroy();
  }
}
