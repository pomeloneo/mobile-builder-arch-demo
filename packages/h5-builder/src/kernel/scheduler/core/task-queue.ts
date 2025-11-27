import { MinHeap } from '../../structure/min-heap';
import type { Task } from './task';

function compare(lhs: Task, rhs: Task) {
  return lhs.getSortIndex() - rhs.getSortIndex();
}

/**
 * 任务存储队列
 * 本身是两个小根堆
 */
export class TaskQueue {
  // 延时任务
  private readonly _timerTasks = new MinHeap<Task>(compare);
  // 等待执行的任务
  private readonly _waitingTasks = new MinHeap<Task>(compare);

  get timerTasks() {
    return this._timerTasks;
  }

  get waitingTasks() {
    return this._waitingTasks;
  }

  advance(currentTime: number) {
    let task = this._timerTasks.peek();
    while (task !== null) {
      if (task.getCallback() === null) {
        // 任务已经取消
        this._timerTasks.remove();
      } else if (task.getStartTime() <= currentTime) {
        // 任务触发，移动到等待队列
        this._timerTasks.remove();
        task.setSortIndex(task.getExpirationTime());
        this._waitingTasks.insert(task);
      } else {
        // 剩余的异步任务pending即可
        return;
      }
      task = this._timerTasks.peek();
    }
  }
}
