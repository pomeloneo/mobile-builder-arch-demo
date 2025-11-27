import { createDecorator } from './base';
import { SyncDescriptor } from './descriptor';
import { getService, InstantiationService } from './instantiation-service';
import { IInstantiationService } from './instantiation-service.interface';
import { ServiceRegistry } from './service-registry';

let serviceRegistry: ServiceRegistry;

const IA = createDecorator<A>('a');
const IB = createDecorator<B>('b');
const IC = createDecorator<C>('c');
const IX = createDecorator<X>('x');
const IY = createDecorator<Y>('y');

class Y {
  _serviceBrand: undefined;
  name = 'Y';
}

class X {
  _serviceBrand: undefined;
  name = 'X';
  y: Y;

  constructor(@IY y: Y) {
    this.y = y;
  }
}

class C {
  _serviceBrand: undefined;
  name = 'C';
  x: X;

  constructor(@IX x: X) {
    this.x = x;
  }
}

class B {
  _serviceBrand: undefined;
  name = 'B';
  c: C;

  constructor(@IC c: C) {
    this.c = c;
  }
}

class A {
  _serviceBrand: undefined;
  name = 'A';
  b: B;
  x: X;

  constructor(@IB b: B, @IX x: X) {
    this.b = b;
    this.x = x;
  }
}

describe('createInstance fail', () => {
  beforeEach(() => {
    serviceRegistry = new ServiceRegistry();
  });

  // 出现重复创建服务
  // Bar -> Foo
  // 当时Foo在创建过程中，动态的创建了Bar
  it('repeat', () => {
    const IFoo = createDecorator<Foo>('foo');
    const IBar = createDecorator<Bar>('bar');

    interface IFoo {
      _serviceBrand: undefined;
      name: string;
    }

    class Bar {
      _serviceBrand: undefined;
      name = 'Bar';
      foo: IFoo;

      constructor(@IFoo foo: IFoo) {
        this.foo = foo;
      }
    }
    serviceRegistry.register(IBar, Bar);

    class Foo implements IFoo {
      _serviceBrand: undefined;
      name = 'Foo';
      instantiationService: IInstantiationService;

      constructor(@IInstantiationService instantiationService: IInstantiationService) {
        this.instantiationService = instantiationService;
        instantiationService.createInstance(Bar);
      }
    }
    serviceRegistry.register(IFoo, Foo);

    const instantiationService = new InstantiationService(serviceRegistry.makeCollection());

    expect(() => {
      instantiationService.createInstance(Bar);
    }).toThrow(`illegal state - RECURSIVELY instantiating service 'foo'`);
  });

  // 服务创建过程中出现环
  // Bar -> Foo -> Bar
  it('has cyclicDependency', () => {
    const IFoo = createDecorator<Foo>('foo');
    const IBar = createDecorator<Bar>('bar');

    interface IFoo {
      _serviceBrand: undefined;
      name: string;
    }

    interface IBar {
      _serviceBrand: undefined;
      name: string;
    }

    class Foo implements IFoo {
      _serviceBrand: undefined;
      name = 'Foo';
      bar: IBar;

      constructor(@IBar bar: IBar) {
        this.bar = bar;
      }
    }
    serviceRegistry.register(IFoo, Foo);

    class Bar implements IBar {
      _serviceBrand: undefined;
      name = 'Bar';
      foo: IFoo;

      constructor(@IFoo foo: IFoo) {
        this.foo = foo;
      }
    }
    serviceRegistry.register(IBar, Bar);

    const instantiationService = new InstantiationService(serviceRegistry.makeCollection());
    expect(() => {
      instantiationService.createInstance(Bar);
    }).toThrow('foo -> bar -> foo');
  });

  // 依赖的服务没有注册
  it('service unregister', () => {
    serviceRegistry.register(IX, X);

    const instantiationService = new InstantiationService(serviceRegistry.makeCollection());
    expect(() => {
      instantiationService.createInstance(X);
    }).toThrow('[createInstance] X depends on UNKNOWN service y.');
  });
});

describe('createInstance success1', () => {
  beforeEach(() => {
    serviceRegistry = new ServiceRegistry();
  });

  // 没有依赖
  it('no dependency', () => {
    serviceRegistry.register(IY, Y);
    const instantiationService = new InstantiationService(serviceRegistry.makeCollection());
    let y: undefined | Y;
    expect(() => {
      y = instantiationService.createInstance(Y);
    }).not.toThrow('Cannot register a disposable on itself.');
    expect(y).not.toBeUndefined();
    expect(y!.name).toBe('Y');
  });
});

describe('createInstance success2', () => {
  beforeEach(() => {
    serviceRegistry = new ServiceRegistry();
  });

  // 存在依赖
  // X -> Y
  it('has dependency', () => {
    serviceRegistry.register(IX, X);
    serviceRegistry.register(IY, Y);

    const instantiationService = new InstantiationService(serviceRegistry.makeCollection());
    let x: undefined | X;
    expect(() => {
      x = instantiationService.createInstance(X);
    }).not.toThrow('Cannot register a disposable on itself.');
    expect(x).not.toBeUndefined();
    expect(x!.name).toBe('X');
    expect(x!.y.name).toBe('Y');
  });

  // 较为复杂的依赖情况
  // A -> B -> C -> X -> Y
  // A -> X -> Y
  it('has dependency2', () => {
    serviceRegistry.register(IA, A);
    serviceRegistry.register(IB, B);
    serviceRegistry.register(IC, C);
    serviceRegistry.register(IX, X);
    serviceRegistry.register(IY, Y);

    const instantiationService = new InstantiationService(serviceRegistry.makeCollection());
    let a: undefined | A;
    expect(() => {
      a = instantiationService.createInstance(A);
    }).not.toThrowError();
    expect(a).not.toBeUndefined();
    expect(a!.name).toBe('A');
    expect(a!.b.name).toBe('B');
    expect(a!.b.c.name).toBe('C');
    expect(a!.b.c.x.name).toBe('X');
    expect(a!.b.c.x.y.name).toBe('Y');
    expect(a!.x.name).toBe('X');
    expect(a!.x.y.name).toBe('Y');
  });

  // 底层依赖了上层
  // J(child) -> B(parent)
  it('has dependency3', () => {
    serviceRegistry.register(IY, Y);
    const instantiationService = new InstantiationService(serviceRegistry.makeCollection());

    const IJ = createDecorator<J>('j');

    class J {
      _serviceBrand: undefined;
      name = 'J';
      y: Y;

      constructor(@IY y: Y) {
        this.y = y;
      }
    }
    const childRegister = new ServiceRegistry();
    childRegister.register(IJ, J);
    const childInstantiationService = instantiationService.createChild(childRegister.makeCollection());
    let j: undefined | J;
    expect(() => {
      j = childInstantiationService.createInstance(J);
    }).not.toThrowError();
    expect(j).not.toBeUndefined();
    expect(j!.name).toBe('J');
    expect(j!.y.name).toBe('Y');
  });
});

describe('createInstance success3', () => {
  beforeEach(() => {
    serviceRegistry = new ServiceRegistry();
  });

  // 支持静态参数，动态参数，注入的服务参数
  it('arguments', () => {
    class Foo {
      _serviceBrand: undefined;
      name = 'Foo';
    }
    const IFoo = createDecorator<Foo>('foo');
    serviceRegistry.register(IFoo, Foo);

    class Bar {
      _serviceBrand: undefined;
      name = 'Bar';
      foo: Foo;
      a1: number;
      a2: string;

      constructor(a1: number, a2: string, @IFoo foo: Foo) {
        this.a1 = a1;
        this.a2 = a2;
        this.foo = foo;
      }
    }
    const IBar = createDecorator<Bar>('bar');
    const descriptor = new SyncDescriptor(Bar, [100]);
    serviceRegistry.register(IBar, descriptor);

    const instantiationService = new InstantiationService(serviceRegistry.makeCollection());
    let bar: undefined | Bar;
    expect(() => {
      bar = instantiationService.createInstance(descriptor, '123');
    }).not.toThrow('Cannot register a disposable on itself.');
    expect(bar).not.toBeUndefined();
    expect(bar!.foo.name).toBe('Foo');
    expect(bar!.a1).toBe(100);
    expect(bar!.a2).toBe('123');
  });
});

describe('get service success', () => {
  beforeEach(() => {
    serviceRegistry = new ServiceRegistry();
  });

  it('get', () => {
    const IFoo = createDecorator<Foo>('foo');
    const IBar = createDecorator<Bar>('bar');

    interface IFoo {
      _serviceBrand: undefined;
      name: string;
    }

    class Bar {
      _serviceBrand: undefined;
      name = 'Bar';
      foo: IFoo;

      constructor(@IFoo foo: IFoo) {
        this.foo = foo;
      }
    }
    serviceRegistry.register(IBar, Bar);

    class Foo implements IFoo {
      _serviceBrand: undefined;
      name = 'Foo';
    }
    const foo = new Foo();
    serviceRegistry.registerInstance(IFoo, foo);

    const instantiationService = new InstantiationService(serviceRegistry.makeCollection());
    expect(getService(instantiationService, IBar)).not.toBeUndefined();
    expect(getService(instantiationService, IFoo)).toBe(foo);
  });
});
