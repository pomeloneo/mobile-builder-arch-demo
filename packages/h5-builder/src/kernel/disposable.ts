/**
 * 资源清理接口
 * 所有需要清理资源的对象都应该实现此接口
 */
export interface IDisposable {
  dispose(): void;
}

/**
 * 资源存储器
 * 用于收集和批量清理资源（定时器、事件监听器、订阅等）
 */
export class DisposableStore implements IDisposable {
  private items: (IDisposable | (() => void))[] = [];
  private _isDisposed = false;

  /**
   * 添加需要清理的资源
   * @param item 可以是实现了 IDisposable 的对象，或者是清理函数
   * @returns 返回添加的资源，方便链式调用
   */
  add<T extends IDisposable | (() => void)>(item: T): T {
    if (this._isDisposed) {
      console.warn('[DisposableStore] Cannot add to disposed store');
      // 立即清理
      if (typeof item === 'function') {
        item();
      } else {
        item.dispose();
      }
      return item;
    }

    this.items.push(item);
    return item;
  }

  /**
   * 清理所有资源
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;

    // 倒序清理（后进先出）
    while (this.items.length > 0) {
      const item = this.items.pop()!;
      try {
        if (typeof item === 'function') {
          item();
        } else {
          item.dispose();
        }
      } catch (error) {
        console.error('[DisposableStore] Error disposing item:', error);
      }
    }
  }

  /**
   * 清空所有资源但不执行清理
   */
  clear(): void {
    this.items = [];
  }

  /**
   * 获取当前存储的资源数量
   */
  get size(): number {
    return this.items.length;
  }

  /**
   * 是否已被清理
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }
}

/**
 * 创建一个可取消的 Promise
 */
export function createCancelablePromise<T>(
  promise: Promise<T>
): { promise: Promise<T>; cancel: () => void } {
  let isCanceled = false;

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise
      .then((value) => {
        if (!isCanceled) {
          resolve(value);
        }
      })
      .catch((error) => {
        if (!isCanceled) {
          reject(error);
        }
      });
  });

  return {
    promise: wrappedPromise,
    cancel: () => {
      isCanceled = true;
    },
  };
}
