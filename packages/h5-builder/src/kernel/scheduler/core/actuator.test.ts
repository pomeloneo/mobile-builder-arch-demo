import { Actuator } from './actuator';
import { getScheduler } from './scheduler';
import { Task } from './task';
import { getCurrentTime } from './utils';

const scheduler = getScheduler();

describe('Actuator', () => {
  let skipYieldCount: number = 0;
  beforeAll(() => {
    // mock该方法，否则不方便测试
    scheduler.shouldYieldToHost = vi.fn(() => {
      if (skipYieldCount > 0) {
        skipYieldCount--;
        return false;
      }
      return true;
    });
  });

  beforeEach(() => {
    scheduler.taskQueue.waitingTasks.clear();
    scheduler.taskQueue.timerTasks.clear();
  });

  // 等待队列为空
  test('workLoop1', () => {
    skipYieldCount = 1;
    const actuator = new Actuator(scheduler.taskQueue, scheduler);
    expect(actuator.workLoop(true, 0, 5)).toBeFalsy();
  });

  // 等待队列有内容
  test('workLoop2', () => {
    skipYieldCount = 1;
    const fn = vi.fn();
    const task = new Task(fn, 0, getCurrentTime() + 1000);
    scheduler.taskQueue.waitingTasks.insert(task);
    const actuator = new Actuator(scheduler.taskQueue, scheduler);

    expect(actuator.workLoop(true, 0, 5)).toBeFalsy();
    expect(fn).toBeCalled();
  });

  // 等待队列有内容，执行后还有内容
  test('workLoop3', () => {
    skipYieldCount = 1;
    const fn = vi.fn();
    const task1 = new Task(fn, 0, getCurrentTime() + 1000);
    const task2 = new Task(fn, 0, getCurrentTime() + 1000);
    scheduler.taskQueue.waitingTasks.insert(task1);
    scheduler.taskQueue.waitingTasks.insert(task2);
    const actuator = new Actuator(scheduler.taskQueue, scheduler);

    expect(actuator.workLoop(true, 0, 5)).toBeTruthy();
    expect(fn).toBeCalledTimes(1);
  });

  // 延时队列有内容，需要执行
  test('workLoop4', () => {
    skipYieldCount = 1;
    const fn = vi.fn();
    const task = new Task(fn, 0, getCurrentTime() + 1000);
    scheduler.taskQueue.timerTasks.insert(task);
    const actuator = new Actuator(scheduler.taskQueue, scheduler);

    expect(actuator.workLoop(true, 0, 5)).toBeFalsy();
    expect(fn).toBeCalled();
  });

  // 延时队列有内容，暂时无需执行
  test('workLoop5', () => {
    skipYieldCount = 1;
    const fn = vi.fn();
    const task = new Task(fn, 10, getCurrentTime() + 1000);
    scheduler.taskQueue.timerTasks.insert(task);
    const actuator = new Actuator(scheduler.taskQueue, scheduler);

    expect(actuator.workLoop(true, 0, 5)).toBeFalsy();
    expect(fn).not.toBeCalled();
  });
});
