import type { IDisposable } from '@/bedrock/dispose';
import { setDisposableTimeout } from '@/bedrock/dispose';
import type { SharedMutex } from './shared-mutex';

export interface IUnlockable extends IDisposable {
  unlock: () => void;
}

/**
 * 转移独占锁
 */
export async function transferLock(mutex: SharedMutex, timeout?: number): Promise<IUnlockable> {
  await mutex.lock();
  let didUnlock = false;
  let timerDisposable: IDisposable | undefined;

  if (timeout !== undefined) {
    timerDisposable = setDisposableTimeout(() => {
      if (!didUnlock) {
        mutex.unLock();
        didUnlock = true;
      }
    }, timeout);
  }

  const unlock = () => {
    timerDisposable?.dispose();
    if (!didUnlock) {
      mutex.unLock();
      didUnlock = true;
    }
  };

  return {
    dispose: unlock,
    unlock,
  };
}

/**
 * 尝试转移独占锁
 */
export function tryTransferLock(mutex: SharedMutex, timeout?: number): IUnlockable | undefined {
  if (!mutex.tryLock()) {
    return;
  }
  let didUnlock = false;
  let timerDisposable: IDisposable | undefined;

  if (timeout !== undefined) {
    timerDisposable = setDisposableTimeout(() => {
      if (!didUnlock) {
        mutex.unLock();
        didUnlock = true;
      }
    }, timeout);
  }

  const unlock = () => {
    timerDisposable?.dispose();
    if (!didUnlock) {
      mutex.unLock();
      didUnlock = true;
    }
  };

  return {
    dispose: unlock,
    unlock,
  };
}

/**
 * 转移共享锁
 */
export async function transferSharedLock(mutex: SharedMutex, timeout?: number): Promise<IUnlockable> {
  await mutex.lockShared();
  let didUnlock = false;
  let timerDisposable: IDisposable | undefined;

  if (timeout !== undefined) {
    timerDisposable = setDisposableTimeout(() => {
      if (!didUnlock) {
        mutex.unLockShared();
        didUnlock = true;
      }
    }, timeout);
  }

  const unlock = () => {
    timerDisposable?.dispose();
    if (!didUnlock) {
      mutex.unLockShared();
      didUnlock = true;
    }
  };

  return {
    dispose: unlock,
    unlock,
  };
}

/**
 * 尝试转移共享锁
 */
export function tryTransferSharedLock(mutex: SharedMutex, timeout?: number): IUnlockable | undefined {
  if (!mutex.tryLockShared()) {
    return;
  }
  let didUnlock = false;
  let timerDisposable: IDisposable | undefined;

  if (timeout !== undefined) {
    timerDisposable = setDisposableTimeout(() => {
      if (!didUnlock) {
        mutex.unLockShared();
        didUnlock = true;
      }
    }, timeout);
  }

  const unlock = () => {
    timerDisposable?.dispose();
    if (!didUnlock) {
      mutex.unLockShared();
      didUnlock = true;
    }
  };

  return {
    dispose: unlock,
    unlock,
  };
}
