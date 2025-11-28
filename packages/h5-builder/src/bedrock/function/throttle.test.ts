/* eslint-disable max-lines-per-function */
import { sleep } from '../async';
import { throttle } from './throttle';

describe('Throttle', () => {
  test('should throttle a function', async () => {
    let callCount = 0;
    const throttled = throttle(() => {
      callCount++;
    }, 32);

    throttled();
    throttled();
    throttled();

    const lastCount = callCount;
    expect(callCount).toBeGreaterThan(0);

    await sleep(64);
    expect(callCount).toBeGreaterThan(lastCount);
  });

  test('subsequent calls should return the result of the first call', async () => {    
    const identity = (x: string) => x;
    const throttled = throttle(identity, 32);
    const results = [throttled('a'), throttled('b')];

    expect(results).toEqual(['a', 'a']);

    await sleep(64);

    const newResults = [throttled('c'), throttled('d')];
    expect(newResults[0]).not.toBe('a');
    expect(newResults[0]).not.toBeUndefined();

    expect(newResults[1]).not.toBe('d');
    expect(newResults[1]).not.toBeUndefined();
  });

  test('should clear timeout when func is called', async () => {
    let callCount = 0;

    const throttled = throttle(() => {
      callCount++;
    }, 32);

    throttled();
    throttled();

    await sleep(64);

    expect(callCount).toBe(2);
  });

  test('should not trigger a trailing call when invoked once', async () => {
    let callCount = 0;
    const throttled = throttle(() => {
      callCount++;
    }, 32);

    throttled();
    expect(callCount).toBe(1);

    await sleep(64);

    expect(callCount).toBe(1);
  });

  test('should trigger a second throttled call as soon as possible', async () => {
    expect.assertions(3);

    let callCount = 0;
    const throttled = throttle(() => {
      callCount++;
    }, 128, { leading: false });

    throttled();

    await sleep(192);
    expect(callCount).toBe(1);
    throttled();

    await sleep(254 - 192);
    expect(callCount).toBe(1);

    await sleep(384 - 254);
    expect(callCount).toBe(2);
  });

  test('should apply default options', async () => {
    let callCount = 0;
    const throttled = throttle(() => {
      callCount++;
    }, 32, {});

    throttled();
    throttled();
    expect(callCount).toBe(1);

    await sleep(128);
    expect(callCount).toBe(2);
  });

  test('should support a leading option', () => {
    const identity = (x: string) => x; // 确保identity函数定义已存在

    // 含leading选项的throttle
    const withLeading = throttle(identity, 32, { leading: true });
    expect(withLeading('a')).toBe('a');

    // 不含leading选项的throttle
    const withoutLeading = throttle(identity, 32, { leading: false });
    expect(withoutLeading('a')).toBeUndefined();
  });

  test('should support a trailing option', async () => {    
    const withCount = vi.fn();
    const withoutCount = vi.fn();

    const withTrailing = throttle((value) => {
      withCount();
      return value;
    }, 64, { trailing: true });

    const withoutTrailing = throttle((value) => {
      withoutCount();
      return value;
    }, 64, { trailing: false });

    expect(withTrailing('a')).toBe('a');
    expect(withTrailing('b')).toBe('a');

    expect(withoutTrailing('a')).toBe('a');
    expect(withoutTrailing('b')).toBe('a');

    await sleep(256);

    expect(withCount.mock.calls.length).toBe(2);
    expect(withoutCount.mock.calls.length).toBe(1);
  });

  test('should not update lastCalled, at the end of the timeout, when trailing is false', async () => {
    expect.assertions(1);

    let callCount = 0;
    
    const throttled = throttle(() => {
      callCount++;
    }, 64, { trailing: false });

    throttled();
    throttled();

    setTimeout(() => {
      throttled();
      throttled();
    }, 96);

    await sleep(192);

    expect(callCount).toBeGreaterThan(1);
  });

  test('should work with a system time of 0', async () => {    
    let callCount = 0;
    const throttled = throttle((value) => {
      callCount++;
      return value;
    }, 32);

    const results = [throttled('a'), throttled('b'), throttled('c')];
    expect(results).toEqual(['a', 'a', 'a']);
    expect(callCount).toBe(1);

    await sleep(64);

    expect(callCount).toBe(2);
  });
});
