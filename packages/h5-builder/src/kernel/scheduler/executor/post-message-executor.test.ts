import { wait } from '../../async';
import { PostMessageExecutor } from './post-message-executor';

describe('PostMessageExecutor', () => {
  test('requestHostCallback1', async () => {
    const postMessageExecutor = new PostMessageExecutor();
    const fn1 = vi.fn();

    postMessageExecutor.requestHostCallback(fn1);

    await wait(150);
    expect(fn1).toBeCalled();
  });

  // 多次调度及时任务，后者覆盖
  test('requestHostCallback2', async () => {
    const postMessageExecutor = new PostMessageExecutor();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    postMessageExecutor.requestHostCallback(fn1);
    postMessageExecutor.requestHostCallback(fn2);

    await wait(150);
    expect(fn1).not.toBeCalled();
    expect(fn2).toBeCalled();
  });

  // 成功取消
  test('cancelHostCallback1', async () => {
    const postMessageExecutor = new PostMessageExecutor();
    const fn1 = vi.fn();

    postMessageExecutor.requestHostCallback(fn1);
    postMessageExecutor.cancelHostCallback();

    await wait(150);
    expect(fn1).not.toBeCalled();
  });

  // 成功取消，后续添加正常
  test('cancelHostCallback2', async () => {
    const postMessageExecutor = new PostMessageExecutor();
    const fn1 = vi.fn();

    postMessageExecutor.requestHostCallback(fn1);
    postMessageExecutor.cancelHostCallback();
    await wait(150);
    expect(fn1).not.toBeCalled();

    postMessageExecutor.requestHostCallback(fn1);
    await wait(150);
    expect(fn1).toBeCalled();
  });

  test('cancelHostCallback3', async () => {
    const postMessageExecutor = new PostMessageExecutor();
    const fn1 = vi.fn();

    postMessageExecutor.requestHostCallback(fn1);
    postMessageExecutor.cancelHostCallback();
    postMessageExecutor.requestHostCallback(fn1);
    await wait(150);
    expect(fn1).toBeCalledTimes(1);
  });
});
