import { IdleCallbackExecutor } from './idle-callback-executor';

describe('IdleCallbackExecutor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  test('requestHostCallback1', async () => {
    const idleCallbackExecutor = new IdleCallbackExecutor();
    const fn1 = vi.fn();

    idleCallbackExecutor.requestHostCallback(fn1);

    vi.advanceTimersByTime(50);
    expect(fn1).toBeCalled();
  });

  // 多次调度及时任务，后者覆盖
  test('requestHostCallback2', async () => {
    const idleCallbackExecutor = new IdleCallbackExecutor();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    idleCallbackExecutor.requestHostCallback(fn1);
    idleCallbackExecutor.requestHostCallback(fn2);

    vi.advanceTimersByTime(50);
    expect(fn1).not.toBeCalled();
    expect(fn2).toBeCalled();
  });

  // 成功取消
  test('cancelHostCallback1', async () => {
    const idleCallbackExecutor = new IdleCallbackExecutor();
    const fn1 = vi.fn();

    idleCallbackExecutor.requestHostCallback(fn1);
    idleCallbackExecutor.cancelHostCallback();

    vi.advanceTimersByTime(50);
    expect(fn1).not.toBeCalled();
  });

  // 成功取消，后续添加正常
  test('cancelHostCallback2', async () => {
    const idleCallbackExecutor = new IdleCallbackExecutor();
    const fn1 = vi.fn();

    idleCallbackExecutor.requestHostCallback(fn1);
    idleCallbackExecutor.cancelHostCallback();
    vi.advanceTimersByTime(50);
    expect(fn1).not.toBeCalled();

    idleCallbackExecutor.requestHostCallback(fn1);
    vi.advanceTimersByTime(50);
    expect(fn1).toBeCalled();
  });

  // 针对场景2的同步行为
  test('cancelHostCallback3', async () => {
    const idleCallbackExecutor = new IdleCallbackExecutor();
    const fn1 = vi.fn();

    idleCallbackExecutor.requestHostCallback(fn1);
    idleCallbackExecutor.cancelHostCallback();
    idleCallbackExecutor.requestHostCallback(fn1);
    vi.advanceTimersByTime(50);
    expect(fn1).toBeCalledTimes(1);
  });
});
