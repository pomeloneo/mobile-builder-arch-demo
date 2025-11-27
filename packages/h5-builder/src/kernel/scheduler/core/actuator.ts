import { ChunkScheduler } from './chunk-scheduler';
import type { Scheduler } from './scheduler';
import type { TaskQueue } from './task-queue';
import { getCurrentTime } from './utils';

export class Actuator {
  constructor(
    private readonly _taskQueue: TaskQueue,
    private readonly _scheduler: Scheduler,
  ) {}

  workLoop(hasTimeRemaining: boolean, initialTime: number, deadline: number): boolean {
    let currentTime = initialTime;
    this._taskQueue.advance(currentTime);
    let currentTask = this._taskQueue.waitingTasks.peek();

    while (currentTask !== null) {
      // 暂停执行需要满足的条件（1，2同时满足）
      // 1. 不能超时了，超时的任务一定会执行
      // 2. 没有剩余时间了，或者调度器认为需要释放资源
      if (
        currentTask.getExpirationTime() > currentTime &&
        (!hasTimeRemaining || this._scheduler.shouldYieldToHost(deadline))
      ) {
        break;
      }

      if (currentTask.getCallback() === undefined) {
        // 任务取消了
        this._taskQueue.waitingTasks.remove();
      } else {
        const callback = currentTask.getCallback()!;
        const didUserCallbackTimeout = currentTask.getExpirationTime() <= currentTime;
        const remainingTime = deadline - currentTime;
        currentTask.clearCallback();

        const chunkInvoker = new ChunkScheduler(currentTask, this._scheduler);
        callback(chunkInvoker, didUserCallbackTimeout, remainingTime);

        if (!chunkInvoker.needContinue) {
          this._taskQueue.waitingTasks.remove();
        }

        currentTime = getCurrentTime();
        this._taskQueue.advance(currentTime);
      }

      currentTask = this._taskQueue.waitingTasks.peek();
    }

    if (currentTask !== null) {
      return true;
    }
    // 如果等待队列结束了，要启动异步调度了
    this._scheduler.requestHostTimeout(currentTime);
    return false;
  }
}
