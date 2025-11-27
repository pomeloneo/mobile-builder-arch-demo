import { sleep } from '@/kernel/async';
import { IdleValue } from './idle-value';

class Foo {
  value = 'public value.';

  private _data = 100;
  private readonly _mockFn: () => void;

  constructor(mockFn: () => void) {
    this._mockFn = mockFn;
  }

  get data() {
    return this._data;
  }

  set data(value: number) {
    this._data = value;
  }

  test() {
    this._mockFn();
  }
}

describe('idle value', () => {
  it('initializes during idle time', async () => {
    const fn = vi.fn();
    const wrapper = new IdleValue<Foo>(() => new Foo(fn));
    // Not initialized immediately
    expect(wrapper.isInitialized).toBe(false);

    expect(fn).not.toBeCalled();
    expect(wrapper.isInitialized).toBe(false);

    await sleep(500);

    // Must have been initialized asynchronously
    expect(wrapper.isInitialized).toBe(true);

    // Properties work normally
    expect(wrapper.value.value).toBe('public value.');
    // Setters/getters work normally
    expect(wrapper.value.data).toBe(100);
    wrapper.value.data = 200;
    expect(wrapper.value.data).toBe(200);
    // Method calls work normally
    wrapper.value.test();
    expect(fn).toBeCalled();
  });

  it('initializes immediately due to usage', () => {
    const fn = vi.fn();
    const wrapper = new IdleValue<Foo>(() => new Foo(fn));
    // Not initialized immediately
    expect(wrapper.isInitialized).toBe(false);

    // Properties work normally
    expect(wrapper.value.value).toBe('public value.');
    // Setters/getters work normally
    expect(wrapper.value.data).toBe(100);
    wrapper.value.data = 200;
    expect(wrapper.value.data).toBe(200);
    // Method calls work normally
    wrapper.value.test();
    expect(fn).toBeCalled();

    // Initialized because value was accessed
    expect(wrapper.isInitialized).toBe(true);
    // await sleep(500);
  });
});
