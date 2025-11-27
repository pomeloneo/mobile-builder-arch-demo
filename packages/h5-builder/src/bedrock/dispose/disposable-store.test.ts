import { DisposableStore } from './disposable-store';
import { Disposable } from './disposable-t';

class Foo extends Disposable {
  private readonly _mockFunc: () => void;

  constructor(mockFunc: () => void) {
    super();
    this._mockFunc = mockFunc;
  }

  dispose() {
    this._mockFunc();
    super.dispose();
  }
}

describe('dispose store', () => {
  it('dispose success', () => {
    const mockDispose1 = vi.fn();
    const mockDispose2 = vi.fn();

    const instance = new DisposableStore();
    expect(instance.isDisposed).toBe(false);

    instance.add(new Foo(mockDispose1));
    instance.add(new Foo(mockDispose2));
    instance.dispose();

    expect(mockDispose1).toBeCalled();
    expect(mockDispose2).toBeCalled();
    expect(instance.isDisposed).toBe(true);
  });

  it('clear success', () => {
    const mockDispose1 = vi.fn();
    const mockDispose2 = vi.fn();

    const instance = new DisposableStore();
    expect(instance.isDisposed).toBe(false);

    instance.add(new Foo(mockDispose1));
    instance.add(new Foo(mockDispose2));
    instance.clear();

    expect(mockDispose1).toBeCalled();
    expect(mockDispose2).toBeCalled();
    expect(instance.isDisposed).toBe(false);
  });

  it('add self error', () => {
    const instance = new DisposableStore();
    expect(() => {
      instance.add(instance);
    }).toThrow('Cannot register a disposable on itself.');
  });
});
