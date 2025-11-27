import { SharedMutex } from './shared-mutex';
import { transferSharedLock, transferLock, tryTransferLock } from './utils';

function isMutexReleased(mutex: SharedMutex) {
  return !mutex.isLocked();
}

describe('transferLock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // 正常上锁并且解锁
  it('lock and unlock', async () => {
    const mutex = new SharedMutex();
    const unlockable = await transferLock(mutex);
    expect(isMutexReleased(mutex)).toBeFalsy();
    unlockable.unlock();
    expect(isMutexReleased(mutex)).toBeTruthy();
  });

  // 上锁，超时导致释放锁
  it('lock and timeout', async () => {
    const mutex = new SharedMutex();
    await transferLock(mutex, 10);
    expect(isMutexReleased(mutex)).toBeFalsy();
    vi.advanceTimersByTime(15);
    await Promise.resolve();
    expect(isMutexReleased(mutex)).toBeTruthy();
  });

  // 超时后，重复解锁，不报错
  it('timeout then unlock', async () => {
    const mutex = new SharedMutex();
    const unlockable = await transferLock(mutex, 10);
    expect(isMutexReleased(mutex)).toBeFalsy();
    vi.advanceTimersByTime(15);
    await Promise.resolve();
    expect(isMutexReleased(mutex)).toBeTruthy();
    expect(() => {
      unlockable.unlock();
      unlockable.dispose();
    }).not.toThrowError();
  });

  // 上锁，超时导致释放锁，锁转移
  it('repeatedly lock', async () => {
    const mutex = new SharedMutex();
    await transferLock(mutex, 10);
    transferLock(mutex).then(() => {
      // ...
    });
    expect(isMutexReleased(mutex)).toBeFalsy();
    vi.advanceTimersByTime(15);
    await Promise.resolve();
    expect(isMutexReleased(mutex)).toBeFalsy();
  });
});

describe('tryTransferLock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // 正常上锁并且解锁
  it('lock and unlock', () => {
    const mutex = new SharedMutex();
    const unlockable = tryTransferLock(mutex);
    expect(unlockable).not.toBeUndefined();
    expect(isMutexReleased(mutex)).toBeFalsy();
    unlockable!.unlock();
    expect(isMutexReleased(mutex)).toBeTruthy();
  });

  // 上锁，超时导致释放锁
  it('lock and timeout', async () => {
    const mutex = new SharedMutex();
    expect(tryTransferLock(mutex, 10)).not.toBeUndefined();
    expect(isMutexReleased(mutex)).toBeFalsy();
    vi.advanceTimersByTime(15);
    await Promise.resolve();
    expect(isMutexReleased(mutex)).toBeTruthy();
  });

  // 超时后，重复解锁，不报错
  it('timeout then unlock', async () => {
    const mutex = new SharedMutex();
    const unlockable = tryTransferLock(mutex, 10);
    expect(isMutexReleased(mutex)).toBeFalsy();
    vi.advanceTimersByTime(15);
    await Promise.resolve();
    expect(isMutexReleased(mutex)).toBeTruthy();
    expect(() => {
      unlockable!.unlock();
      unlockable!.dispose();
    }).not.toThrowError();
  });

  // 上锁，超时导致释放锁，锁转移
  it('repeatedly lock', async () => {
    const mutex = new SharedMutex();
    await transferLock(mutex, 10);
    expect(tryTransferLock(mutex)).toBeUndefined();
    expect(isMutexReleased(mutex)).toBeFalsy();
    vi.advanceTimersByTime(15);
    await Promise.resolve();
    expect(tryTransferLock(mutex)).not.toBeUndefined();
  });
});

describe('transferSharedLock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // 正常上锁并且解锁
  it('lock and unlock', async () => {
    const mutex = new SharedMutex();
    const unlockable = await transferSharedLock(mutex);
    expect(isMutexReleased(mutex)).toBeFalsy();
    unlockable.unlock();
    expect(isMutexReleased(mutex)).toBeTruthy();
  });

  // 上锁，超时导致释放锁
  it('lock and timeout', async () => {
    const mutex = new SharedMutex();
    await transferSharedLock(mutex, 10);
    expect(isMutexReleased(mutex)).toBeFalsy();
    vi.advanceTimersByTime(15);
    await Promise.resolve();
    expect(isMutexReleased(mutex)).toBeTruthy();
  });

  // 超时后，重复解锁，不报错
  it('timeout then unlock', async () => {
    const mutex = new SharedMutex();
    const unlockable = await transferSharedLock(mutex, 10);
    expect(isMutexReleased(mutex)).toBeFalsy();
    vi.advanceTimersByTime(15);
    await Promise.resolve();
    expect(isMutexReleased(mutex)).toBeTruthy();
    expect(() => {
      unlockable.unlock();
      unlockable.dispose();
    }).not.toThrowError();
  });

  // 上锁，超时导致释放锁，锁转移
  it('repeatedly lock', async () => {
    const mutex = new SharedMutex();
    await transferSharedLock(mutex, 10);
    transferSharedLock(mutex, 20).then(() => {
      // ...
    });
    await Promise.resolve();
    expect(isMutexReleased(mutex)).toBeFalsy();
    vi.advanceTimersByTime(15);
    await Promise.resolve();
    expect(isMutexReleased(mutex)).toBeFalsy();
    vi.advanceTimersByTime(15);
    await Promise.resolve();
    expect(isMutexReleased(mutex)).toBeTruthy();
  });
});
