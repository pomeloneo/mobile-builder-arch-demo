import { AbstractExecutor } from './abstract-executor';
import type { IExecutedCallback } from './executor.interface';

class TestExecutor extends AbstractExecutor {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public requestHostCallback(fn: IExecutedCallback) {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public cancelHostCallback() {}
}

describe('AbstractExecutor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // 延迟任务调度正常执行
  test('requestHostTimeout1', () => {
    const testExecutor = new TestExecutor();
    const fn = vi.fn();
    testExecutor.requestHostTimeout(fn, 3);
    vi.advanceTimersByTime(10);
    expect(fn).toBeCalled();
  });

  // 重复进行延迟任务调度，报错
  test('requestHostTimeout2', () => {
    const testExecutor = new TestExecutor();
    const fn = vi.fn();
    testExecutor.requestHostTimeout(fn, 3);
    expect(() => {
      testExecutor.requestHostTimeout(fn, 3);
    }).toThrowError();
  });

  test('cancelHostTimeout', () => {
    const testExecutor = new TestExecutor();
    const fn = vi.fn();
    testExecutor.requestHostTimeout(fn, 3);
    testExecutor.cancelHostTimeout();
    vi.advanceTimersByTime(10);
    expect(fn).not.toBeCalled();
  });
});
