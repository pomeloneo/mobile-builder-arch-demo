import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, Inject } from '../bedrock/di';
import { IDisposable } from '../bedrock/disposable';

// 测试用的 Service
class TestService implements IDisposable {
  public disposed = false;

  dispose() {
    this.disposed = true;
  }

  getData() {
    return 'test data';
  }
}

class AnotherService {
  getValue() {
    return 42;
  }
}

// 测试用的 Model（使用依赖注入）
class TestModel {
  constructor(
    public id: string,
    public props: any,
    @Inject(TestService) public testService: TestService,
    @Inject(AnotherService) public anotherService: AnotherService
  ) { }
}

describe('Injector', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector(undefined, 'TestInjector');
  });

  describe('Service Registration and Retrieval', () => {
    it('should register and retrieve service', () => {
      const service = new TestService();
      injector.registerInstance(TestService, service);

      const retrieved = injector.get(TestService);
      expect(retrieved).toBe(service);
    });

    it('should throw error when service not found', () => {
      expect(() => injector.get(TestService)).toThrow('Service not found');
    });

    it('should check if service exists', () => {
      expect(injector.has(TestService)).toBe(false);

      injector.registerInstance(TestService, new TestService());
      expect(injector.has(TestService)).toBe(true);
    });

    it('should warn when overwriting existing service', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => { });

      injector.registerInstance(TestService, new TestService());
      injector.registerInstance(TestService, new TestService());

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  describe('Parent-Child Relationship', () => {
    it('should create child injector', () => {
      const child = injector.createChild('ChildInjector');

      expect(child.name).toBe('ChildInjector');
    });

    it('should access parent services from child', () => {
      const service = new TestService();
      injector.registerInstance(TestService, service);

      const child = injector.createChild();
      const retrieved = child.get(TestService);

      expect(retrieved).toBe(service);
    });

    it('should not access child services from parent', () => {
      const child = injector.createChild();
      child.registerInstance(TestService, new TestService());

      expect(() => injector.get(TestService)).toThrow('Service not found');
    });

    it('should prioritize own services over parent services', () => {
      const parentService = new TestService();
      const childService = new TestService();

      injector.registerInstance(TestService, parentService);
      const child = injector.createChild();
      child.registerInstance(TestService, childService);

      expect(child.get(TestService)).toBe(childService);
    });
  });

  describe('Dependency Injection', () => {
    it('should resolve and instantiate with dependencies', () => {
      const testService = new TestService();
      const anotherService = new AnotherService();

      injector.registerInstance(TestService, testService);
      injector.registerInstance(AnotherService, anotherService);

      const model: TestModel = injector.resolveAndInstantiate(TestModel, ['model-1', { foo: 'bar' }]);

      expect(model.id).toBe('model-1');
      expect(model.props).toEqual({ foo: 'bar' });
      expect(model.testService).toBe(testService);
      expect(model.anotherService).toBe(anotherService);
    });

    it('should throw error if dependency not found', () => {
      // 只注册一个服务，缺少另一个
      injector.registerInstance(TestService, new TestService());

      expect(() => {
        injector.resolveAndInstantiate(TestModel, ['model-1', {}]);
      }).toThrow('Service not found');
    });
  });

  describe('Disposal', () => {
    it('should dispose all services', () => {
      const service1 = new TestService();
      const service2 = new TestService();

      injector.registerInstance('Service1', service1);
      injector.registerInstance('Service2', service2);

      injector.dispose();

      expect(service1.disposed).toBe(true);
      expect(service2.disposed).toBe(true);
    });

    it('should dispose child injectors when parent is disposed', () => {
      const child = injector.createChild();
      const childService = new TestService();
      child.registerInstance(TestService, childService);

      injector.dispose();

      expect(childService.disposed).toBe(true);
    });

    it('should throw error when accessing disposed injector', () => {
      injector.dispose();

      expect(() => injector.get(TestService)).toThrow('Cannot get from disposed injector');
      expect(() => injector.registerInstance(TestService, new TestService())).toThrow(
        'Cannot register to disposed injector'
      );
      expect(() => injector.createChild()).toThrow('Cannot create child from disposed injector');
    });

    it('should be idempotent on multiple dispose calls', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => { });
      const service = new TestService();
      injector.registerInstance(TestService, service);

      injector.dispose();
      injector.dispose();
      injector.dispose();

      expect(service.disposed).toBe(true);
      expect(consoleWarn).toHaveBeenCalledTimes(2);
      consoleWarn.mockRestore();
    });

    it('should handle disposal errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
      const badService = {
        dispose: () => {
          throw new Error('Disposal error');
        },
      };
      const goodService = new TestService();

      injector.registerInstance('BadService', badService);
      injector.registerInstance('GoodService', goodService);

      injector.dispose();

      expect(goodService.disposed).toBe(true);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('Debug Info', () => {
    it('should provide debug information', () => {
      injector.registerInstance(TestService, new TestService());
      injector.registerInstance(AnotherService, new AnotherService());

      const info = injector.getDebugInfo();

      expect(info.name).toBe('TestInjector');
      expect(info.isDisposed).toBe(false);
      expect(info.serviceCount).toBe(2);
      expect(info.services).toContain('TestService');
      expect(info.services).toContain('AnotherService');
    });
  });
});
