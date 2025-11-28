/* eslint-disable max-lines-per-function */
import { sleep } from '../async';
import { debounce } from './debounce';

describe('Debounce', () => {
  test('should debounce a function', async () => {
    let callCount = 0;

    const debounced = debounce(function (value) {
      ++callCount;
      return value;
    }, 32);

    const results = [debounced('a'), debounced('b'), debounced('c')];
    expect(results).toEqual([undefined, undefined, undefined]);
    expect(callCount).toBe(0);

    setTimeout(() => {
      expect(callCount).toBe(1);

      const results = [debounced('d'), debounced('e'), debounced('f')];
      expect(results).toEqual(['c', 'c', 'c']);
      expect(callCount).toBe(1);
    }, 128);

    await sleep(256);
    expect(callCount).toBe(2);
  });

  test('subsequent debounced calls return the last func result', async () => {
    const identity = (x: string) => x;
    const debounced = debounce(identity, 32);
    debounced('a');

    setTimeout(() => {
      expect(debounced('b')).not.toBe('b');
    }, 64);

    await sleep(128);
    expect(debounced('c')).not.toBe('c');
  });

  test('should not immediately call func when wait is 0', async () => {
    let callCount = 0;
    const debounced = debounce(() => {
      ++callCount;
    }, 0);

    debounced();
    debounced();
    expect(callCount).toBe(0);

    await sleep(5);
    expect(callCount).toBe(1);
  });

  test('should apply default options', async () => {
    let callCount = 0;
    const debounced = debounce(
      () => {
        callCount++;
      },
      32,
      {},
    );

    debounced();
    expect(callCount).toBe(0);

    await sleep(64);
    expect(callCount).toBe(1);
  });

  test('should support a leading option', async () => {
    const callCounts = [0, 0];

    const withLeading = debounce(
      () => {
        callCounts[0]++;
      },
      32,
      { leading: true },
    );

    const withLeadingAndTrailing = debounce(
      () => {
        callCounts[1]++;
      },
      32,
      { leading: true, trailing: true },
    );

    withLeading();
    expect(callCounts[0]).toBe(1);

    withLeadingAndTrailing();
    withLeadingAndTrailing();
    expect(callCounts[1]).toBe(1);

    await sleep(64);
    expect(callCounts).toEqual([1, 2]);

    withLeading();
    expect(callCounts[0]).toBe(2);
  });

  test('subsequent leading debounced calls return the last func result', async () => {
    const debounced = debounce((x: string) => x, 32, { leading: true, trailing: false });
    const results = [debounced('a'), debounced('b')];

    expect(results).toEqual(['a', 'a']);

    await sleep(64);
    const results2 = [debounced('c'), debounced('d')];
    expect(results2).toEqual(['c', 'c']);
  });

  test('should support a trailing option', async () => {
    let withCount = 0;
    let withoutCount = 0;

    const withTrailing = debounce(
      () => {
        withCount++;
      },
      32,
      { trailing: true },
    );

    const withoutTrailing = debounce(
      () => {
        withoutCount++;
      },
      32,
      { trailing: false },
    );

    withTrailing();
    expect(withCount).toBe(0);

    withoutTrailing();
    expect(withoutCount).toBe(0);

    await sleep(64);
    expect(withCount).toBe(1);
    expect(withoutCount).toBe(0);
  });

  test('should support a maxWait option', async () => {
    let callCount = 0;

    const debounced = debounce(
      () => {
        callCount++;
      },
      32,
      { maxWait: 64 },
    );

    debounced();
    debounced();
    expect(callCount).toBe(0);

    // 超过原来的 maxWait 时间，不足下一个
    await sleep(128);
    expect(callCount).toBe(1); // maxWait 时间后应该调用过一次
    debounced();
    debounced();
    expect(callCount).toBe(1); // 紧接着调用不会立即触发因为还在 maxWait 窗口内

    // 确保超过第二个 maxWait 时间
    await sleep(128);
    expect(callCount).toBe(2); // 经过足够时间后，第二次 maxWait 达成，调用发生
  });

  test('should support maxWait in a tight loop', async () => {
    const limit = 320;
    let withCount = 0;
    let withoutCount = 0;

    const withMaxWait = debounce(
      () => {
        withCount++;
      },
      64,
      { maxWait: 128 },
    );

    const withoutMaxWait = debounce(() => {
      withoutCount++;
    }, 96);

    const start = Date.now();
    while (Date.now() - start < limit) {
      withMaxWait();
      withoutMaxWait();
    }

    const actual = [Boolean(withoutCount), Boolean(withCount)];
    await sleep(1);
    expect(actual).toEqual([false, true]);
  });

  test('should queue a trailing call for subsequent debounced calls after maxWait', async () => {
    let callCount = 0;

    const debounced = debounce(
      () => {
        callCount++;
      },
      200,
      { maxWait: 200 },
    );

    debounced(); // 第一次立即调用

    setTimeout(debounced, 190); // 在 maxWait 之前调用
    setTimeout(debounced, 200); // 正在 maxWait 边缘调用
    setTimeout(debounced, 210); // 刚过 maxWait 时调用

    // 等待足够时间以确保所有的debounce逻辑完成
    await sleep(500);
    expect(callCount).toBe(2); // 预期在 200 ms 后的某个时点触发了第二次调用
  });

  test('should cancel maxDelayed when delayed is invoked', async () => {
    let callCount = 0;

    const debounced = debounce(
      () => {
        callCount++;
      },
      32,
      { maxWait: 64 },
    );

    debounced(); // 第一次立即调用

    setTimeout(() => {
      debounced(); // 第二次调用应该重置 maxWait 计时器
      expect(callCount).toBe(1); // 检查到目前为止该函数被调用的次数
    }, 128);

    // 等待足够时间以确保所有的debounce逻辑完成
    await sleep(256);
    expect(callCount).toBe(2); // 最后，确认函数被调用了两次
  });

  test('should invoke the trailing call with the correct arguments and this binding', async () => {
    let actual: any;
    let callCount = 0;
    const object = {};

    const debounced = debounce(
      function (value) {
        actual = [this];
        actual.push(value);
        return ++callCount !== 2;
      },
      32,
      { leading: true, maxWait: 64 },
    );

    while (true) {
      if (!debounced.call(object, 'a')) {
        break;
      }
    }

    await sleep(64);
    expect(callCount).toBe(2);
    expect(actual).toEqual([object, 'a']);
  });
});
