/**
 * 异步任务队列
 */
import { Disposable } from '@/kernel/dispose';
import { AsyncTask, type IAsyncTask } from './task';
import type { ICancellationToken } from '../cancellation';

type IAsyncQueue = {
  /** 队列的任务并发数 */
  concurrent: number;
};

export class AsyncQueue extends Disposable {
  private readonly _queue: AsyncTask[] = [];
  private readonly _maxConcurrent: number = 1;
  private _execCounter: number = 0;

  constructor(options: IAsyncQueue) {
    super();
    // 初始化最大并发数
    this._maxConcurrent = options.concurrent;
  }

  /** 添加一个异步任务到队列 */
  addTask(
    callback: (cancellation: ICancellationToken) => Promise<void>,
    cancellationToken?: ICancellationToken,
  ): IAsyncTask {
    if (cancellationToken?.isCancellationRequested) {
      return new AsyncTask(null);
    }
    const task = new AsyncTask(callback);
    // 将任务函数加入队列
    this._queue.push(this._store.add(task));
    // 尝试执行下一个任务
    this._next();

    return task;
  }

  // 执行下一个任务，如果当前并发数小于最大并发数，并且队列不为空，则从队列中取出一个任务并执行，否则什么都不做
  private _next() {
    if (this._queue.length && this._execCounter < this._maxConcurrent && this._queue.length > 0) {
      // 取出队列中的第一个任务函数，并从队列中移除它
      const task = this._queue.shift()!;
      // 增加当前并发数
      this._execCounter++;
      // 执行任务函数，并处理其返回的promise对象
      task.safeExec().finally(() => {
        // 不管成功还是失败，都要减少当前并发数，并执行下一个任务（递归调用）
        this._execCounter--;
        this._next();
      });
    }
  }
}
