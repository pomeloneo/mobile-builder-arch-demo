import { makeProxy } from './proxy-builder';
import { IdleValue } from './idle-value';

vi.useFakeTimers();
vi.spyOn(global, 'setTimeout');
vi.spyOn(global, 'clearTimeout');

class Foo {
  private _data = 100;
  private readonly _mockFn: () => void;
  value = 'public value.';

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

describe('proxy builder', () => {
  it('proxy success', () => {
    const fn = vi.fn();
    const wrapper = new IdleValue<Foo>(() => new Foo(fn));
    const proxy = makeProxy<Foo>(wrapper, Foo);
    // 属性正常
    expect(proxy.value).toBe('public value.');
    // setter/getter 正常
    expect(proxy.data).toBe(100);
    proxy.data = 200;
    expect(proxy.data).toBe(200);
    // 调用方法正常
    proxy.test();
    expect(fn).toBeCalled();
  });
});
