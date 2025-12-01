import {
  makeOkWith,
  type IBizErrorOr,
  cancelledError,
  GenericError,
  timeoutError,
  type IBizErrorRef,
  makeOk,
  isBizErrorRef,
} from '../error';
import type { ICancellationToken } from '../async';
import { CancellationTokenSource } from '../async';

/**
 * 一般来说Promise常用的场景有：
 * 1. 单次异步调用（new Promise）
 * 2. 批量promise调用（Promise.all）
 * 3. promise竞速调用（Promise.race）
 *
 * 但是原生能力有如下的缺陷
 * 1. 不支持取消某一次promise调用
 * 2. 不支持错误语义，promise.catch的重视程度比try catch还低
 * 3. 超时行为需要基于race封装
 *
 * 针对这三点，基建侧提供了高阶的promise能力
 * 1. makeCancelablePromise 返回一个可取消的promise
 * const promise = makeCancelablePromise(() => { ... });
 * promise.then((res) => {
 *   // res是一个IBizErrorRef对象
 * });
 * // 可以直接取消promise
 * promise.cancel();
 *
 * 2. parallelPromise 并发执行promise，会自动观测IBizErrorRef语义
 * 当单个promise出现错误返回时，promise执行失败，尽可能调用所有cancelablePromise
 * 当单个promise出现reject时，promise执行失败，尽可能调用所有cancelablePromise，并且将reject继续上抛
 *
 * 3. makePromiseWithTimeout 让promise支持超时，可以提供默认值
 *
 * ——————————————————
 * Promise.allSettled和Promise.any在实际使用中场景较少，暂不提供错误语义包装
 */

//
// 可以cancel的promise对象
//
export interface CancelablePromise<T> extends Promise<T> {
  cancel: () => void;
}

/**
 * 快速生成一个CancelablePromise对象
 */
export function makeCancelablePromise<T>(
  callback: (token: ICancellationToken) => Promise<T | IBizErrorOr<T>>,
): CancelablePromise<IBizErrorOr<T>> {
  const source = new CancellationTokenSource();
  const thenable = callback(source.token);
  const promise = new Promise<IBizErrorOr<T>>((resolve, reject) => {
    const subscription = source.token.onCancellationRequested(() => {
      subscription.dispose();
      source.dispose();
      resolve(cancelledError());
    });
    Promise.resolve(thenable).then(
      (value) => {
        subscription.dispose();
        source.dispose();
        if (isBizErrorRef(value)) {
          resolve(value);
        } else {
          resolve(makeOkWith(value as T));
        }
      },
      (err) => {
        subscription.dispose();
        source.dispose();
        reject(err);
      },
    );
  });
  return new (class {
    cancel() {
      source.cancel();
    }
    then<TResult1 = T, TResult2 = never>(
      resolve?: ((value: IBizErrorOr<T>) => TResult1 | Promise<TResult1>) | undefined | null,
      reject?: ((reason: any) => TResult2 | Promise<TResult2>) | undefined | null,
    ): Promise<TResult1 | TResult2> {
      return promise.then(resolve, reject);
    }
    catch<TResult = never>(
      reject?: ((reason: any) => TResult | Promise<TResult>) | undefined | null,
    ): Promise<T | TResult> {
      return this.then(undefined, reject);
    }
    finally(onfinally?: (() => void) | undefined | null): Promise<IBizErrorOr<T>> {
      return promise.finally(onfinally);
    }
  })() as CancelablePromise<IBizErrorOr<T>>;
}

/**
 * 并行执行promise，当某一个失败，本次调用失败
 * 本质上和Promise.all差不多，相比较之下
 * 1. 包装了错误语义判断
 * 2. 当失败时，会尽可能尝试cancel其他promise
 *
 * 注意：某一个promise失败时，会尽可能尝试调用其他promise的cancel，但不保证一定有效
 * （有可能promiseA已经成功，但是primiseB在之后失败了）
 */
export function parallelPromise(promiseList: Promise<any>[]): Promise<IBizErrorRef> {
  if (promiseList.length === 0) {
    return Promise.resolve(makeOk());
  }

  let todo = promiseList.length;
  const finish = () => {
    todo = -1;
    for (const promise of promiseList) {
      (promise as Partial<CancelablePromise<any>>).cancel?.();
    }
  };

  return new Promise<IBizErrorRef>((resolve, reject) => {
    for (const promise of promiseList) {
      promise
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        .then((res) => {
          if (isBizErrorRef(res) && !res.ok) {
            finish();
            resolve(res as IBizErrorRef);
            return;
          }
          todo--;
          if (todo === 0) {
            resolve(makeOk());
          }
        })
        .catch((err) => {
          finish();
          reject(err);
        });
    }
  });
}

/**
 * 包装一个promise，提供超时能力
 */
export function makePromiseWithTimeout<T>(
  callback: (token: ICancellationToken) => Promise<T | IBizErrorOr<T>>,
  timeout: number,
  defaultValue?: T, // 当发生超时时，提供的默认值
): Promise<IBizErrorOr<T>> {
  const cancellable = makeCancelablePromise<T>(callback);
  const timer = setTimeout(() => {
    cancellable.cancel();
  }, timeout);
  return cancellable.then((res: IBizErrorOr<T>) => {
    clearTimeout(timer);
    if (res.ok) {
      return res;
    }
    // 如果是被取消，触发了超时
    if (res.code === GenericError.Cancelled) {
      if (defaultValue !== undefined) {
        // 希望返回默认值
        return makeOkWith(defaultValue);
      }
      return timeoutError();
    } else {
      // 遇到其他错误时透传错误
      return res;
    }
  });
}

// 如果 proposal-promise-with-resolvers 通过了，那么这个函数就可以去掉了
// https://github.com/microsoft/TypeScript/blob/1d96eb489e559f4f61522edb3c8b5987bbe948af/src/harness/util.ts#L115
export interface Deferred<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  promise: Promise<T>;
}

export function defer<T = void>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { resolve, reject, promise };
}

export function waitForAbortSignal(signal: AbortSignal) {
  const { promise, reject } = defer<never>();

  if (signal.aborted) {
    reject(signal.reason);
  }

  const handleAbort = () => {
    reject(signal.reason);
    signal.removeEventListener('abort', handleAbort);
  };

  signal.addEventListener('abort', handleAbort);

  return promise;
}
