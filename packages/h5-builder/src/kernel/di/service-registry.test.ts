import { createDecorator } from './base';
import { SyncDescriptor } from './descriptor';
import { ServiceOwnership } from './service-ownership-collection';
import { InstantiationType, ServiceRegistry } from './service-registry';

class Foo {
  _serviceBrand: undefined;
}
class Bar {
  _serviceBrand: undefined;
  option1: number;
  option2: string;

  constructor(option1: number, option2: string) {
    this.option1 = option1;
    this.option2 = option2;
  }
}

class Test {
  _serviceBrand: undefined;
}

class ReferenceTest {
  _serviceBrand: undefined;
}

const IFoo = createDecorator<Foo>('foo');
const IBar = createDecorator<Bar>('bar');
const ITest = createDecorator<Test>('test');
const IReferenceTest = createDecorator<ReferenceTest>('reference-test');

describe('registry', () => {
  it('register success', () => {
    const serviceRegistry = new ServiceRegistry();
    serviceRegistry.register(IFoo, Foo, InstantiationType.Eager);
    serviceRegistry.register(IBar, new SyncDescriptor(Bar, [100, 'Hello'], true));
    serviceRegistry.registerInstance(ITest, new Test());

    expect(serviceRegistry.registry.length).toBe(3);

    expect(serviceRegistry.registry[0][0]).toBe(IFoo);
    expect(serviceRegistry.registry[0][1] instanceof SyncDescriptor).toBeTruthy();
    expect((serviceRegistry.registry[0][1] as SyncDescriptor<Foo>).ctor).toBe(Foo);
    expect((serviceRegistry.registry[0][1] as SyncDescriptor<Foo>).staticArguments.length).toBe(0);
    expect((serviceRegistry.registry[0][1] as SyncDescriptor<Foo>).supportsDelayedInstantiation).toBe(false);

    expect(serviceRegistry.registry[1][0]).toBe(IBar);
    expect(serviceRegistry.registry[1][1] instanceof SyncDescriptor).toBeTruthy();
    expect((serviceRegistry.registry[1][1] as SyncDescriptor<Bar>).ctor).toBe(Bar);
    expect((serviceRegistry.registry[1][1] as SyncDescriptor<Bar>).staticArguments.length).toBe(2);
    expect((serviceRegistry.registry[1][1] as SyncDescriptor<Bar>).staticArguments[0]).toBe(100);
    expect((serviceRegistry.registry[1][1] as SyncDescriptor<Bar>).staticArguments[1]).toBe('Hello');
    expect((serviceRegistry.registry[1][1] as SyncDescriptor<Bar>).supportsDelayedInstantiation).toBe(true);

    expect(serviceRegistry.registry[2][0]).toBe(ITest);
    expect(serviceRegistry.registry[2][1] instanceof Test).toBeTruthy();
    expect(serviceRegistry.makeCollection().ownerships!.get(ITest)).toBe(ServiceOwnership.Owned);

    serviceRegistry.registerInstance(IReferenceTest, new ReferenceTest(), {
      ownership: ServiceOwnership.Reference,
    });
    expect(serviceRegistry.registry[3][0]).toBe(IReferenceTest);
    expect(serviceRegistry.makeCollection().ownerships!.get(IReferenceTest)).toBe(ServiceOwnership.Reference);
  });
});
