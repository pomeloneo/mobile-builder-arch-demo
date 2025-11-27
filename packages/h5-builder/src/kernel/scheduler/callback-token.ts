import type { IDisposable } from '../dispose';
import { Task } from './core/task';
import { getTimeout, makeTask } from './core/utils';
import { getScheduler } from './core/scheduler';
import type { PriorityLevel } from './type';

export class CallbackToken implements IDisposable {
  constructor(private _task: Task) {}

  dispose() {
    this._task.clearCallback();
  }

  updatePriorityLevel(priorityLevel: PriorityLevel) {
    const callback = this._task.getCallback();
    if (!callback) {
      return;
    }
    this._task.clearCallback();
    const newTask = makeTask(callback, {
      priorityLevel,
    });
    const startTime = this._task.getStartTime();
    const timeout = getTimeout(priorityLevel);
    const expirationTime = startTime + timeout;
    newTask.setStartTime(startTime);
    newTask.setExpirationTime(expirationTime);
    getScheduler().addTask(newTask);
    this._task = newTask;
  }
}
