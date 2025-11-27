import type { IDisposable } from '@/dispose';
import type { Event } from './emitter';

export interface IMakeShortcutEvent<T> {
  (val: T): Event<[T]>;
}

export function makeSyncShortcutEvent<T>(val: T) {
  return function (callback: (val: T) => void): IDisposable {
    callback(val);
 
    return {
      dispose() {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
      },
    };
  };
}

export function makeAsyncShortcutEvent<T>(val: T) {
  return function (callback: (val: T) => void): IDisposable {
    const handle = setTimeout(() => {
      callback(val);
    }, 0);

    return {
      dispose() {
        clearTimeout(handle);
      },
    };
  };
}

