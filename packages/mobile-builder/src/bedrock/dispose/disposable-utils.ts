import { SafeDisposable, TransferDisposable } from './disposable-t';
import { EmptyDispose, type IDisposable } from './dispose-base';
import { MARK_AS_LEAKED } from './tracker';

export function makeSafeDisposable(fn: (...args: any) => any) {
  const disposable = new SafeDisposable({
    dispose: fn,
  });
  return disposable;
}

export function makeEmptyDisposable() {
  return EmptyDispose;
}

// 忽略dispose
export function ignoreDispose(x: IDisposable) {
  MARK_AS_LEAKED(x);
}

// 判断一个thing是否是disposable
export function isDisposable<E = any>(thing: E): thing is E & IDisposable {
  return typeof (thing as IDisposable).dispose === 'function' && (thing as IDisposable).dispose.length === 0;
}

export function makeTransferDisposable<T extends IDisposable>(val: T) {
  return new TransferDisposable(val);
}
