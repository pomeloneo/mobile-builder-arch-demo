import type { Event } from './emitter';
import { Emitter } from './emitter';
import { listenOnce } from './once';
import { listenWhen } from './when';
import { asyncUnexpectedError, ignoreUnexpectedError, syncUnexpectedError } from './error-handler';

interface IChangeData {
  code: number;
  msg: string;
}

class Foo {
  readonly onChange: Event<[IChangeData]>;
  private readonly _onChangeEmitter: Emitter<[IChangeData]>;

  constructor(errorHandler = asyncUnexpectedError) {
    this._onChangeEmitter = new Emitter({
      onListenerError: errorHandler,
    });
    this.onChange = this._onChangeEmitter.event;
  }

  fire() {
    this._onChangeEmitter.fire({
      code: 0,
      msg: '',
    });
  }
}

class Foo2 {
  readonly onChange: Event<[number, string]>;
  private readonly _onChangeEmitter: Emitter<[number, string]> = new Emitter();

  constructor() {
    this.onChange = this._onChangeEmitter.event;
  }

  fire() {
    this._onChangeEmitter.fire(100, 'hello');
  }

  fireCustom(...args: [number, string]) {
    this._onChangeEmitter.fire(...args);
  }
}

describe('Emitter', () => {
  test('Listen and unlisten event', () => {
    const foo = new Foo();
    let count = 0;
    const disposable = foo.onChange(() => {
      count++;
    });

    foo.fire();
    foo.fire();
    expect(count).toBe(2);

    disposable.dispose();
    foo.fire();
    foo.fire();
    expect(count).toBe(2);
  });

  test('Listen, unlisten, and re-listen event', () => {
    const foo = new Foo();
    let count = 0;

    const disposable1 = foo.onChange(() => {
      count++;
    });
    // Initially has one listener, can trigger normally
    foo.fire();
    expect(count).toBe(1);

    const disposable2 = foo.onChange(() => {
      count++;
    });
    // Now has two listeners, can still trigger normally
    foo.fire();
    expect(count).toBe(3);

    disposable1.dispose();
    // One listener removed, back to one listener, can still trigger normally
    foo.fire();
    expect(count).toBe(4);

    disposable2.dispose();
    // No listeners left, won't trigger
    foo.fire();
    expect(count).toBe(4);
  });

  test('listen to event only once', () => {
    const foo = new Foo();
    let count = 0;
    listenOnce(foo.onChange)(() => {
      count++;
    });

    foo.fire();
    foo.fire();
    expect(count).toBe(1);
  });

  test('listenWhen should only fire once when the predicate returns true', () => {
    const foo2 = new Foo2();
    let result = 0;
    let count = 0;

    listenWhen(foo2.onChange, (num) => {
      return num === 200;
    })((num) => {
      count++;
      result = num;
    });

    foo2.fire();
    foo2.fireCustom(200, 'Yes');
    foo2.fire();

    expect(count).toBe(1);
    expect(result).toBe(200);
  });

  test('multiple parameters', () => {
    const foo = new Foo2();
    let code;
    let msg;
    foo.onChange((c, m) => {
      code = c;
      msg = m;
    });
    foo.fire();

    expect(code).toBe(100);
    expect(msg).toBe('hello');
  });
});

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  test('async error', () => {
    const foo = new Foo();
    let count = 0;
    foo.onChange(() => {
      throw new Error('error');
    });
    foo.onChange(() => {
      count++;
    });

    foo.fire();
    expect(count).toBe(1);
  });

  test('sync error', () => {
    const foo = new Foo(syncUnexpectedError);
    let count = 0;
    foo.onChange(() => {
      throw new Error('error');
    });
    foo.onChange(() => {
      count++;
    });

    expect(() => foo.fire()).toThrowError();
    expect(count).toBe(0);
  });

  test('ignore error', () => {
    const foo = new Foo(ignoreUnexpectedError);
    let count = 0;
    foo.onChange(() => {
      throw new Error('error');
    });
    foo.onChange(() => {
      count++;
    });

    foo.fire();
    expect(count).toBe(1);
  });
});
