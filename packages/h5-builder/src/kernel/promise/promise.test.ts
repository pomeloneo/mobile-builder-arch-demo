/* eslint-disable max-nested-callbacks */
import type { ILvErrorOr, ILvErrorRef } from '../error';
import { GenericError, makeError } from '../error';
import type { ICancellationToken } from '../async';
import { makeCancelablePromise, makePromiseWithTimeout, parallelPromise } from './promise';

describe('cancel promise', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // promise可以正常resolve
  it('promise resolve', async () => {
    let res: ILvErrorOr<boolean> | undefined;
    makeCancelablePromise(
      (_token: ICancellationToken) =>
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(true), 400);
        }),
    ).then((result) => {
      res = result;
    });
    vi.advanceTimersByTime(500);
    await Promise.resolve();
    await Promise.resolve();
    expect(res).not.toBeUndefined();
    expect(res!.ok).toBeTruthy();
  });

  // promise可以正常reject
  it('promise reject', async () => {
    let res: ILvErrorOr<boolean> | undefined;
    makeCancelablePromise(
      (_token: ICancellationToken) =>
        new Promise<boolean>((resolve, reject) => {
          setTimeout(() => reject(), 400);
        }),
    )
      .then((result) => {
        res = result;
      })
      .catch(() => {
        res = makeError(-1, '');
      });
    vi.advanceTimersByTime(500);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(res).not.toBeUndefined();
    expect(res!.ok).toBeFalsy();
    expect(res!.code).toBe(-1);
  });

  // promise可以取消
  it('cancel success', async () => {
    let res: ILvErrorOr<boolean> | undefined;
    const p = makeCancelablePromise(
      (_token: ICancellationToken) =>
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(true), 400);
        }),
    );
    p.then((result) => {
      res = result;
    });
    vi.advanceTimersByTime(200);
    await Promise.resolve();
    expect(res).toBeUndefined();

    // 中途取消
    p.cancel();

    // 不用等到resolve，res已经回来了
    vi.advanceTimersByTime(50);
    await Promise.resolve();
    expect(res).not.toBeUndefined();

    // 哪怕等到resolve回来，结果也不会错误
    vi.advanceTimersByTime(300);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(res!.ok).toBeFalsy();
    expect(res!.code).toBe(GenericError.Cancelled);
  });
});

describe('parallel promise', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // 所有的promise都可以正常成功执行
  it('all promise success', async () => {
    let t = 0;
    const p1 = new Promise<number>((resolve, reject) => {
      resolve(1);
    }).then((value) => {
      t += value;
    });
    const p2 = makeCancelablePromise(() =>
      new Promise<number>((resolve, reject) => {
        setTimeout(() => resolve(2), 500);
      }).then((value) => {
        t += value;
      }),
    );

    parallelPromise([p1, p2]);
    vi.advanceTimersByTime(500);
    await Promise.resolve();
    expect(t).toBe(3);
  });

  // 单个promise reject，错误可以抛出，其他promise正常执行
  it('one promise reject, anthor run', async () => {
    let t = 0;
    const p1 = new Promise<number>((resolve, reject) => {
      reject(new Error('test error.'));
    }).then((value) => {
      t += value;
    });
    const p2 = new Promise<number>((resolve, reject) => {
      setTimeout(() => resolve(2), 500);
    }).then((value) => {
      t += value;
    });

    try {
      await parallelPromise([p1, p2]);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toBe('test error.');
    } finally {
      // 虽然p1失败了，但是p2还是正常执行了
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      expect(t).toBe(2);
    }
  });

  // 单个promise reject，错误可以抛出，其他cancelablePromise尽量取消
  it('one promise reject, anthor cancel', async () => {
    let t = 0;
    const p1 = new Promise<number>((resolve, reject) => {
      reject(new Error('p1 error.'));
    }).then((value) => {
      t += value;
    });
    const p2 = makeCancelablePromise(() =>
      new Promise<number>((resolve, reject) => {
        setTimeout(() => resolve(2), 500);
      }).then((value) => {
        t += value;
      }),
    );

    try {
      await parallelPromise([p1, p2]);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toBe('p1 error.');
    } finally {
      expect(t).toBe(0);
    }
  });

  // 单个promise error，其他cancelablePromise尽量取消
  it('one promise error, anthor cancel', async () => {
    let t = 0;
    const p1 = new Promise<ILvErrorRef>((resolve) => {
      resolve(makeError(-1, 'p1 error.'));
    });
    const p2 = makeCancelablePromise(() =>
      new Promise<number>((resolve, reject) => {
        setTimeout(() => resolve(2), 500);
      }).then((value) => {
        t += value;
      }),
    );

    const result = await parallelPromise([p1, p2]);
    expect(result.ok).toBeFalsy();
    expect(result.msg).toBe('p1 error.');
    // p1失败了，p2被cancel了
    expect(t).toBe(0);
  });
});

describe('promiseWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // 超时
  it('test1', async () => {
    const promise = makePromiseWithTimeout(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(233);
        }, 200);
      });
    }, 100);
    vi.advanceTimersByTime(150);
    await Promise.resolve();
    const result = await promise;
    expect(result.ok).toBeFalsy();
    expect(result.toString()).toBe('[2]operation(s) timed out..');
  });

  // 未超时
  it('test2', async () => {
    const promise = makePromiseWithTimeout((): Promise<number> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(233);
        }, 200);
      });
    }, 300);
    vi.advanceTimersByTime(250);
    await Promise.resolve();
    const result = await promise;
    expect(result.ok).toBeTruthy();
    if (result.ok) {
      expect(result.value).toBe(233);
    } else {
      expect(true).toBe(false);
    }
  });

  // 超时但存在默认值
  it('test3', async () => {
    const promise = makePromiseWithTimeout(
      () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(233);
          }, 200);
        });
      },
      100,
      666,
    );
    vi.advanceTimersByTime(150);
    await Promise.resolve();
    const result = await promise;
    expect(result.ok).toBeTruthy();
    if (result.ok) {
      expect(result.value).toBe(666);
    } else {
      expect(true).toBe(false);
    }
  });
});
