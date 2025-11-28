import type { Event } from './emitter';
import type { IDisposable } from '@/bedrock/dispose';

// 辅助能力：监听事件，直到事件满足某种状况为止，此时触发 listener callback 并停止监听
// 类似 MobX 的 `when`
export function listenWhen<TArgs extends any[]>(
  event: Event<TArgs>,
  predicate: (...args: TArgs) => boolean,
): Event<TArgs> {
  return (listener, thisArgs = null) => {
    let hasBeenFulfilled = false;

    // 必须这样写，事件可能同步触发
    // eslint-disable-next-line no-undef-init
    let result: IDisposable | undefined = undefined;

    result = event((...args) => {
      if (hasBeenFulfilled) {
        result?.dispose();
        return;
      }

      // 是否条件满足
      hasBeenFulfilled = predicate(...args);

      // 如果满足条件则触发回调
      if (hasBeenFulfilled) {
        listener.call(thisArgs, ...args);
        result?.dispose();
      }
    }, null);

    // 注册事件时可能就会被触发一次？
    if (hasBeenFulfilled) {
      result.dispose();
    }

    return result;
  };
}
