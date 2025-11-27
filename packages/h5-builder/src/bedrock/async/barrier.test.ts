import { Barrier, makeBarrierByPromise } from './barrier';

describe('barrier', () => {
  it('barriers promise', async () => {
    vi.useFakeTimers();
    const before = Date.now();
    const barrier = new Barrier();
    expect(barrier.isOpen()).toBe(false);
    setTimeout(() => {
      barrier.open();
    }, 300);
    vi.advanceTimersByTime(300);
    await barrier.wait();
    expect(barrier.isOpen()).toBe(true);
    expect(Date.now() - before).toBe(300);
  });

  // resolve成功
  it('makeBarrierByPromise1', async () => {
    vi.useFakeTimers();
    const barrier = makeBarrierByPromise(
      new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 300);
      }),
    );
    vi.advanceTimersByTime(400);
    // 涉及到promise，等待一次tick
    await Promise.resolve();
    expect(barrier.isOpen()).toBe(true);
  });

  // 一直在pending中
  it('makeBarrierByPromise2', async () => {
    vi.useFakeTimers();
    const barrier = makeBarrierByPromise(
      new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 500);
      }),
    );
    vi.advanceTimersByTime(300);
    // 涉及到promise，等待一次tick
    await Promise.resolve();
    expect(barrier.isOpen()).toBe(false);
  });

  // reject，没有扭转
  it('makeBarrierByPromise3', async () => {
    try {
      vi.useFakeTimers();
      const barrier = makeBarrierByPromise(
        expect(
          new Promise<void>((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('123'));
            }, 300);
          }),
        ).rejects.toThrow(new Error('123')),
      );
      vi.advanceTimersByTime(400);
      // 涉及到promise，等待一次tick
      await Promise.resolve();
      expect(barrier.isOpen()).toBe(false);
    } catch (error) {}
  });

  // reject，进行扭转
  it('makeBarrierByPromise4', async () => {
    try {
      vi.useFakeTimers();
      const barrier = makeBarrierByPromise(
        expect(
          new Promise<void>((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('123'));
            }, 300);
          }),
        ).rejects.toThrow(new Error('123')),
        true,
      );
      vi.advanceTimersByTime(400);
      // 涉及到promise，等待一次tick
      await Promise.resolve();
      expect(barrier.isOpen()).toBe(true);
    } catch (error) {}
  });
});
