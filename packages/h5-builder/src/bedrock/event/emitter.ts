import { makeSafeDisposable } from '@/bedrock/dispose';
import type { IDisposable } from '@/bedrock/dispose';
import { DisposableLinkedList } from './disposable-linked-list';
import { asyncUnexpectedError } from './error-handler';

export interface EmitterOptions {
  onAddListener?: (...args: any) => any;
  onRemoveListener?: (...args: any) => any;
  onListenerError?: (e: any) => void;
}

//
// 事件监听中的回调实体
//
class Listener<TArgs extends any[]> {
  private readonly _callback: (...args: TArgs) => void;
  private readonly _callbackThis: any | undefined;

  constructor(callback: (...args: TArgs) => void, callbackThis: any | undefined) {
    this._callback = callback;
    this._callbackThis = callbackThis;
  }

  invoke(...args: TArgs): void {
    this._callback.call(this._callbackThis, ...args);
  }
}

//
// 存放在EventDeliveryQueue中的元素
//
class EventDeliveryQueueElement<TArgs extends any[]> {
  readonly emitter: Emitter<TArgs>;
  readonly listener: Listener<TArgs>;
  readonly event: TArgs;
  constructor(emitter: Emitter<TArgs>, listener: Listener<TArgs>, event: TArgs) {
    this.emitter = emitter;
    this.listener = listener;
    this.event = event;
  }
}

export class EventDeliveryQueue {
  protected _queue = new DisposableLinkedList<EventDeliveryQueueElement<any>>();

  constructor(private readonly _onListenerError: (e: unknown) => void = asyncUnexpectedError) { }

  get size(): number {
    return this._queue.size;
  }

  push<TArgs extends any[]>(emitter: Emitter<TArgs>, listener: Listener<TArgs>, event: TArgs): void {
    this._queue.push(new EventDeliveryQueueElement(emitter, listener, event));
  }

  clear<TArgs extends any[]>(emitter: Emitter<TArgs>): void {
    const newQueue = new DisposableLinkedList<EventDeliveryQueueElement<TArgs>>();
    for (const element of this._queue) {
      if (element.emitter !== emitter) {
        newQueue.push(element);
      }
    }
    this._queue = newQueue;
  }

  deliver(): void {
    while (this._queue.size > 0) {
      const element = this._queue.shift()!;
      try {
        element.listener.invoke(...element.event);
      } catch (e) {
        this._onListenerError(e);
      }
    }
  }
}

export interface Event<T extends any[]> {
  (listener: (...args: T) => any, thisArgs?: any): IDisposable;
}

export class Emitter<TArgs extends any[]> {
  protected _listeners?: DisposableLinkedList<Listener<TArgs>>;
  private readonly _options?: EmitterOptions;
  private _disposed = false;
  private _event?: Event<TArgs>;
  private _deliveryQueue?: EventDeliveryQueue;

  constructor(options?: EmitterOptions) {
    this._options = options;
  }

  get event(): Event<TArgs> {
    if (this._event) {
      return this._event;
    }

    this._event = (callback: (...args: TArgs) => any, thisArgs?: any): IDisposable => {
      const listener = new Listener(callback, thisArgs);

      if (!this._listeners) {
        this._listeners = new DisposableLinkedList();
      }

      const removeListener = this._listeners.pushAndGetDisposableNode(listener);

      if (this._options?.onAddListener) {
        this._options.onAddListener(this, callback, thisArgs);
      }

      // 生成可销毁函数返回
      const result = () => {
        if (!this._disposed) {
          removeListener();
          if (this._options?.onRemoveListener) {
            this._options.onRemoveListener(this, callback, thisArgs);
          }
        }
      };

      return makeSafeDisposable(result);
    };

    return this._event;
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    this._listeners?.clear();
    this._deliveryQueue?.clear(this);
  }

  fire(...event: TArgs): void {
    if (!this._listeners || this._listeners.size === 0) {
      return;
    }
    // 绝大部分场景事件只会有一个监听器，针对性进行性能优化，没必要构造DeliveryQueue结构
    if (this._listeners.size === 1) {
      const listener = this._listeners.firstNode!;
      try {
        listener.value.invoke(...event);
      } catch (e) {
        if (this._options?.onListenerError) {
          this._options.onListenerError(e);
        } else {
          asyncUnexpectedError(e);
        }
      }
      return;
    }

    this._deliveryQueue ??= new EventDeliveryQueue(this._options?.onListenerError);

    for (const listener of this._listeners) {
      this._deliveryQueue.push(this, listener, event);
    }
    this._deliveryQueue.deliver();
  }
}
