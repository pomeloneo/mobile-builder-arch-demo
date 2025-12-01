// defer相关
export type { Deferred } from './promise';
export { defer } from './promise';

// 包装后可dispose的promise能力
export type { CancelablePromise } from './promise';
export { makeCancelablePromise } from './promise';

// 并发执行一组promise
export { parallelPromise } from './promise';

// 让一个promise设置超时时间
export { makePromiseWithTimeout } from './promise';

// 生成一个等待AbortSignal的promise
export { waitForAbortSignal } from './promise';
