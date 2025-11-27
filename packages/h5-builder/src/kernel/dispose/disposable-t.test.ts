import { makeSafeDisposable, makeTransferDisposable } from './disposable-utils';
import {
  Disposable,
  MutableDisposable,
  RefCountedDisposable,
  SafeDisposable,
  TransferDisposable,
} from './disposable-t';
import type { IDisposable } from './dispose-base';

class Bar extends Disposable {
  constructor(mockFunc: () => void) {
    super();
    this._register(makeSafeDisposable(mockFunc));
  }
}

class Foo extends Disposable {
  constructor(mockFunc: () => void) {
    super();
    this._register(makeSafeDisposable(mockFunc));
  }
}

class Test extends Disposable {
  constructor(value: IDisposable) {
    super();
    this._register(value);
  }
}

describe('mutable disposable', () => {
  it('set value', () => {
    const barMock = vi.fn();
    const fooMock = vi.fn();
    const mutable = new MutableDisposable();
    mutable.value = new Bar(barMock);
    mutable.value = new Foo(barMock);
    expect(barMock).toHaveBeenCalled();
    expect(fooMock).not.toHaveBeenCalled();
  });

  it('clear', () => {
    const barMock = vi.fn();
    const mutable = new MutableDisposable(new Bar(barMock));
    mutable.clear();
    expect(barMock).toHaveBeenCalled();
  });

  it('release', () => {
    const barMock = vi.fn();
    const fooMock = vi.fn();
    const mutable = new MutableDisposable();
    mutable.value = new Bar(barMock);
    mutable.release();
    mutable.value = new Foo(barMock);
    // 因为调用的是release，所以没有触发dispose
    expect(barMock).not.toHaveBeenCalled();
    expect(fooMock).not.toHaveBeenCalled();
  });

  it('dispose', () => {
    const barMock = vi.fn();
    const mutable = new MutableDisposable();
    mutable.value = new Bar(barMock);
    mutable.dispose();
    expect(barMock).toHaveBeenCalled();
  });
});

describe('safe disposable', () => {
  it('dispose', () => {
    const barMock = vi.fn();
    const safe = new SafeDisposable(new Bar(barMock));
    safe.dispose();
    safe.dispose();
    expect(barMock).toHaveBeenCalledTimes(1);
  });
});

describe('RefCountedDisposable', () => {
  it('test', () => {
    const fnMock = vi.fn();
    const disposable = makeSafeDisposable(fnMock);
    const refCounted = new RefCountedDisposable(new Test(disposable));
    refCounted.acquire();

    refCounted.release();
    expect(fnMock).toHaveBeenCalledTimes(0);
    refCounted.dispose();
    expect(fnMock).toHaveBeenCalledTimes(1);
  });
});

describe('TransferDisposable', () => {
  class FooInternal implements IDisposable {
    public count = 0;

    dispose() {
      this.count++;
    }
  }

  class BarInternal implements IDisposable {
    private readonly _foo: FooInternal;

    constructor(foo: TransferDisposable<FooInternal>) {
      this._foo = foo.release();
    }

    dispose() {
      this._foo.dispose();
    }
  }

  it('transfer', () => {
    const foo = new FooInternal();
    const bar = new BarInternal(makeTransferDisposable(foo));

    bar.dispose();
    expect(foo.count).toBe(1);
  });
});
