import { Actuator } from './actuator';
import { TaskQueue } from './task-queue';
import { Task } from './task';
import { getCurrentTime } from './utils';
import { lvAssert } from '../../assert';

import type { IExecutor } from '../executor/executor.interface';
import { makeExecutor } from '../executor/make-executor';

declare const global: {
  navigator:
  | (Navigator & {
    scheduling?: {
      isInputPending?: () => boolean;
    };
  })
  | undefined;
};

/**
 * 调度器
 * 负责推动任务的执行，闲时和非闲时的处理
 */
export class Scheduler {
  private _isHostTimeoutScheduled: boolean = false;
  private _isHostCallbackScheduled: boolean = false;
  private _isWorking: boolean = false;
  private _enableInputPending: boolean = true;
  private readonly _executor: IExecutor = makeExecutor();

  private readonly _taskQueue: TaskQueue = new TaskQueue();
  private readonly _actuator: Actuator = new Actuator(this._taskQueue, this);

  public get taskQueue() {
    return this._taskQueue;
  }

  public get executor() {
    return this._executor;
  }

  /**
   * 是否需要让出事件给宿主
   */
  public shouldYieldToHost = (() => {
    try {
      if (global.navigator?.scheduling?.isInputPending !== undefined) {
        const { scheduling } = global.navigator;
        return (deadline: number) => {
          if (this._enableInputPending && scheduling.isInputPending!()) {
            // 当遇到inputPending时，认为需要释放时间片
            return true;
          }
          return getCurrentTime() >= deadline;
        };
      }
    } catch (e) {
      // ...
    }
    return (deadline: number) => {
      // 如果不考虑isInputPending的情况下
      // 当前时间已经超了，认为需要释放时间片，返回true
      return getCurrentTime() >= deadline;
    };
  })();

  /**
   * 设置是否开启InputPending
   */
  public setEnableInputPending(val: boolean) {
    this._enableInputPending = val;
  }

  /**
   * 调度器中添加任务
   */
  public addTask(task: Task) {
    const currentTime = getCurrentTime();
    if (task.getStartTime() > currentTime) {
      task.setSortIndex(task.getStartTime());
      this._taskQueue.timerTasks.insert(task);

      // 如果等待队列为空，延迟队列队首是该任务，进行延迟调度
      if (this._taskQueue.waitingTasks.peek() === null && task === this._taskQueue.timerTasks.peek()) {
        // 如果之前已经有延迟调度了，取消再重新延迟调度
        // 有可能之前延迟10s
        // 最新的任务只需要延迟3s
        if (this._isHostTimeoutScheduled) {
          this._executor.cancelHostTimeout();
        } else {
          this._isHostTimeoutScheduled = true;
        }
        this._executor.requestHostTimeout(this._handleHostTimeout, task.getStartTime() - currentTime);
      }
    } else {
      task.setSortIndex(task.getExpirationTime());
      this._taskQueue.waitingTasks.insert(task);

      // 如果当前没有在及时调度或者执行中，进行及时调度
      if (!this._isHostCallbackScheduled && !this._isWorking) {
        this._isHostCallbackScheduled = true;
        this._executor.requestHostCallback(this._handleHostCallback);
      }
    }
  }

  /**
   * 尝试启动异步任务调度
   */
  public requestHostTimeout(currentTime: number) {
    this._requestHostTimeout(currentTime);
  }

  private readonly _handleHostTimeout = () => {
    this._isHostTimeoutScheduled = false;
    const currentTime = getCurrentTime();
    this._taskQueue.advance(currentTime);

    if (this._isHostCallbackScheduled) {
      return;
    }

    if (this._taskQueue.waitingTasks.peek() !== null) {
      this._isHostCallbackScheduled = true;
      this._executor.requestHostCallback(this._handleHostCallback);
      return;
    }

    this._requestHostTimeout(currentTime);
  };

  private readonly _handleHostCallback = (
    hasTimeRemaining: boolean,
    initialTime: number,
    deadline: number,
  ) => {
    this._isHostCallbackScheduled = false;

    if (this._isHostTimeoutScheduled) {
      // 如果有异步任务调度中，直接取消，应该没必要了
      this._isHostTimeoutScheduled = false;
      this._executor.cancelHostTimeout();
    }

    // 进入work状态
    this._isWorking = true;
    try {
      return this._actuator.workLoop(hasTimeRemaining, initialTime, deadline);
    } finally {
      this._isWorking = false;
    }
  };

  private _requestHostTimeout(currentTime: number) {
    // 调用该函数时，一定不在及时调度和异步调度的状态中
    lvAssert(!this._isHostCallbackScheduled);
    lvAssert(!this._isHostTimeoutScheduled);
    const firstTimerTask = this._taskQueue.timerTasks.peek();
    if (firstTimerTask !== null) {
      this._isHostTimeoutScheduled = true;
      this._executor.requestHostTimeout(this._handleHostTimeout, firstTimerTask.getStartTime() - currentTime);
    }
  }
}

// 考虑到外界复杂的场景，不编译时构造，按需构造
let scheduler: Scheduler | undefined;
export function getScheduler() {
  if (!scheduler) {
    scheduler = new Scheduler();
  }
  return scheduler;
}
