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

/**
 * 测试类继承场景下的依赖注入行为
 * 
 * 这个测试套件验证了一个重要的设计约束：
 * 当基类构造函数声明了依赖注入参数时，子类必须显式声明并传递这些参数。
 * 
 * DI 系统不会自动将基类的依赖传递给子类，原因：
 * 1. TypeScript 类型系统要求子类在 super() 调用时传递所有基类参数
 * 2. @Decorator 装饰器只在当前类的构造函数上存储依赖信息，不会递归到基类
 * 3. getServiceDependencies(ctor) 只读取当前类的依赖，确保依赖关系明确可追踪
 */
describe('class inheritance with DI', () => {
  beforeEach(() => {
    serviceRegistry = new ServiceRegistry();
  });

  it('child class must explicitly declare and pass base class dependencies', () => {
    // 定义一个测试服务
    const ITestService = createDecorator<TestService>('TestService');

    class TestService {
      _serviceBrand: undefined;
      name = 'TestService';
    }
    serviceRegistry.register(ITestService, TestService);

    // 基类 - 在构造函数中声明依赖
    class BaseClass {
      constructor(
        public id: string,
        @ITestService public testService: TestService
      ) { }
    }

    // 子类 - 必须显式声明依赖并传递给基类
    class ChildClass extends BaseClass {
      constructor(
        id: string,
        @ITestService testService: TestService  // ✅ 必须显式声明
      ) {
        super(id, testService);  // ✅ 必须显式传递
      }
    }

    const instantiationService = new InstantiationService(serviceRegistry.makeCollection());

    // 测试：子类可以正确实例化，依赖被正确注入
    let child: ChildClass | undefined;
    expect(() => {
      child = instantiationService.createInstance(ChildClass, 'test-id');
    }).not.toThrow();

    expect(child).not.toBeUndefined();
    expect(child!.id).toBe('test-id');
    expect(child!.testService).not.toBeUndefined();
    expect(child!.testService.name).toBe('TestService');
  });

  it('demonstrates why base class DI does not work without explicit child declaration', () => {
    // 这个测试展示了为什么基类依赖不能自动传递
    const ITestService = createDecorator<TestService>('TestService');

    class TestService {
      _serviceBrand: undefined;
      name = 'TestService';
    }
    serviceRegistry.register(ITestService, TestService);

    class BaseClass {
      constructor(
        public id: string,
        @ITestService public testService: TestService
      ) { }
    }

    // 如果子类不声明依赖，DI 系统无法知道需要注入什么
    // 因为 getServiceDependencies(ChildClassNoDeps) 返回空数组
    class ChildClassNoDeps extends BaseClass {
      constructor(id: string) {
        // TypeScript 编译器会报错：Expected 2 arguments, but got 1
        // 即使我们绕过编译器，运行时也会因为 testService 为 undefined 而出错
        super(id, undefined as any);
      }
    }

    const instantiationService = new InstantiationService(serviceRegistry.makeCollection());

    // 创建实例会成功（因为 ChildClassNoDeps 没有声明任何依赖）
    // 但是 testService 会是 undefined，违反了类型契约
    const child = instantiationService.createInstance(ChildClassNoDeps, 'test-id');
    expect(child.id).toBe('test-id');
    expect(child.testService).toBeUndefined();  // ❌ 依赖没有被注入
  });

  it('multiple levels of inheritance require each level to pass dependencies', () => {
    // 测试多层继承的情况
    const IServiceA = createDecorator<ServiceA>('ServiceA');
    const IServiceB = createDecorator<ServiceB>('ServiceB');

    class ServiceA {
      _serviceBrand: undefined;
      name = 'ServiceA';
    }

    class ServiceB {
      _serviceBrand: undefined;
      name = 'ServiceB';
    }

    serviceRegistry.register(IServiceA, ServiceA);
    serviceRegistry.register(IServiceB, ServiceB);

    // 基类
    class GrandParent {
      constructor(
        @IServiceA public serviceA: ServiceA
      ) { }
    }

    // 中间层
    class Parent extends GrandParent {
      constructor(
        @IServiceA serviceA: ServiceA,
        @IServiceB public serviceB: ServiceB
      ) {
        super(serviceA);
      }
    }

    // 子类
    class Child extends Parent {
      constructor(
        @IServiceA serviceA: ServiceA,
        @IServiceB serviceB: ServiceB
      ) {
        super(serviceA, serviceB);
      }
    }

    const instantiationService = new InstantiationService(serviceRegistry.makeCollection());
    const child = instantiationService.createInstance(Child);

    expect(child.serviceA).not.toBeUndefined();
    expect(child.serviceA.name).toBe('ServiceA');
    expect(child.serviceB).not.toBeUndefined();
    expect(child.serviceB.name).toBe('ServiceB');
  });
});
