import { Disposable } from './disposable-t';
import { makeSafeDisposable } from './disposable-utils';
import { disposeWithLog } from './logger';
import type { IDisposableLogger } from './logger';

class Bar extends Disposable {
  constructor() {
    super();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this._register(makeSafeDisposable(() => {}));
  }
}

class Foo extends Disposable {
  constructor(mockFunc: () => void) {
    super();
    this._register(new Bar());
    this._register(makeSafeDisposable(mockFunc));
  }
}

describe('dispose store', () => {
  it('log success', () => {
    /* eslint-disable no-console */
    console.log = vi.fn();
    const mockDispose = vi.fn();
    const foo1 = new Foo(mockDispose);
    // 默认log
    disposeWithLog(foo1);
    /* eslint-disable no-console */
    expect(console.log).toHaveBeenCalledTimes(1);
    /* eslint-disable no-console */
    expect(console.log).toHaveBeenLastCalledWith([
      ['Foo', 'DisposableStore'],
      ['DisposableStore', 'Bar'],
      ['DisposableStore', 'SafeDisposable'],
      ['Bar', 'DisposableStore'],
      ['DisposableStore', 'SafeDisposable'],
    ]);

    // 自定义log
    const foo2 = new Foo(mockDispose);
    const branchMock = vi.fn();
    const endMock = vi.fn();
    disposeWithLog(
      foo2,
      new (class implements IDisposableLogger {
        branch(from: string, to: string) {
          branchMock(from, to);
        }

        end() {
          endMock();
        }
      })(),
    );
    expect(branchMock).toHaveBeenCalledTimes(5);
    expect(branchMock).toHaveBeenNthCalledWith(1, 'Foo', 'DisposableStore');
    expect(branchMock).toHaveBeenNthCalledWith(2, 'DisposableStore', 'Bar');
    expect(branchMock).toHaveBeenNthCalledWith(3, 'DisposableStore', 'SafeDisposable');
    expect(branchMock).toHaveBeenNthCalledWith(4, 'Bar', 'DisposableStore');
    expect(branchMock).toHaveBeenNthCalledWith(5, 'DisposableStore', 'SafeDisposable');
    expect(endMock).toHaveBeenCalled();
  });
});
