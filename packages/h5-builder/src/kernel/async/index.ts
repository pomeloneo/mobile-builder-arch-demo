// 异步任务可取消的token
export type { ICancellationToken } from './cancellation';
// 异步任务可取消的源
export { CancellationTokenSource } from './cancellation';

// 通用的wait函数，提供异步等待能力
export { wait, sleep } from './wait';

// 提供调用 open 后 resolve promise 的能力
export { Barrier } from './barrier';
export { makeBarrierByPromise } from './barrier';

// 提供异步队列控制器
export { AsyncQueue } from './queue/queue';
export type { IAsyncTask } from './queue/task';

// 下一次eventloop再执行方法
export { invokeNextLoop } from './utils';
