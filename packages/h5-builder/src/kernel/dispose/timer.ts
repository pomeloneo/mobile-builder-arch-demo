import type { IDisposable } from './dispose-base';
import { makeSafeDisposable } from './disposable-utils';

export function setDisposableTimeout(fn: (...args: any[]) => void, timeout: number): IDisposable {
  const handle = setTimeout(() => {
    fn();
  }, timeout);
  return makeSafeDisposable(() => clearTimeout(handle));
}

export function setDisposableInterval(fn: (...args: any[]) => void, timeout: number): IDisposable {
  const handle = setInterval(() => {
    fn();
  }, timeout);
  return makeSafeDisposable(() => clearInterval(handle));
}
