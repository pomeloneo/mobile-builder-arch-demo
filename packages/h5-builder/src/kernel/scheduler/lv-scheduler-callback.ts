import { type IDisposable } from '../dispose';
import { getScheduler } from './core/scheduler';
import type { IOptions, IScheduledCallback, PriorityLevel } from './type';
import { makeTask } from './core/utils';
import { CallbackToken } from './callback-token';

export interface ILvCallbackToken extends IDisposable {
  /**
   * 更新优先级
   */
  updatePriorityLevel: (priorityLevel: PriorityLevel) => void;
}

export function lvSchedulerCallback(callback: IScheduledCallback, options: IOptions = {}): ILvCallbackToken {
  const newTask = makeTask(callback, options);
  getScheduler().addTask(newTask);

  return new CallbackToken(newTask);
}
