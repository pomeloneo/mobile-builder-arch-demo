import { makeSafeDisposable } from './disposable-utils';

describe('dispose store', () => {
  it('tracker success', () => {
    const mock = vi.fn();
    const safeDisposable = makeSafeDisposable(mock);
    // 正常dispose
    safeDisposable.dispose();
    expect(mock).toHaveBeenCalled();

    // 只会真正dispose一次
    safeDisposable.dispose();
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
