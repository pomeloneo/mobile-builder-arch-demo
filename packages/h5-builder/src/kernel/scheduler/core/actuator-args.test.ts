import { Actuator } from './actuator';
import { getScheduler } from './scheduler';
import { Task } from './task';
import { getCurrentTime } from './utils';

const scheduler = getScheduler();

describe('Callback Arguments', () => {
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

    vi.useFakeTimers();
  });

  // 已经超出过期时间
  // didUserCallbackTimeout返回true
  // remainingTime返回10
  test('arguments1', async () => {
    skipYieldCount = 1;
    const fn = vi.fn();
    let currentTime = getCurrentTime();
    const task = new Task(fn, currentTime, currentTime + 10);
    scheduler.taskQueue.timerTasks.insert(task);
    const actuator = new Actuator(scheduler.taskQueue, scheduler);
    vi.advanceTimersByTime(10);
    await Promise.resolve();

    currentTime = getCurrentTime();
    expect(actuator.workLoop(true, currentTime, currentTime + 16)).toBeFalsy();
    expect(fn).toBeCalled();
    expect(fn.mock.calls[0][1]).toBeTruthy();
    expect(fn.mock.calls[0][2]).toBe(16);
  });
});
