/* eslint-disable max-lines-per-function */
import { Task } from './task';
import { getScheduler } from './scheduler';
import { getCurrentTime } from './utils';

class MockMessageChannel {
  port1: any = {};
  port2: any = {};

  constructor() {
    this.port1.onmessage = null;
    this.port2.postMessage = (data: any) => {
      if (this.port1.onmessage) {
        setTimeout(() => {
          this.port1.onmessage({ data });
        }, 0);
      }
    };
  }
}
global.MessageChannel = MockMessageChannel as any;

const scheduler = getScheduler();

function pending(timeMs: number) {
  const now = getCurrentTime();
  vi.useRealTimers();
  const fakeNow = now + timeMs;
  vi.useFakeTimers({ now: fakeNow });
}

describe('Scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    scheduler.taskQueue.waitingTasks.clear();
    scheduler.taskQueue.timerTasks.clear();
  });

  // 添加单个及时任务
  it('add callback task1', () => {
    const data: number[] = [];
    const time = getCurrentTime();
    const task = new Task(
      vi.fn(() => {
        data.push(1);
      }),
      time,
      time + 10,
    );
    scheduler.addTask(task);

    vi.advanceTimersByTime(10);

    expect(data).toStrictEqual([1]);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(0);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(0);
  });

  // 添加多个及时任务，顺序不变
  it('add callback task2', () => {
    const data: number[] = [];
    const time = getCurrentTime();
    const task1 = new Task(
      vi.fn(() => {
        data.push(1);
      }),
      time,
      time + 10,
    );
    const task2 = new Task(
      vi.fn(() => {
        data.push(2);
      }),
      time,
      time + 15,
    );
    scheduler.addTask(task1);
    scheduler.addTask(task2);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(2);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(0);

    vi.advanceTimersByTime(10);

    expect(data).toStrictEqual([1, 2]);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(0);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(0);
  });

  // 添加多个及时任务，触发插队
  it('add callback task3', () => {
    const data: number[] = [];
    const time = getCurrentTime();
    const task1 = new Task(
      vi.fn(() => {
        data.push(1);
      }),
      time,
      time + 10,
    );
    scheduler.addTask(task1);

    const task2 = new Task(
      vi.fn(() => {
        data.push(2);
      }),
      time,
      time + 5,
    );
    scheduler.addTask(task2);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(2);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(0);

    vi.advanceTimersByTime(10);

    expect(data).toStrictEqual([2, 1]);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(0);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(0);
  });

  // 添加多个及时任务，分两次执行
  it('add callback task4', () => {
    const data: number[] = [];
    const time = getCurrentTime();
    const task1 = new Task(
      vi.fn(() => {
        pending(20);
        data.push(1);
      }),
      time,
      time + 10,
    );
    const task2 = new Task(
      vi.fn(() => {
        data.push(2);
      }),
      time,
      time + 30,
    );
    scheduler.addTask(task1);
    scheduler.addTask(task2);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(2);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(0);

    vi.advanceTimersByTime(5);

    expect(data).toStrictEqual([1]);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(1);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(0);

    vi.advanceTimersByTime(10);

    expect(data).toStrictEqual([1, 2]);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(0);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(0);
  });

  // 添加单个延迟任务
  it('add timeout task1', () => {
    const data: number[] = [];
    const time = getCurrentTime();
    const task = new Task(
      vi.fn(() => {
        data.push(1);
      }),
      time + 100,
      time + 20,
    );
    scheduler.addTask(task);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(1);

    vi.advanceTimersByTime(10);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(1);
    expect(data).toStrictEqual([]);

    vi.advanceTimersByTime(200);
    expect(data).toStrictEqual([1]);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(0);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(0);
  });

  // 添加多个延迟任务
  it('add timeout task2', () => {
    const data: number[] = [];
    const time = getCurrentTime();
    const task1 = new Task(
      vi.fn(() => {
        data.push(1);
      }),
      time + 10,
      time + 20,
    );
    const task2 = new Task(
      vi.fn(() => {
        data.push(2);
      }),
      time + 10,
      time + 20,
    );
    scheduler.addTask(task1);
    scheduler.addTask(task2);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(0);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(2);

    vi.advanceTimersByTime(100);

    expect(data).toStrictEqual([1, 2]);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(0);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(0);
  });

  // 添加多个延迟任务，顺序变化
  it('add timeout task3', () => {
    const data: number[] = [];
    const time = getCurrentTime();
    const task1 = new Task(
      vi.fn(() => {
        data.push(1);
      }),
      time + 10,
      time + 20,
    );
    const task2 = new Task(
      vi.fn(() => {
        data.push(2);
      }),
      time + 10,
      time + 10,
    );
    scheduler.addTask(task1);
    scheduler.addTask(task2);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(0);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(2);

    vi.advanceTimersByTime(100);

    expect(data).toStrictEqual([2, 1]);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(0);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(0);
  });

  // 添加多个延迟任务，分两次执行
  it('add timeout task4', () => {
    const data: number[] = [];
    const time = getCurrentTime();
    const task1 = new Task(
      vi.fn(() => {
        data.push(1);
      }),
      time + 10,
      time + 20,
    );
    const task2 = new Task(
      vi.fn(() => {
        data.push(2);
      }),
      time + 100,
      time + 120,
    );
    scheduler.addTask(task1);
    scheduler.addTask(task2);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(0);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(2);

    vi.advanceTimersByTime(30);
    expect(data).toStrictEqual([1]);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(1);

    vi.advanceTimersByTime(200);

    expect(data).toStrictEqual([1, 2]);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(0);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(0);
  });

  // 添加及时任务与延迟任务
  it('add mix task1', () => {
    const data: number[] = [];
    const time = getCurrentTime();
    const task1 = new Task(
      vi.fn(() => {
        data.push(1);
      }),
      time,
      time + 10,
    );
    const task2 = new Task(
      vi.fn(() => {
        data.push(2);
      }),
      time + 10,
      time + 20,
    );
    scheduler.addTask(task1);
    scheduler.addTask(task2);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(1);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(1);

    vi.advanceTimersByTime(50);

    expect(data).toStrictEqual([1, 2]);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(0);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(0);
  });

  // 添加及时任务与延迟任务，延迟任务会插队
  it('add mix task2', () => {
    const data: number[] = [];
    const time = getCurrentTime();
    const task1 = new Task(
      vi.fn(() => {
        pending(20);
        data.push(1);
      }),
      time,
      time + 10,
    );
    const task2 = new Task(
      vi.fn(() => {
        data.push(2);
      }),
      time,
      time + 30,
    );
    const task3 = new Task(
      vi.fn(() => {
        data.push(3);
      }),
      time + 10,
      time + 20,
    );
    scheduler.addTask(task1);
    scheduler.addTask(task2);
    scheduler.addTask(task3);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(2);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(1);

    // 因为要触发两次scheduler的requestHostCallback，用fakeTime就得这么写
    vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(0);

    expect(data).toStrictEqual([1, 3, 2]);
    expect(scheduler.taskQueue.waitingTasks.size()).toBe(0);
    expect(scheduler.taskQueue.timerTasks.size()).toBe(0);
  });
});
