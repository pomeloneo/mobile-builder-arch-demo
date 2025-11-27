import { Task } from './task';

describe('Task', () => {
  test('initialize', () => {
    const callback = vi.fn();
    const task = new Task(callback, 10, 20);
    expect(task.getCallback()).toBe(callback);
    expect(task.getStartTime()).toBe(10);
    expect(task.getExpirationTime()).toBe(20);
    expect(task.getSortIndex()).toBe(-1);
  });

  test('setCallback1', () => {
    const callback = vi.fn();
    const task = new Task(callback, 10, 20);
    const callback2 = vi.fn();
    expect(() => {
      task.setCallback(callback2);
    }).toThrowError();
  });

  test('setCallback2', () => {
    const callback = vi.fn();
    const task = new Task(callback, 10, 20);
    task.clearCallback();
    expect(task.getCallback()).toBeUndefined();

    const callback2 = vi.fn();
    expect(() => {
      task.setCallback(callback2);
    }).not.toThrowError();
    expect(task.getCallback()).toBe(callback2);
  });
});
