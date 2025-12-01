import { makeSafeDisposable } from '@/bedrock/dispose';

export function invokeNextLoop(fn: (...args: any[]) => void) {
  const handle = setTimeout(() => {
    fn();
  }, 0);
  return makeSafeDisposable(() => clearTimeout(handle));
}
