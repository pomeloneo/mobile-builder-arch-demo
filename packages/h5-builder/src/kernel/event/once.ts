import type { Event } from './emitter';
import type { IDisposable } from '@/dispose';

// 辅助能力：只监听某个事件一次
export function listenOnce<TArgs extends any[]>(event: Event<TArgs>): Event<TArgs> {
  return (listener, thisArgs = null) => {
    let didFire = false;
    // 必须这样写，事件可能同步触发
    // eslint-disable-next-line no-undef-init
    let result: IDisposable | undefined = undefined;
    result = event((...args) => {
      if (didFire) {
        return;
      } else if (result) {
        result.dispose();
      } else {
        didFire = true;
      }

      return listener.call(thisArgs, ...args);
    }, null);

    if (didFire) {
      result.dispose();
    }

    return result;
  };
}
