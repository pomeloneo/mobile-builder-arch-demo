import { SharedMutex } from './shared-mutex';

class Foo {
  private readonly _mutex: SharedMutex = new SharedMutex();
  private _value = 0;
  private _getCounter = 0;

  get value() {
    return this._value;
  }

  get getCounter() {
    return this._getCounter;
  }

  async add(val: number) {
    await this._mutex.lock();
    this._value += val;
    setTimeout(() => {
      this._mutex.unLock();
    }, 50);
  }

  async subtract(val: number) {
    await this._mutex.lock();
    this._value -= val;
    setTimeout(() => {
      this._mutex.unLock();
    }, 50);
  }

  async getValue(ms: number) {
    await this._mutex.lockShared();
    try {
      this._getCounter++;
      return this._value;
    } finally {
      setTimeout(() => {
        this._mutex.unLockShared();
      }, ms);
    }
  }
}

describe('SharedMutex used', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // 竞争写锁
  it('lock', async () => {
    const foo = new Foo();

    foo.add(10);
    foo.subtract(10);
    foo.subtract(10);
    // 涉及到拿锁，是异步的，所以wait一下
    vi.advanceTimersByTime(1);
    await Promise.resolve();

    expect(foo.value).toBe(10);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    expect(foo.value).toBe(0);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    expect(foo.value).toBe(-10);
  });

  // 读锁共享
  it('sharedLock', async () => {
    const foo = new Foo();
    foo.getValue(50);
    foo.getValue(50);
    foo.getValue(50);
    // 涉及到拿锁，是异步的，所以wait一下
    vi.advanceTimersByTime(1);
    await Promise.resolve();

    expect(foo.getCounter).toBe(3);
  });

  // 先上读锁，写锁等待
  it('shared before, exclusive after1', async () => {
    const result: number[] = [];
    const foo = new Foo();
    foo.getValue(50).then((v) => result.push(v));
    foo.add(10);
    // 涉及到拿锁，是异步的，所以wait一下
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    await Promise.resolve();

    expect(foo.getCounter).toBe(1);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(0);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    // 写者成功执行
    expect(foo.value).toBe(10);
  });

  // 多个读锁，写锁等待
  it('shared before, exclusive after2', async () => {
    const result: number[] = [];
    const foo = new Foo();
    foo.getValue(50).then((v) => result.push(v));
    foo.getValue(100).then((v) => result.push(v));
    foo.add(10);
    // 涉及到拿锁，是异步的，所以wait一下
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(foo.getCounter).toBe(2);
    expect(result.length).toBe(2);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(0);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    // 有一个读锁还没有释放
    expect(foo.value).toBe(0);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    // 写者成功执行
    expect(foo.value).toBe(10);
  });

  // 先上读锁，多个写锁等待
  it('shared before, exclusive after3', async () => {
    const result: number[] = [];
    const foo = new Foo();
    foo.getValue(50).then((v) => result.push(v));
    foo.add(10);
    foo.add(20);
    // 涉及到拿锁，是异步的，所以wait一下
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    await Promise.resolve();

    expect(foo.getCounter).toBe(1);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(0);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    // 第一个写者执行完毕
    expect(foo.value).toBe(10);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    // 第二个写者执行完毕
    expect(foo.value).toBe(30);
  });

  // 先上写锁，再上读锁
  it('exclusive before, shared after1', async () => {
    const result: number[] = [];
    const foo = new Foo();
    foo.add(10);
    foo.getValue(50).then((v) => result.push(v));
    // 涉及到拿锁，是异步的，所以wait一下
    vi.advanceTimersByTime(1);
    await Promise.resolve();

    expect(foo.getCounter).toBe(0);
    expect(foo.value).toBe(10);
    expect(result.length).toBe(0);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    await Promise.resolve();
    expect(foo.getCounter).toBe(1);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(10);
  });

  // 多个写锁在前，读锁在后
  it('exclusive before, shared after2', async () => {
    const result: number[] = [];
    const foo = new Foo();
    foo.add(10);
    foo.add(15);
    foo.getValue(50).then((v) => result.push(v));
    // 涉及到拿锁，是异步的，所以wait一下
    vi.advanceTimersByTime(1);
    await Promise.resolve();

    expect(foo.getCounter).toBe(0);
    expect(foo.value).toBe(10);
    expect(result.length).toBe(0);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    expect(foo.getCounter).toBe(0);
    expect(foo.value).toBe(25);
    expect(result.length).toBe(0);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    await Promise.resolve();
    expect(foo.getCounter).toBe(1);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(25);
  });

  // 写锁在前，多个读锁在后
  it('exclusive before, shared after3', async () => {
    const result: number[] = [];
    const foo = new Foo();
    foo.add(15);
    foo.getValue(50).then((v) => result.push(v));
    foo.getValue(50).then((v) => result.push(v));
    // 涉及到拿锁，是异步的，所以wait一下
    vi.advanceTimersByTime(1);
    await Promise.resolve();

    expect(foo.getCounter).toBe(0);
    expect(foo.value).toBe(15);
    expect(result.length).toBe(0);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(foo.getCounter).toBe(2);
    expect(result.length).toBe(2);
    expect(result[0]).toBe(15);
    expect(result[1]).toBe(15);
  });

  // 写者优先，写者优先级比读者搞
  it('exclusive first1', async () => {
    const result: number[] = [];
    const foo = new Foo();
    foo.add(15);
    foo.getValue(50).then((v) => result.push(v));
    foo.add(15);
    // 涉及到拿锁，是异步的，所以wait一下
    vi.advanceTimersByTime(1);
    await Promise.resolve();

    expect(foo.value).toBe(15);
    expect(result.length).toBe(0);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    // 虽然读者先等待，但是写者优先
    expect(foo.getCounter).toBe(0);
    expect(foo.value).toBe(30);
    expect(result.length).toBe(0);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    await Promise.resolve();
    // 最后读者可以正常触发
    expect(foo.getCounter).toBe(1);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(30);
  });

  // 写者优先，穿插读者最后一起获取锁
  it('exclusive first2', async () => {
    const result: number[] = [];
    const foo = new Foo();
    foo.add(15);
    foo.getValue(50).then((v) => result.push(v));
    foo.add(15);
    foo.getValue(50).then((v) => result.push(v));
    // 涉及到拿锁，是异步的，所以wait一下
    vi.advanceTimersByTime(1);
    await Promise.resolve();

    expect(foo.value).toBe(15);
    expect(result.length).toBe(0);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    // 虽然读者先等待，但是写者优先
    expect(foo.getCounter).toBe(0);
    expect(foo.value).toBe(30);
    expect(result.length).toBe(0);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    // 最后读者可以正常触发
    expect(foo.getCounter).toBe(2);
    expect(result.length).toBe(2);
    expect(result[0]).toBe(30);
    expect(result[1]).toBe(30);
  });

  // 写者-读者-写者-读者
  it('exclusive first3', async () => {
    const result: number[] = [];
    const foo = new Foo();
    // 第一轮的处理
    foo.add(15);
    foo.getValue(10).then((v) => result.push(v));

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    vi.advanceTimersByTime(50);
    await Promise.resolve();
    await Promise.resolve();

    expect(foo.value).toBe(15);
    expect(result.length).toBe(1);

    // 第二轮的处理
    foo.add(15);
    foo.getValue(10).then((v) => result.push(v));

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    vi.advanceTimersByTime(50);
    await Promise.resolve();
    await Promise.resolve();

    expect(foo.value).toBe(30);
    expect(result.length).toBe(2);
  });

  // 读者-写者-读者-写者
  it('exclusive first4', async () => {
    const result: number[] = [];
    const foo = new Foo();
    // 第一轮的处理
    foo.getValue(10).then((v) => result.push(v));
    foo.add(15);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(50);
    await Promise.resolve();

    expect(foo.value).toBe(15);
    expect(result.length).toBe(1);

    // 第二轮的处理
    foo.getValue(10).then((v) => result.push(v));
    foo.add(15);

    vi.advanceTimersByTime(50);
    await Promise.resolve();
    vi.advanceTimersByTime(50);
    await Promise.resolve();
    await Promise.resolve();

    expect(foo.value).toBe(30);
    expect(result.length).toBe(2);
  });

  // 极端场景没有报错
  it('lvAsset success', () => {
    const sharedMutex = new SharedMutex();
    sharedMutex.lock();
    sharedMutex.lock();
    sharedMutex.unLock();
    sharedMutex.lock();

    expect(true).toBe(true);
  });

  it('lvAsset success2', () => {
    const sharedMutex = new SharedMutex();
    sharedMutex.lockShared();
    sharedMutex.lock();
    sharedMutex.unLockShared();
    sharedMutex.unLock();
    expect(true).toBe(true);

    sharedMutex.lockShared();
    sharedMutex.unLockShared();
    expect(true).toBe(true);
  });
});

describe('SharedMutex self', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // 写者等待，锁释放的同步任务，后面插入了写者
  // 前写者为大
  it('sync unlock1', async () => {
    const result: number[] = [];
    const sharedMutex = new SharedMutex();
    sharedMutex.lock().then(() => {
      result.push(0);
    });
    sharedMutex.lock().then(() => {
      result.push(1);
    });
    sharedMutex.unLock();
    sharedMutex.lock().then(() => {
      result.push(2);
    });
    // 涉及到拿锁，是异步的，所以wait一下
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    // 只释放了一次，前写者为大
    expect(result.length).toBe(2);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(1);
    sharedMutex.unLock();
    // 涉及异步
    await Promise.resolve();
    expect(result.length).toBe(3);
    expect(result[2]).toBe(2);
  });

  // 读者等待，锁释放的同步任务，后面插入了写者
  // 前读者为大
  it('sync unlock2', async () => {
    const result: number[] = [];
    const sharedMutex = new SharedMutex();
    sharedMutex.lock().then(() => {
      result.push(0);
    });
    sharedMutex.lockShared().then(() => {
      result.push(1);
    });
    sharedMutex.unLock();
    sharedMutex.lock().then(() => {
      result.push(2);
    });
    // 涉及到拿锁，是异步的，所以wait一下
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    // 只释放了一次，读者为大
    expect(result.length).toBe(2);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(1);
    sharedMutex.unLockShared();
    // 涉及异步
    await Promise.resolve();
    expect(result.length).toBe(3);
    expect(result[2]).toBe(2);
  });

  it('tryLock', async () => {
    const result: number[] = [];
    const sharedMutex = new SharedMutex();
    sharedMutex.lock();
    // tryLock失败
    expect(sharedMutex.tryLock()).toBeFalsy();
    sharedMutex.unLock();
    // tryLock成功
    expect(sharedMutex.tryLock()).toBeTruthy();
    // 再次tryLock失败
    expect(sharedMutex.tryLock()).toBeFalsy();
    sharedMutex.lock().then(() => {
      result.push(0);
    });
    // 涉及到拿锁，是异步的，所以wait一下
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    // tryLock先拿到了锁
    expect(result.length).toBe(0);
    // 释放了tryLock的锁
    sharedMutex.unLock();
    // 涉及异步
    await Promise.resolve();
    expect(result.length).toBe(1);
    expect(result[0]).toBe(0);
  });

  it('tryLockShared', async () => {
    const result: number[] = [];
    const sharedMutex = new SharedMutex();
    sharedMutex.lock();
    // tryLockShared失败
    expect(sharedMutex.tryLockShared()).toBeFalsy();
    sharedMutex.unLock();
    // tryLockShared成功
    expect(sharedMutex.tryLockShared()).toBeTruthy();
    // 再次tryLockShared成功
    expect(sharedMutex.tryLockShared()).toBeTruthy();
    // tryLock失败
    expect(sharedMutex.tryLock()).toBeFalsy();
    sharedMutex.lockShared().then(() => {
      result.push(0);
    });
    sharedMutex.lock().then(() => {
      result.push(1);
    });
    // 涉及到拿锁，是异步的，所以wait一下
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    // 读锁共享
    expect(result.length).toBe(1);
    expect(result[0]).toBe(0);
    // 释放了tryLockShared的锁
    sharedMutex.unLockShared();
    sharedMutex.unLockShared();
    sharedMutex.unLockShared();
    // 此时tryLockShared失败，写者已经进入第一道门了
    expect(sharedMutex.tryLockShared()).toBeFalsy();
    // 涉及异步
    await Promise.resolve();
    expect(result.length).toBe(2);
    expect(result[1]).toBe(1);
  });

  // 连续两次 读-写-读 穿插场景
  it('real scene1', async () => {
    const sharedMutex = new SharedMutex();
    sharedMutex.lockShared().then(() => sharedMutex.unLockShared());
    sharedMutex.lock().then(() => sharedMutex.unLock());
    sharedMutex.lockShared().then(() => sharedMutex.unLockShared());
    sharedMutex.lockShared().then(() => sharedMutex.unLockShared());
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    sharedMutex.lockShared().then(() => sharedMutex.unLockShared());
    sharedMutex.lock().then(() => sharedMutex.unLock());
    sharedMutex.lockShared().then(() => sharedMutex.unLockShared());
    sharedMutex.lockShared().then(() => sharedMutex.unLockShared());
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    // 读锁共享
    expect(sharedMutex.isLocked()).toBeFalsy();
  });
});
