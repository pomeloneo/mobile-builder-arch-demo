import { createDecorator } from './base';
import { InstantiationService as ContainerService, InstantiationService } from './instantiation-service';
import { ServiceOwnership } from './service-ownership-collection';
import { ServiceRegistry } from './service-registry';

/**
 * 存在dispose的service1
 */
class MockService1 {
  readonly _serviceBrand: undefined;

  constructor(private readonly _fn: () => void) {}

  dispose() {
    this._fn();
  }
}
const IMockService1 = createDecorator<MockService1>('MockService1');

/**
 * 存在dispose的service2
 */
class MockService2 {
  readonly _serviceBrand: undefined;

  constructor(private readonly _fn: () => void) {}

  dispose() {
    this._fn();
  }
}
const IMockService2 = createDecorator<MockService2>('MockService2');

/**
 * 不存在dispose的service
 */
class MockService3 {
  readonly _serviceBrand: undefined;

  constructor(private readonly _fn: () => void) {}
}
const IMockService3 = createDecorator<MockService3>('MockService3');

/**
 * reference service
 */
class MockService4 {
  readonly _serviceBrand: undefined;

  constructor(private readonly _fn: () => void) {}

  dispose() {
    this._fn();
  }
}
const IMockService4 = createDecorator<MockService4>('MockService4');

describe('ContainerService', () => {
  // 单层的dispose
  it('dispose1', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const fn3 = vi.fn();

    const registry = new ServiceRegistry();
    registry.registerInstance(IMockService1, new MockService1(fn1));
    registry.registerInstance(IMockService2, new MockService2(fn2));
    registry.registerInstance(IMockService3, new MockService3(fn3));
    const containerService = new ContainerService(registry.makeCollection());
    containerService.dispose();

    expect(fn1).toBeCalled();
    expect(fn2).toBeCalled();
    expect(fn3).not.toBeCalled();
  });

  // 双层的dispose，一起销毁
  it('dispose2', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const fn3 = vi.fn();

    const registry1 = new ServiceRegistry();
    registry1.registerInstance(IMockService1, new MockService1(fn1));
    const containerService = new ContainerService(registry1.makeCollection());

    const registry2 = new ServiceRegistry();
    registry2.registerInstance(IMockService2, new MockService2(fn2));
    registry2.registerInstance(IMockService3, new MockService3(fn3));
    const childContainerService = new ContainerService(registry2.makeCollection(), containerService);
    // eslint-disable-next-line dot-notation, @typescript-eslint/dot-notation
    expect(containerService['_childs'].has(childContainerService)).toBeTruthy();

    containerService.dispose();

    expect(fn1).toBeCalled();
    expect(fn2).toBeCalled();
    expect(fn3).not.toBeCalled();
    // eslint-disable-next-line dot-notation, @typescript-eslint/dot-notation
    expect(containerService['_childs'].has(childContainerService)).toBeFalsy();
  });

  // 双层的dispose，只销毁下一层
  it('dispose3', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const fn3 = vi.fn();

    const registry1 = new ServiceRegistry();
    registry1.registerInstance(IMockService1, new MockService1(fn1));
    const containerService = new ContainerService(registry1.makeCollection());

    const registry2 = new ServiceRegistry();
    registry2.registerInstance(IMockService2, new MockService2(fn2));
    registry2.registerInstance(IMockService3, new MockService3(fn3));
    const childContainerService = new ContainerService(registry2.makeCollection(), containerService);
    // eslint-disable-next-line dot-notation, @typescript-eslint/dot-notation
    expect(containerService['_childs'].has(childContainerService)).toBeTruthy();

    childContainerService.dispose();

    expect(fn1).not.toBeCalled();
    expect(fn2).toBeCalled();
    expect(fn3).not.toBeCalled();
    // eslint-disable-next-line dot-notation, @typescript-eslint/dot-notation
    expect(containerService['_childs'].has(childContainerService)).toBeFalsy();
  });

  // parent是instantiationService，正常dispose
  it('dispose4', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const fn3 = vi.fn();

    const registry1 = new ServiceRegistry();
    registry1.registerInstance(IMockService1, new MockService1(fn1));
    const instantiationService = new InstantiationService(registry1.makeCollection());

    const registry2 = new ServiceRegistry();
    registry2.registerInstance(IMockService2, new MockService2(fn2));
    registry2.registerInstance(IMockService3, new MockService3(fn3));
    const containerService = new ContainerService(registry2.makeCollection(), instantiationService);

    containerService.dispose();

    expect(fn1).not.toBeCalled();
    expect(fn2).toBeCalled();
    expect(fn3).not.toBeCalled();
  });

  // reference dispose
  it('reference dispose', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const fn4 = vi.fn();

    const mock4Instance = new MockService4(fn4);
    const registry1 = new ServiceRegistry();
    registry1.registerInstance(IMockService1, new MockService1(fn1));
    registry1.registerInstance(IMockService4, mock4Instance);
    const containerService = new ContainerService(registry1.makeCollection());

    const registry2 = new ServiceRegistry();
    registry2.registerInstance(IMockService2, new MockService2(fn2));
    registry2.registerInstance(IMockService4, mock4Instance, {
      ownership: ServiceOwnership.Reference,
    });
    const childContainerService = new ContainerService(registry2.makeCollection(), containerService);
    childContainerService.dispose();

    expect(fn1).not.toBeCalled();
    expect(fn2).toBeCalled();
    expect(fn4).not.toBeCalled();

    containerService.dispose();
    expect(fn1).toBeCalled();
    expect(fn4).toBeCalled();
  });
});
