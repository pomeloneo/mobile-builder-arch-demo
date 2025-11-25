import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrackerService, TrackerHelpers } from '../modules/tracker.service';
import { BridgeService } from '../modules/bridge.service';

describe('TrackerService', () => {
  let bridge: BridgeService;
  let tracker: TrackerService;

  beforeEach(() => {
    bridge = new BridgeService(true);
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Tracking', () => {
    it('should enqueue events in production mode', () => {
      tracker = new TrackerService(bridge, { debug: false });

      tracker.track('TEST_EVENT', { foo: 'bar' });

      expect(tracker.queueSize).toBe(1);
    });

    it('should send events immediately in debug mode', async () => {
      tracker = new TrackerService(bridge, { debug: true });

      const bridgeSpy = vi.spyOn(bridge, 'call');

      tracker.track('TEST_EVENT', { foo: 'bar' });

      // Wait for async operations
      await vi.runAllTimersAsync();

      expect(bridgeSpy).toHaveBeenCalledWith('toast', expect.any(Object));
      expect(bridgeSpy).toHaveBeenCalledWith('trackSync', expect.any(Object));
    });
  });

  describe('Batch Sending', () => {
    beforeEach(() => {
      tracker = new TrackerService(bridge, {
        debug: false,
        maxBatchSize: 3,
        flushInterval: 1000,
      });
    });

    it('should flush when queue reaches max size', async () => {
      const bridgeSpy = vi.spyOn(bridge, 'call');

      tracker.track('EVENT_1');
      tracker.track('EVENT_2');
      tracker.track('EVENT_3'); // Should trigger flush

      await vi.runAllTimersAsync();

      expect(bridgeSpy).toHaveBeenCalledWith('trackBatch', expect.any(Object));
      expect(tracker.queueSize).toBe(0);
    });

    it('should flush on interval', async () => {
      const bridgeSpy = vi.spyOn(bridge, 'call');

      tracker.track('EVENT_1');

      // Advance timers by flush interval
      await vi.advanceTimersByTimeAsync(1000);

      expect(bridgeSpy).toHaveBeenCalledWith('trackBatch', expect.any(Object));
      expect(tracker.queueSize).toBe(0);
    });

    it('should not schedule multiple flush timers', () => {
      tracker.track('EVENT_1');
      tracker.track('EVENT_2');

      // Should only have one timer
      expect(vi.getTimerCount()).toBe(1);
    });
  });

  describe('Persistence', () => {
    it('should persist queue to localStorage', () => {
      tracker = new TrackerService(bridge, {
        debug: false,
        enablePersistence: true,
        storageKey: 'test_tracker_queue',
      });

      tracker.track('EVENT_1', { data: 'test' });

      const stored = localStorage.getItem('test_tracker_queue');
      expect(stored).toBeTruthy();

      const queue = JSON.parse(stored!);
      expect(queue).toHaveLength(1);
      expect(queue[0].event).toBe('EVENT_1');
    });

    it('should restore queue from localStorage', () => {
      // Pre-populate localStorage
      const events = [
        { event: 'EVENT_1', params: {}, timestamp: Date.now() },
        { event: 'EVENT_2', params: {}, timestamp: Date.now() },
      ];
      localStorage.setItem('test_tracker_queue', JSON.stringify(events));

      tracker = new TrackerService(bridge, {
        debug: false,
        enablePersistence: true,
        storageKey: 'test_tracker_queue',
      });

      expect(tracker.queueSize).toBe(2);
    });

    it('should clear persisted queue', () => {
      tracker = new TrackerService(bridge, {
        debug: false,
        enablePersistence: true,
        storageKey: 'test_tracker_queue',
      });

      tracker.track('EVENT_1');
      tracker.clear();

      expect(tracker.queueSize).toBe(0);
      expect(localStorage.getItem('test_tracker_queue')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      tracker = new TrackerService(bridge, {
        debug: false,
        maxBatchSize: 2,
      });
    });

    it('should re-enqueue events on flush failure', async () => {
      vi.spyOn(bridge, 'call').mockRejectedValue(new Error('Network error'));

      tracker.track('EVENT_1');
      tracker.track('EVENT_2'); // Triggers flush

      await vi.runAllTimersAsync();

      // Events should still be in queue
      expect(tracker.queueSize).toBe(2);
    });
  });

  describe('Disposal', () => {
    it('should flush remaining events on dispose', async () => {
      tracker = new TrackerService(bridge, { debug: false });

      const bridgeSpy = vi.spyOn(bridge, 'call');

      tracker.track('EVENT_1');
      tracker.dispose();

      await vi.runAllTimersAsync();

      expect(bridgeSpy).toHaveBeenCalledWith('trackBatch', expect.any(Object));
    });

    it('should clear flush timer on dispose', () => {
      tracker = new TrackerService(bridge, { debug: false });

      tracker.track('EVENT_1');

      const timerCount = vi.getTimerCount();
      expect(timerCount).toBeGreaterThan(0);

      tracker.dispose();

      // Timer should be cleared
      expect((tracker as any).flushTimer).toBeUndefined();
    });
  });

  describe('TrackerHelpers', () => {
    let helpers: TrackerHelpers;

    beforeEach(() => {
      tracker = new TrackerService(bridge, { debug: false });
      helpers = new TrackerHelpers(tracker);
    });

    it('should track page view', () => {
      helpers.trackPageView('HomePage', { from: 'splash' });

      expect(tracker.queueSize).toBe(1);
    });

    it('should track exposure', () => {
      helpers.trackExposure('ProductCard', 'card-123');

      expect(tracker.queueSize).toBe(1);
    });

    it('should track click', () => {
      helpers.trackClick('Button', 'btn-submit', { label: 'Submit' });

      expect(tracker.queueSize).toBe(1);
    });

    it('should track error', () => {
      const error = new Error('Test error');
      helpers.trackError(error, { page: 'HomePage' });

      expect(tracker.queueSize).toBe(1);
    });

    it('should track performance', () => {
      helpers.trackPerformance('LCP', 1234);

      expect(tracker.queueSize).toBe(1);
    });
  });
});
