import { describe, it, expect, vi } from 'vitest';
import { DisposableStore, IDisposable } from '../bedrock/disposable';

describe('DisposableStore', () => {
  it('should add and dispose function resources', () => {
    const store = new DisposableStore();
    const cleanup = vi.fn();

    store.add(cleanup);
    expect(store.size).toBe(1);

    store.dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(store.isDisposed).toBe(true);
  });

  it('should add and dispose IDisposable resources', () => {
    const store = new DisposableStore();
    const resource: IDisposable = {
      dispose: vi.fn(),
    };

    store.add(resource);
    store.dispose();

    expect(resource.dispose).toHaveBeenCalledTimes(1);
  });

  it('should dispose resources in LIFO order', () => {
    const store = new DisposableStore();
    const order: number[] = [];

    store.add(() => order.push(1));
    store.add(() => order.push(2));
    store.add(() => order.push(3));

    store.dispose();

    // 应该是 3, 2, 1 (后进先出)
    expect(order).toEqual([3, 2, 1]);
  });

  it('should handle errors during disposal', () => {
    const store = new DisposableStore();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
    const cleanup1 = vi.fn();
    const cleanup2 = vi.fn(() => {
      throw new Error('Disposal error');
    });
    const cleanup3 = vi.fn();

    store.add(cleanup1);
    store.add(cleanup2);
    store.add(cleanup3);

    store.dispose();

    // 即使中间有错误，所有清理函数都应该被调用
    expect(cleanup1).toHaveBeenCalled();
    expect(cleanup2).toHaveBeenCalled();
    expect(cleanup3).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should not allow adding after disposal', () => {
    const store = new DisposableStore();
    const cleanup = vi.fn();

    store.dispose();
    store.add(cleanup);

    // 添加到已销毁的 store 应该立即执行清理
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('should clear without disposing', () => {
    const store = new DisposableStore();
    const cleanup = vi.fn();

    store.add(cleanup);
    store.clear();

    expect(store.size).toBe(0);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('should be idempotent on multiple dispose calls', () => {
    const store = new DisposableStore();
    const cleanup = vi.fn();

    store.add(cleanup);
    store.dispose();
    store.dispose();
    store.dispose();

    // 只应该被调用一次
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
