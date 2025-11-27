import { type Mock } from 'vitest';
import { defer, type Deferred } from '@/bedrock/promise';
import { AsyncQueue } from './queue';

const nextTick = () => {
  return new Promise<void>((res) => {
    setTimeout(() => {
      res();
    }, 0);
  });
};

const getTask = (): [() => Promise<void>, Deferred<void>, () => Mock<any, any>] => {
  const defer1 = defer();
  const mockFn1 = vi.fn();

  return [
    async () => {
      mockFn1();
      await defer1.promise;
    },
    defer1,
    mockFn1,
  ];
};

describe('AsyncQueue', () => {
  test('base', async () => {
    const queue = new AsyncQueue({
      concurrent: 1,
    });

    const [fn1, defer1, mockFn1] = getTask();
    queue.addTask(fn1);

    const [fn2, defer2, mockFn2] = getTask();
    queue.addTask(fn2);

    expect(mockFn1).toBeCalled();
    expect(mockFn2).not.toBeCalled();

    defer1.resolve();
    await nextTick();

    expect(mockFn2).toBeCalled();
  });

  test('base 2', async () => {
    const queue = new AsyncQueue({
      concurrent: 2,
    });

    const [fn1, defer1, mockFn1] = getTask();
    queue.addTask(fn1);

    const [fn2, defer2, mockFn2] = getTask();
    queue.addTask(fn2);

    const [fn3, defer3, mockFn3] = getTask();
    queue.addTask(fn3);

    expect(mockFn1).toBeCalled();
    expect(mockFn2).toBeCalled();
    expect(mockFn3).not.toBeCalled();

    defer1.resolve();
    await nextTick();
    expect(mockFn3).toBeCalled();
  });
});
