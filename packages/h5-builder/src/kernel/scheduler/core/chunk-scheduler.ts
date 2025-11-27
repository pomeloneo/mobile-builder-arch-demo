import type { Scheduler } from './scheduler';
import { Task } from './task';
import { type IChunkScheduler, type IScheduledCallback, type IOptions } from '../type';
import { makeTask } from './utils';

export class ChunkScheduler implements IChunkScheduler {
  private _needContinue: boolean = false;

  constructor(
    private readonly _task: Task,
    private readonly _scheduler: Scheduler,
  ) {}

  get needContinue() {
    return this._needContinue;
  }

  continueExecute(callback: IScheduledCallback) {
    this._needContinue = true;
    // 该task还需要延续执行，更新一些信息
    this._task.setCallback(callback);
  }

  execute(callback: IScheduledCallback, options: IOptions = {}) {
    const newTask = makeTask(callback, options);
    this._scheduler.addTask(newTask);
  }
}
