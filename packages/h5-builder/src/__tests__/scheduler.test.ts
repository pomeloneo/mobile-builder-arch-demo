import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JobScheduler, JobPriority } from '../flow/scheduler';

describe('JobScheduler', () => {
  let scheduler: JobScheduler;

  beforeEach(() => {
    scheduler = new JobScheduler();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    scheduler.dispose();
  });

  it('should execute jobs in priority order', async () => {
    const order: string[] = [];

    scheduler.register('job1', JobPriority.Render, () => order.push('render'));
    scheduler.register('job2', JobPriority.Start, () => order.push('start'));
    scheduler.register('job3', JobPriority.Prepare, () => order.push('prepare'));

    await scheduler.run();

    expect(order).toEqual(['start', 'prepare', 'render']);
  });

  it('should handle async jobs', async () => {
    const order: string[] = [];

    scheduler.register('async-job', JobPriority.Start, async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      order.push('async');
    });

    scheduler.register('sync-job', JobPriority.Prepare, () => {
      order.push('sync');
    });

    const runPromise = scheduler.run();

    // Fast-forward time
    await vi.runAllTimersAsync();
    await runPromise;

    expect(order).toEqual(['async', 'sync']);
  });

  it('should schedule idle jobs after main jobs', async () => {
    const order: string[] = [];

    scheduler.register('idle-job', JobPriority.Idle, () => order.push('idle'));
    scheduler.register('main-job', JobPriority.Start, () => order.push('main'));

    await scheduler.run();

    // Main jobs done, idle jobs scheduled
    expect(order).toEqual(['main']);

    // Run idle jobs
    await vi.runAllTimersAsync();

    expect(order).toEqual(['main', 'idle']);
  });

  it('should use setTimeout fallback if requestIdleCallback is missing', async () => {
    // Mock window without requestIdleCallback
    const originalRequestIdleCallback = (window as any).requestIdleCallback;
    delete (window as any).requestIdleCallback;

    const fn = vi.fn();
    scheduler.scheduleIdleTask(fn);

    expect(fn).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();

    expect(fn).toHaveBeenCalled();

    // Restore
    if (originalRequestIdleCallback) {
      (window as any).requestIdleCallback = originalRequestIdleCallback;
    }
  });

  it('should handle job errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });

    scheduler.register('bad-job', JobPriority.Start, () => {
      throw new Error('Job failed');
    });

    await expect(scheduler.run()).rejects.toThrow('Job failed');

    consoleError.mockRestore();
  });

  it('should continue idle jobs if one fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
    const order: string[] = [];

    scheduler.register('bad-idle', JobPriority.Idle, () => {
      throw new Error('Idle failed');
    });
    scheduler.register('good-idle', JobPriority.Idle, () => {
      order.push('good');
    });

    await scheduler.run();
    await vi.runAllTimersAsync();

    expect(order).toEqual(['good']);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
