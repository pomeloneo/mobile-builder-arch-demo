import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpService, createHttpService } from '../services/http.service';
import { BridgeService } from '../services/bridge.service';

describe('HttpService', () => {
  let bridge: BridgeService;
  let http: HttpService;

  beforeEach(() => {
    bridge = new BridgeService(true);
    http = new HttpService(bridge);
  });

  describe('Basic Requests', () => {
    it('should make GET request', async () => {
      bridge.setMockResponse('fetch', {
        data: { message: 'success' },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await http.get('/api/test');
      expect(result).toEqual({ message: 'success' });
    });

    it('should make POST request', async () => {
      bridge.setMockResponse('fetch', {
        data: { id: 123 },
        status: 201,
        statusText: 'Created',
        headers: {},
      });

      const result = await http.post('/api/test', { name: 'test' });
      expect(result).toEqual({ id: 123 });
    });

    it('should make PUT request', async () => {
      bridge.setMockResponse('fetch', {
        data: { updated: true },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await http.put('/api/test/123', { name: 'updated' });
      expect(result).toEqual({ updated: true });
    });

    it('should make DELETE request', async () => {
      bridge.setMockResponse('fetch', {
        data: { deleted: true },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await http.delete('/api/test/123');
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('Query Parameters', () => {
    it('should append query parameters', async () => {
      const bridgeSpy = vi.spyOn(bridge, 'call');

      bridge.setMockResponse('fetch', {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await http.get('/api/test', {
        params: { id: 123, name: 'test' },
      });

      expect(bridgeSpy).toHaveBeenCalledWith(
        'fetch',
        expect.objectContaining({
          url: expect.stringContaining('id=123'),
        })
      );
    });
  });

  describe('Request Interceptors', () => {
    it('should execute request interceptors', async () => {
      const interceptor = vi.fn((config) => {
        config.headers = {
          ...config.headers,
          'X-Custom-Header': 'test',
        };
        return config;
      });

      http.addRequestInterceptor(interceptor);

      bridge.setMockResponse('fetch', {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await http.get('/api/test');

      expect(interceptor).toHaveBeenCalled();
    });

    it('should remove request interceptor', async () => {
      const interceptor = vi.fn((config) => config);
      const remove = http.addRequestInterceptor(interceptor);

      remove();

      bridge.setMockResponse('fetch', {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await http.get('/api/test');

      expect(interceptor).not.toHaveBeenCalled();
    });
  });

  describe('Response Interceptors', () => {
    it('should execute response interceptors', async () => {
      const interceptor = vi.fn((response) => response);

      http.addResponseInterceptor(interceptor);

      bridge.setMockResponse('fetch', {
        data: { message: 'success' },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await http.get('/api/test');

      expect(interceptor).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should execute error interceptors', async () => {
      const errorInterceptor = vi.fn((error) => error);

      http.addErrorInterceptor(errorInterceptor);

      // 模拟错误
      vi.spyOn(bridge, 'call').mockRejectedValue(new Error('Network error'));

      await expect(http.get('/api/test')).rejects.toThrow('Network error');
      expect(errorInterceptor).toHaveBeenCalled();
    });
  });

  describe('Request Cancellation', () => {
    it('should cancel all pending requests', () => {
      expect(() => http.cancelAll()).not.toThrow();
    });
  });

  describe('Disposal', () => {
    it('should cancel requests and clear interceptors on dispose', () => {
      const requestInterceptor = vi.fn((config) => config);
      const responseInterceptor = vi.fn((response) => response);

      http.addRequestInterceptor(requestInterceptor);
      http.addResponseInterceptor(responseInterceptor);

      http.dispose();

      expect((http as any).requestInterceptors.length).toBe(0);
      expect((http as any).responseInterceptors.length).toBe(0);
    });
  });

  describe('createHttpService', () => {
    it('should create http service with baseURL', async () => {
      const httpWithBase = createHttpService(bridge, {
        baseURL: 'https://api.example.com',
      });

      const bridgeSpy = vi.spyOn(bridge, 'call');

      bridge.setMockResponse('fetch', {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await httpWithBase.get('/test');

      expect(bridgeSpy).toHaveBeenCalledWith(
        'fetch',
        expect.objectContaining({
          url: 'https://api.example.com/test',
        })
      );
    });

    it('should create http service with token', async () => {
      const httpWithToken = createHttpService(bridge, {
        token: 'test-token',
      });

      const bridgeSpy = vi.spyOn(bridge, 'call');

      bridge.setMockResponse('fetch', {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await httpWithToken.get('/test');

      expect(bridgeSpy).toHaveBeenCalledWith(
        'fetch',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });
});
