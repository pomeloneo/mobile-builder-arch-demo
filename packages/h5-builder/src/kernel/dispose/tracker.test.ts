import { Disposable } from './disposable-t';
import { makeSafeDisposable } from './disposable-utils';
import { disableTrack, enableTrack } from './tracker';
import type { IDisposableTracker } from './tracker';
import type { IDisposable } from './dispose-base';

vi.useFakeTimers();
vi.spyOn(global, 'setTimeout');

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
  it('tracker success', () => {
    let count = 0;
    enableTrack(
      new (class implements IDisposableTracker {
        trackDisposable(x: IDisposable): void {
          count++;
        }

        setParent(child: IDisposable, parent: IDisposable | null): void {
          count--;
        }

        markAsDisposed(disposable: IDisposable): void {
          count--;
        }
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        markAsLeaked(disposable: IDisposable): void {}
      })(),
    );
    new Foo(vi.fn());
    // 只剩下根节点
    expect(count).toBe(1);
    disableTrack();
  });
});
