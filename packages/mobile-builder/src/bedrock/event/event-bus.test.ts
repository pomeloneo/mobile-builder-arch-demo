import { EventBus, IEventBus, type IEventClass } from './event-bus';
import { listenOnce } from './once';
import { listenWhen } from './when';

// 测试用事件类
class ProductClickEvent {
  static readonly ID = 'product:click';
  constructor(
    public readonly productId: number,
    public readonly productName: string
  ) { }
}

class UserLoginEvent {
  static readonly ID = 'user:login';
  constructor(public readonly userId: string) { }
}

// 没有 ID 的事件类（用于测试错误处理）
class InvalidEvent {
  constructor(public readonly data: string) { }
}

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.dispose();
  });

  describe('publish / subscribe', () => {
    test('should receive event when subscribed', () => {
      let received: ProductClickEvent | undefined;

      eventBus.subscribe(ProductClickEvent, (event) => {
        received = event;
      });

      const event = new ProductClickEvent(123, '测试商品');
      eventBus.publish(event);

      expect(received).toBe(event);
      expect(received?.productId).toBe(123);
      expect(received?.productName).toBe('测试商品');
    });

    test('should support multiple subscribers for same event', () => {
      let count = 0;

      eventBus.subscribe(ProductClickEvent, () => { count++; });
      eventBus.subscribe(ProductClickEvent, () => { count++; });
      eventBus.subscribe(ProductClickEvent, () => { count++; });

      eventBus.publish(new ProductClickEvent(1, 'test'));

      expect(count).toBe(3);
    });

    test('should independently handle different event types', () => {
      let productCount = 0;
      let loginCount = 0;

      eventBus.subscribe(ProductClickEvent, () => { productCount++; });
      eventBus.subscribe(UserLoginEvent, () => { loginCount++; });

      eventBus.publish(new ProductClickEvent(1, 'test'));
      eventBus.publish(new ProductClickEvent(2, 'test2'));
      eventBus.publish(new UserLoginEvent('user1'));

      expect(productCount).toBe(2);
      expect(loginCount).toBe(1);
    });

    test('should not fail when publishing without subscribers', () => {
      // 没有订阅者时发布事件不应该报错
      expect(() => {
        eventBus.publish(new ProductClickEvent(1, 'test'));
      }).not.toThrow();
    });
  });

  describe('unsubscribe', () => {
    test('should stop receiving events after dispose', () => {
      let count = 0;

      const disposable = eventBus.subscribe(ProductClickEvent, () => {
        count++;
      });

      eventBus.publish(new ProductClickEvent(1, 'test'));
      expect(count).toBe(1);

      disposable.dispose();

      eventBus.publish(new ProductClickEvent(2, 'test'));
      expect(count).toBe(1); // 不再增加
    });

    test('should only unsubscribe the specific handler', () => {
      let count1 = 0;
      let count2 = 0;

      const disposable1 = eventBus.subscribe(ProductClickEvent, () => { count1++; });
      eventBus.subscribe(ProductClickEvent, () => { count2++; });

      eventBus.publish(new ProductClickEvent(1, 'test'));
      expect(count1).toBe(1);
      expect(count2).toBe(1);

      disposable1.dispose();

      eventBus.publish(new ProductClickEvent(2, 'test'));
      expect(count1).toBe(1); // 不再增加
      expect(count2).toBe(2); // 继续增加
    });
  });

  describe('error handling', () => {
    test('should throw when subscribing to event class without ID', () => {
      expect(() => {
        eventBus.subscribe(InvalidEvent as any, () => { });
      }).toThrow('缺少静态属性 ID');
    });

    test('should warn when publishing event without ID', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

      eventBus.publish(new InvalidEvent('test'));

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('没有 ID 的事件'),
        expect.any(Object)
      );

      warnSpy.mockRestore();
    });

    test('should throw when subscribing after disposed', () => {
      eventBus.dispose();

      expect(() => {
        eventBus.subscribe(ProductClickEvent, () => { });
      }).toThrow('disposed');
    });

    test('should ignore publish after disposed', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

      eventBus.dispose();
      eventBus.publish(new ProductClickEvent(1, 'test'));

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Already disposed')
      );

      warnSpy.mockRestore();
    });
  });

  describe('eventOf', () => {
    test('should return Event object compatible with listenOnce', () => {
      let received: ProductClickEvent | undefined;

      listenOnce(eventBus.eventOf(ProductClickEvent))((event) => {
        received = event;
      });

      eventBus.publish(new ProductClickEvent(1, 'first'));
      eventBus.publish(new ProductClickEvent(2, 'second'));

      // 只收到第一个事件
      expect(received?.productId).toBe(1);
    });

    test('should return Event object compatible with listenWhen', () => {
      let received: ProductClickEvent | undefined;

      listenWhen(eventBus.eventOf(ProductClickEvent), (event) => event.productId > 100)(
        (event) => {
          received = event;
        }
      );

      eventBus.publish(new ProductClickEvent(50, 'skip'));
      expect(received).toBeUndefined();

      eventBus.publish(new ProductClickEvent(200, 'match'));
      expect(received?.productId).toBe(200);

      // 只触发一次，后续匹配的事件不再处理
      eventBus.publish(new ProductClickEvent(300, 'skip'));
      expect(received?.productId).toBe(200);
    });

    test('should throw when getting eventOf for class without ID', () => {
      expect(() => {
        eventBus.eventOf(InvalidEvent as any);
      }).toThrow('缺少静态属性 ID');
    });
  });

  describe('service identifier', () => {
    test('IEventBus should be a valid service identifier', () => {
      expect(IEventBus.toString()).toBe('eventBus');
    });
  });
});
