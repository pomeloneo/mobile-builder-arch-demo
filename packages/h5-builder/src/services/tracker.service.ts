import { IDisposable, DisposableStore } from '../bedrock/dispose';
import { BridgeService } from './bridge.service';
import { IBridgeService } from '../services/service-identifiers';

/**
 * 埋点事件
 */
export interface TrackEvent {
  event: string;
  params: Record<string, any>;
  timestamp: number;
}

/**
 * 埋点服务配置
 */
export interface TrackerConfig {
  // 是否开启 Debug 模式
  debug?: boolean;
  // 批量发送的最大事件数
  maxBatchSize?: number;
  // 批量发送的时间间隔（毫秒）
  flushInterval?: number;
  // 是否持久化到 localStorage
  enablePersistence?: boolean;
  // localStorage 的 key
  storageKey?: string;
}

/**
 * 埋点服务
 * 提供事件队列、批量发送、Debug 模式、持久化等功能
 */
export class TrackerService implements IDisposable {
  readonly _serviceBrand: undefined;
  private disposables = new DisposableStore();
  private queue: TrackEvent[] = [];
  private flushTimer?: number;
  private config: Required<TrackerConfig>;

  constructor(
    config: TrackerConfig = {},
    @IBridgeService private bridge: BridgeService,
  ) {
    this.config = {
      debug: config.debug ?? false,
      maxBatchSize: config.maxBatchSize ?? 20,
      flushInterval: config.flushInterval ?? 5000,
      enablePersistence: config.enablePersistence ?? false,
      storageKey: config.storageKey ?? 'h5_builder_tracker_queue',
    };

    // 从 localStorage 恢复未发送的埋点
    if (this.config.enablePersistence) {
      this.restoreQueue();
    }

    // 页面卸载前发送剩余埋点
    const beforeUnloadHandler = () => this.flush();
    window.addEventListener('beforeunload', beforeUnloadHandler);
    this.disposables.add({
      dispose: () => {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
      }
    });
  }

  /**
   * 上报埋点
   */
  track(event: string, params: Record<string, any> = {}): void {
    const trackEvent: TrackEvent = {
      event,
      params,
      timestamp: Date.now(),
    };

    if (this.config.debug) {
      // Debug 模式：同步发送 + Toast 提示
      this.debugTrack(trackEvent);
    } else {
      // 生产模式：加入队列
      this.enqueue(trackEvent);
    }
  }

  /**
   * Debug 模式埋点
   */
  private async debugTrack(trackEvent: TrackEvent): Promise<void> {
    // console.log(`[Tracker] ${trackEvent.event}`, trackEvent.params);

    try {
      // Toast 提示
      await this.bridge.call('toast', {
        message: `📊 ${trackEvent.event}`,
        duration: 1500,
      });

      // 同步发送
      await this.bridge.call('trackSync', trackEvent);
    } catch (error) {
      console.error('[Tracker] Debug track failed:', error);
    }
  }

  /**
   * 加入队列
   */
  private enqueue(trackEvent: TrackEvent): void {
    this.queue.push(trackEvent);

    // 持久化
    if (this.config.enablePersistence) {
      this.persistQueue();
    }

    // 如果队列达到最大值，立即发送
    if (this.queue.length >= this.config.maxBatchSize) {
      this.flush();
    } else {
      // 否则，调度批量发送
      this.scheduleFlush();
    }
  }

  /**
   * 调度批量发送
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = window.setTimeout(() => {
      this.flush();
      this.flushTimer = undefined;
    }, this.config.flushInterval);
  }

  /**
   * 批量发送
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    // 取出要发送的事件（最多 maxBatchSize 个）
    const batch = this.queue.splice(0, this.config.maxBatchSize);

    try {
      console.log(`[Tracker] Flushing ${batch.length} events`);
      await this.bridge.call('trackBatch', { events: batch });

      // 发送成功，更新持久化
      if (this.config.enablePersistence) {
        this.persistQueue();
      }
    } catch (error) {
      console.error('[Tracker] Flush failed:', error);

      // 发送失败，重新加入队列
      this.queue.unshift(...batch);

      // 更新持久化
      if (this.config.enablePersistence) {
        this.persistQueue();
      }
    }
  }

  /**
   * 持久化队列到 localStorage
   */
  private persistQueue(): void {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[Tracker] Persist queue failed:', error);
    }
  }

  /**
   * 从 localStorage 恢复队列
   */
  private restoreQueue(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`[Tracker] Restored ${this.queue.length} events from storage`);
      }
    } catch (error) {
      console.error('[Tracker] Restore queue failed:', error);
    }
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
    if (this.config.enablePersistence) {
      localStorage.removeItem(this.config.storageKey);
    }
  }

  /**
   * 获取队列大小
   */
  get queueSize(): number {
    return this.queue.length;
  }

  dispose(): void {
    // 清除定时器
    if (this.flushTimer) {
      this.disposables.add({ dispose: () => clearInterval(this.flushTimer!) });
      this.flushTimer = undefined;
    }

    // 最后一次发送
    this.flush();

    this.disposables.dispose();
  }
}

/**
 * 常用埋点事件封装
 */
export class TrackerHelpers {
  constructor(private tracker: TrackerService) { }

  /**
   * 页面浏览
   */
  trackPageView(pageName: string, params?: Record<string, any>): void {
    this.tracker.track('PAGE_VIEW', {
      pageName,
      ...params,
    });
  }

  /**
   * 组件曝光
   */
  trackExposure(componentType: string, componentId: string, params?: Record<string, any>): void {
    this.tracker.track('COMPONENT_EXPOSURE', {
      componentType,
      componentId,
      ...params,
    });
  }

  /**
   * 点击事件
   */
  trackClick(componentType: string, componentId: string, params?: Record<string, any>): void {
    this.tracker.track('CLICK', {
      componentType,
      componentId,
      ...params,
    });
  }

  /**
   * 错误上报
   */
  trackError(error: Error, context?: Record<string, any>): void {
    this.tracker.track('ERROR', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }

  /**
   * 性能指标
   */
  trackPerformance(metric: string, value: number, params?: Record<string, any>): void {
    this.tracker.track('PERFORMANCE', {
      metric,
      value,
      ...params,
    });
  }
}
