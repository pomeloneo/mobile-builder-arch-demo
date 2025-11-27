import { Task } from './task';
import { TaskQueue } from './task-queue';

describe('TaskQueue', () => {
  // 保留在异步队列中
  test('advance1', () => {
    const taskQueue = new TaskQueue();
    const fn = vi.fn();
    const task1 = new Task(fn, 10, 30);
    const task2 = new Task(fn, 20, 40);
    taskQueue.timerTasks.insert(task1);
    taskQueue.timerTasks.insert(task2);
    taskQueue.advance(0);

    expect(taskQueue.waitingTasks.size()).toBe(0);
    expect(taskQueue.timerTasks.size()).toBe(2);
  });

  // 一个延时任务进入到等待任务队列
  test('advance2', () => {
    const taskQueue = new TaskQueue();
    const fn = vi.fn();
    const task1 = new Task(fn, 10, 30);
    const task2 = new Task(fn, 20, 40);
    taskQueue.timerTasks.insert(task1);
    taskQueue.timerTasks.insert(task2);
    taskQueue.advance(15);

    expect(taskQueue.waitingTasks.size()).toBe(1);
    const task = taskQueue.waitingTasks.peek()!;
    expect(task).not.toBeUndefined();
    expect(task.getCallback()).toBe(fn);
    expect(task.getExpirationTime()).toBe(30);
    expect(task.getSortIndex()).toBe(30);

    expect(taskQueue.timerTasks.size()).toBe(1);
  });

  // 所有延时任务进入到等待任务队列，保持顺序
  test('advance3', () => {
    const taskQueue = new TaskQueue();
    const fn = vi.fn();
    const task1 = new Task(fn, 10, 30);
    const task2 = new Task(fn, 20, 40);
    taskQueue.timerTasks.insert(task1);
    taskQueue.timerTasks.insert(task2);
    taskQueue.advance(25);

    expect(taskQueue.waitingTasks.size()).toBe(2);
    const task = taskQueue.waitingTasks.peek()!;
    expect(task).not.toBeUndefined();
    expect(task.getCallback()).toBe(fn);
    expect(task.getExpirationTime()).toBe(30);
    expect(task.getSortIndex()).toBe(30);

    expect(taskQueue.timerTasks.size()).toBe(0);
  });

  // 所有延时任务进入到等待任务队列，保持顺序
  test('advance4', () => {
    const taskQueue = new TaskQueue();
    const fn = vi.fn();
    const task1 = new Task(fn, 10, 50);
    const task2 = new Task(fn, 20, 40);
    taskQueue.timerTasks.insert(task1);
    taskQueue.timerTasks.insert(task2);
    taskQueue.advance(25);

    expect(taskQueue.waitingTasks.size()).toBe(2);
    const task = taskQueue.waitingTasks.peek()!;
    expect(task).not.toBeUndefined();
    expect(task.getCallback()).toBe(fn);
    expect(task.getExpirationTime()).toBe(40);
    expect(task.getSortIndex()).toBe(40);

    expect(taskQueue.timerTasks.size()).toBe(0);
  });
});
