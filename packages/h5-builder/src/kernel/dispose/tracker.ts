import { Logger } from '@/kernel/_internal/logger';
import type { IDisposable } from './dispose-base';
import { EmptyDispose } from './dispose-base';

export interface IDisposableTracker {
  trackDisposable: (disposable: IDisposable) => void;

  setParent: (child: IDisposable, parent: IDisposable | null) => void;

  markAsDisposed: (disposable: IDisposable) => void;

  markAsLeaked: (disposable: IDisposable) => void;
}

let disposableTracker: IDisposableTracker | null = null;

function makeDefaultTracker() {
  // reactHooks useEffect中出现disposable，我们默认为不会泄漏
  // 默认使用者一定会在useEffect的返回值中进行dispose
  const ignorePattern = /commitHookEffectList/i;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const __is_disposable_tracked__ = '__is_disposable_tracked__';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const __is_leak_marked__ = '__is_leak_marked__';
  return new (class implements IDisposableTracker {
    trackDisposable(x: IDisposable): void {
      const stack = new Error('Potentially leaked disposable').stack!;
      setTimeout(() => {
        if (stack.match(ignorePattern)) {
          return;
        }
        if ((x as any)[__is_leak_marked__]) {
          return;
        }
        if (!(x as any)[__is_disposable_tracked__]) {
          Logger.log(stack);
        }
      }, 3000);
    }

    setParent(child: IDisposable, parent: IDisposable | null): void {
      if (child && child !== EmptyDispose) {
        try {
          (child as any)[__is_disposable_tracked__] = true;
        } catch {
          // noop
        }
      }
    }

    markAsDisposed(disposable: IDisposable): void {
      if (disposable && disposable !== EmptyDispose) {
        try {
          (disposable as any)[__is_disposable_tracked__] = true;
        } catch {
          // noop
        }
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    markAsLeaked(disposable: IDisposable): void {
      if (disposable && disposable !== EmptyDispose) {
        try {
          (disposable as any)[__is_leak_marked__] = true;
        } catch {
          // noop
        }
      }
    }
  })();
}

function setDisposableTracker(tracker: IDisposableTracker | null): void {
  disposableTracker = tracker;
}

export function enableTrack(tracker: IDisposableTracker = makeDefaultTracker()) {
  setDisposableTracker(tracker);
}

export function disableTrack() {
  setDisposableTracker(null);
}

// 辅助能力 跟踪disposable
export function TRACK_DISPOSABLE<T extends IDisposable>(x: T): T {
  disposableTracker?.trackDisposable(x);
  return x;
}

// 辅助能力 标记disposable成功
export function MARK_AS_DISPOSED<T extends IDisposable>(x: T): void {
  disposableTracker?.markAsDisposed(x);
}

// 辅助能力 标记disposable关系
export function SET_PARENT_OF_DISPOSABLE(child: IDisposable, parent: IDisposable | null): void {
  disposableTracker?.setParent(child, parent);
}

// 辅助能力 主动标记泄漏
export function MARK_AS_LEAKED<T extends IDisposable>(x: T) {
  disposableTracker?.markAsLeaked(x);
}
