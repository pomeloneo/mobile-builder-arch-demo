import { createDecorator, type BrandedService } from '@/bedrock/di/base';
import { Emitter, type Event } from './emitter';
import type { IDisposable } from '@/bedrock/dispose';

/**
 * 事件类约束
 * 所有用于 EventBus 的事件类必须有一个静态的 ID 属性
 * 
 * @example
 * class ProductClickEvent {
 *   static readonly ID = 'product:click';
 *   constructor(public readonly productId: number) {}
 * }
 */
export interface IEventClass<TPayload = any> {
  readonly ID: string;
  new(...args: any[]): TPayload;
}

/**
 * EventBus 服务接口
 * 提供类型安全的跨组件事件通信能力
 */
export interface IEventBus {
  readonly _serviceBrand: undefined;

  /**
   * 发布事件
   * @param event 事件实例
   * 
   * @example
   * this.eventBus.publish(new ProductClickEvent(productId, productName));
   */
  publish<T>(event: T): void;

  /**
   * 订阅事件
   * @param EventClass 事件类（必须有静态 ID 属性）
   * @param handler 事件处理函数
   * @returns 可销毁的订阅，调用 dispose() 取消订阅
   * 
   * @example
   * const disposable = this.eventBus.subscribe(ProductClickEvent, (event) => {
   *   console.log('收到商品点击:', event.productId);
   * });
   * // 取消订阅
   * disposable.dispose();
   */
  subscribe<T extends IEventClass>(
    EventClass: T,
    handler: (event: InstanceType<T>) => void
  ): IDisposable;

  /**
   * 获取指定事件类型的 Event 对象
   * 用于与现有 Emitter 工具（listenOnce, listenWhen 等）配合
   * 
   * @example
   * listenOnce(this.eventBus.eventOf(ProductClickEvent))((event) => {
   *   console.log('只监听一次:', event.productId);
   * });
   */
  eventOf<T extends IEventClass>(EventClass: T): Event<[InstanceType<T>]>;

  /**
   * 销毁 EventBus，清理所有订阅
   */
  dispose(): void;
}

/**
 * EventBus 服务标识符
 * 用于 DI 注入
 * 
 * @example
 * constructor(@IEventBus private eventBus: IEventBus) {}
 */
export const IEventBus = createDecorator<IEventBus>('eventBus');

/**
 * EventBus 服务实现
 * 
 * 设计思路：
 * 1. 使用 static ID 作为事件匹配 key，解决跨模块类引用不一致问题
 * 2. 内部使用 Map<string, Emitter> 管理不同类型的事件
 * 3. 延迟创建 Emitter，只在首次订阅时创建
 */
export class EventBus implements IEventBus {
  readonly _serviceBrand: undefined;

  // 使用 string 作为 key，解决跨模块引用不一致问题
  private readonly _emitters = new Map<string, Emitter<[any]>>();
  private _disposed = false;

  /**
   * 发布事件
   */
  publish<T>(event: T): void {
    if (this._disposed) {
      console.warn('[EventBus] Already disposed, publish ignored');
      return;
    }

    // 从实例的构造函数获取静态 ID
    const eventId = (event as any).constructor?.ID as string;
    if (!eventId) {
      console.warn('[EventBus] 发布了一个没有 ID 的事件，将被忽略:', event);
      return;
    }

    const emitter = this._emitters.get(eventId);
    if (emitter) {
      emitter.fire(event);
    }
    // 如果没有订阅者，静默忽略（这是正常行为）
  }

  /**
   * 订阅事件
   */
  subscribe<T extends IEventClass>(
    EventClass: T,
    handler: (event: InstanceType<T>) => void
  ): IDisposable {
    if (this._disposed) {
      throw new Error('[EventBus] Cannot subscribe after disposed');
    }

    const eventId = EventClass.ID;
    if (!eventId) {
      throw new Error(`[EventBus] 订阅失败：类 ${EventClass.name} 缺少静态属性 ID`);
    }

    // 延迟创建 Emitter
    if (!this._emitters.has(eventId)) {
      this._emitters.set(eventId, new Emitter());
    }

    return this._emitters.get(eventId)!.event(handler);
  }

  /**
   * 获取事件的 Event 对象，用于与 Emitter 工具配合
   */
  eventOf<T extends IEventClass>(EventClass: T): Event<[InstanceType<T>]> {
    const eventId = EventClass.ID;
    if (!eventId) {
      throw new Error(`[EventBus] 获取事件失败：类 ${EventClass.name} 缺少静态属性 ID`);
    }

    if (!this._emitters.has(eventId)) {
      this._emitters.set(eventId, new Emitter());
    }

    return this._emitters.get(eventId)!.event as Event<[InstanceType<T>]>;
  }

  /**
   * 销毁 EventBus
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;

    for (const emitter of this._emitters.values()) {
      emitter.dispose();
    }
    this._emitters.clear();
  }
}
