import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BridgeService, BridgeHelpers } from '../modules/bridge.service';

describe('BridgeService', () => {
  let bridge: BridgeService;

  beforeEach(() => {
    // 清除 window.NativeBridge
    delete (window as any).NativeBridge;
  });

  describe('Mock Mode', () => {
    beforeEach(() => {
      bridge = new BridgeService(true);
    });

    it('should work in mock mode', async () => {
      const result = await bridge.call('getUserInfo');

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('userName');
    });

    it('should allow setting custom mock responses', async () => {
      bridge.setMockResponse('customMethod', { foo: 'bar' });

      const result = await bridge.call('customMethod');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should batch set mock responses', async () => {
      bridge.setMockResponses({
        method1: { data: 1 },
        method2: { data: 2 },
      });

      const result1 = await bridge.call('method1');
      const result2 = await bridge.call('method2');

      expect(result1).toEqual({ data: 1 });
      expect(result2).toEqual({ data: 2 });
    });


  });

  describe('Native Mode', () => {
    beforeEach(() => {
      // 模拟 NativeBridge
      (window as any).NativeBridge = {
        invoke: vi.fn().mockResolvedValue({
          code: 0,
          data: { success: true },
        }),
      };

      bridge = new BridgeService(false);
    });

    it('should call native bridge', async () => {
      const result = await bridge.call('testMethod', { param: 'value' });

      expect(window.NativeBridge!.invoke).toHaveBeenCalledWith('testMethod', {
        param: 'value',
      });
      expect(result).toEqual({ success: true });
    });

    it('should handle native bridge errors', async () => {
      (window.NativeBridge!.invoke as any).mockResolvedValue({
        code: -1,
        message: 'Error occurred',
      });

      await expect(bridge.call('failMethod')).rejects.toThrow('Error occurred');
    });

    it('should handle timeout', async () => {
      (window.NativeBridge!.invoke as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      await expect(bridge.call('slowMethod', {}, 100)).rejects.toThrow('timeout');
    });
  });

  describe('BridgeHelpers', () => {
    let helpers: BridgeHelpers;

    beforeEach(() => {
      bridge = new BridgeService(true);
      helpers = new BridgeHelpers(bridge);
    });

    it('should get user info', async () => {
      const userInfo = await helpers.getUserInfo();

      expect(userInfo).toHaveProperty('userId');
      expect(userInfo).toHaveProperty('userName');
    });

    it('should show toast', async () => {
      await expect(helpers.toast('Hello')).resolves.not.toThrow();
    });

    it('should navigate', async () => {
      await expect(helpers.navigate('/page', { id: 123 })).resolves.not.toThrow();
    });

    it('should share', async () => {
      await expect(
        helpers.share({
          title: 'Title',
          content: 'Content',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Disposal', () => {
    it('should clear mock responses on dispose', () => {
      bridge = new BridgeService(true);
      bridge.setMockResponse('test', { data: 'test' });

      bridge.dispose();

      // Mock responses should be cleared
      expect((bridge as any).mockResponses.size).toBe(0);
    });
  });
});
