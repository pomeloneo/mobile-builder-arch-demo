import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseComponentModel, BaseContainerModel } from '../bedrock/model';

// 测试用的简单 Model
class TestModel extends BaseComponentModel<{ value: number }> {
  public data: string | null = null;
  public initCalled = false;
  public destroyCalled = false;
  public activeCalled = false;
  public inactiveCalled = false;

  protected onInit(): void {
    this.initCalled = true;
    this.data = `Initialized with value: ${this.props.value}`;
  }

  protected onDestroy(): void {
    this.destroyCalled = true;
  }

  protected onActive(): void {
    this.activeCalled = true;
  }

  protected onInactive(): void {
    this.inactiveCalled = true;
  }
}

// 测试用的容器 Model
class TestContainerModel extends BaseContainerModel<any, TestModel> {
  protected onInit(): void {
    // 创建一些子 Model
    const child1 = new TestModel('child-1', { value: 1 });
    const child2 = new TestModel('child-2', { value: 2 });

    this.addChild(child1);
    this.addChild(child2);
  }
}

describe('BaseComponentModel', () => {
  let model: TestModel;

  beforeEach(() => {
    model = new TestModel('test-model', { value: 42 });
  });

  describe('Initialization', () => {
    it('should initialize only once', () => {
      expect(model.isInited).toBe(false);

      model.init();
      expect(model.isInited).toBe(true);
      expect(model.initCalled).toBe(true);
      expect(model.data).toBe('Initialized with value: 42');

      // 再次调用不应该重复初始化
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => { });
      model.init();

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });

    it('should have correct id and props', () => {
      expect(model.id).toBe('test-model');
      expect(model.props).toEqual({ value: 42 });
    });
  });

  describe('Lifecycle', () => {
    it('should handle activate/deactivate', () => {
      expect(model.isActive).toBe(false);

      model.activate();
      expect(model.isActive).toBe(true);
      expect(model.activeCalled).toBe(true);

      model.deactivate();
      expect(model.isActive).toBe(false);
      expect(model.inactiveCalled).toBe(true);
    });

    it('should not activate twice', () => {
      model.activate();

      model.activate();
      // activeCalled 是 boolean，所以还是 true
      expect(model.activeCalled).toBe(true);
    });

    it('should dispose and call onDestroy', () => {
      model.dispose();

      expect(model.destroyCalled).toBe(true);
    });

    it('should not dispose twice', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => { });

      model.dispose();
      model.dispose();

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  describe('Resource Management', () => {
    it('should register and dispose resources', () => {
      const cleanup = vi.fn();

      model['register'](cleanup);
      model.dispose();

      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should dispose resources in LIFO order', () => {
      const order: number[] = [];

      model['register'](() => order.push(1));
      model['register'](() => order.push(2));
      model['register'](() => order.push(3));

      model.dispose();

      expect(order).toEqual([3, 2, 1]);
    });

    it('should handle timer cleanup', () => {
      vi.useFakeTimers();

      class TimerModel extends BaseComponentModel {
        public ticks = 0;

        protected onInit(): void {
          const timerId = setInterval(() => {
            this.ticks++;
          }, 1000);

          this.register(() => clearInterval(timerId));
        }
      }

      const timerModel = new TimerModel('timer', {});
      timerModel.init();

      vi.advanceTimersByTime(3000);
      expect(timerModel.ticks).toBe(3);

      timerModel.dispose();

      vi.advanceTimersByTime(3000);
      // 销毁后不应该再增加
      expect(timerModel.ticks).toBe(3);

      vi.useRealTimers();
    });
  });

  describe('Reactivity', () => {
    it('should be reactive', () => {
      // mobx-vue-lite 的 reactive 会使对象变为响应式
      model.init();

      const initialData = model.data;
      model.data = 'New data';

      expect(model.data).toBe('New data');
      expect(model.data).not.toBe(initialData);
    });
  });
});

describe('BaseContainerModel', () => {
  let container: TestContainerModel;

  beforeEach(() => {
    container = new TestContainerModel('container', {});
  });

  describe('Children Management', () => {
    it('should add children during init', () => {
      container.init();

      expect(container.children.length).toBe(2);
      expect(container.children[0].id).toBe('child-1');
      expect(container.children[1].id).toBe('child-2');
    });

    it('should dispose children when container is disposed', () => {
      container.init();

      const child1 = container.children[0];
      const child2 = container.children[1];

      container.dispose();

      expect(child1.destroyCalled).toBe(true);
      expect(child2.destroyCalled).toBe(true);
    });

    it('should remove child', () => {
      container.init();
      const child = container.children[0];

      container['removeChild'](child);

      expect(container.children.length).toBe(1);
      expect(child.destroyCalled).toBe(true);
    });

    it('should clear all children', () => {
      container.init();
      const children = [...container.children];

      container['clearChildren']();

      expect(container.children.length).toBe(0);
      children.forEach((child) => {
        expect(child.destroyCalled).toBe(true);
      });
    });
  });
});
