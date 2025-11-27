import { ChunkScheduler } from './chunk-scheduler';
import { getScheduler } from './scheduler';
import { Task } from './task';

const scheduler = getScheduler();

describe('ChunkScheduler', () => {
  beforeEach(() => {
    scheduler.taskQueue.waitingTasks.clear();
    scheduler.taskQueue.timerTasks.clear();
  });

  // 续上task执行
  test('continueExecute1', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const task = new Task(fn1, 10, 30);
    scheduler.taskQueue.waitingTasks.insert(task);
    task.clearCallback();

    const chunkScheduler = new ChunkScheduler(task, scheduler);
    chunkScheduler.continueExecute(fn2);

    expect(scheduler.taskQueue.waitingTasks.size()).toBe(1);
    expect(task.getCallback()).toBe(fn2);
  });

  // task没有执行完，就进行continue，报错
  test('continueExecute2', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const task = new Task(fn1, 10, 30);
    scheduler.taskQueue.waitingTasks.insert(task);

    const chunkScheduler = new ChunkScheduler(task, scheduler);
    expect(() => {
      chunkScheduler.continueExecute(fn2);
    }).toThrowError();
  });

  // task正常执行
  test('execute', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const task = new Task(fn1, 10, 30);
    scheduler.taskQueue.waitingTasks.insert(task);
    task.clearCallback();

    const chunkScheduler = new ChunkScheduler(task, scheduler);
    chunkScheduler.execute(fn2);

    expect(scheduler.taskQueue.waitingTasks.size()).toBe(2);
  });
});
