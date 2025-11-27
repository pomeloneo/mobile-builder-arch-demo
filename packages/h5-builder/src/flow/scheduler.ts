import { IDisposable, DisposableStore } from '../bedrock/dispose';

/**
 * 任务优先级/生命周期阶段
 */
export enum JobPriority {
  Start = 0,      // 启动阶段（最先执行）
  UserInit = 1,   // 用户初始化
  Prepare = 2,    // 数据准备
  Render = 3,     // 渲染阶段
  Idle = 4,       // 闲时任务（最后执行）
}

/**
 * 任务定义
 */
export interface Job {
  name: string;
  priority: JobPriority;
  fn: () => void | Promise<void>;
}

/**
 * 任务调度器
 * 负责管理应用启动过程中的任务执行顺序，以及闲时任务调度
 */
export class JobScheduler implements IDisposable {
  private disposables = new DisposableStore();
  private jobs: Job[] = [];
  private isRunning = false;
  private currentPhase = JobPriority.Start;

  /**
   * 注册任务
   */
  register(name: string, priority: JobPriority, fn: () => void | Promise<void>): void {
    this.jobs.push({ name, priority, fn });
    // 按优先级排序（数字越小优先级越高）
    this.jobs.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 执行所有注册的任务
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      console.warn('[JobScheduler] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[JobScheduler] Starting jobs...');

    try {
      for (const job of this.jobs) {
        // 如果是闲时任务，跳过，稍后单独调度
        if (job.priority === JobPriority.Idle) {
          continue;
        }

        this.currentPhase = job.priority;
        console.log(`[JobScheduler] Running job: ${job.name} (${JobPriority[job.priority]})`);

        await job.fn();
      }

      // 所有非闲时任务执行完毕
      console.log('[JobScheduler] Main jobs completed');

      // 启动闲时任务调度
      this.scheduleIdleJobs();
    } catch (error) {
      console.error('[JobScheduler] Job execution failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 调度闲时任务
   */
  private scheduleIdleJobs(): void {
    const idleJobs = this.jobs.filter(job => job.priority === JobPriority.Idle);
    if (idleJobs.length === 0) {
      return;
    }

    console.log(`[JobScheduler] Scheduling ${idleJobs.length} idle jobs`);

    // 依次调度闲时任务
    let index = 0;
    const runNext = () => {
      if (index >= idleJobs.length) {
        console.log('[JobScheduler] All idle jobs completed');
        return;
      }

      const job = idleJobs[index++];
      this.scheduleIdleTask(async () => {
        console.log(`[JobScheduler] Running idle job: ${job.name}`);
        try {
          await job.fn();
        } catch (error) {
          console.error(`[JobScheduler] Idle job ${job.name} failed:`, error);
        }
        // 递归调度下一个
        runNext();
      });
    };

    runNext();
  }

  /**
   * 执行闲时任务（兼容性封装）
   * 优先使用 requestIdleCallback，降级使用 setTimeout
   */
  scheduleIdleTask(fn: () => void): void {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback((deadline: any) => {
        // 如果剩余时间太少，或者已经超时，则推迟到下一帧
        if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
          fn();
        } else {
          this.scheduleIdleTask(fn);
        }
      }, { timeout: 2000 }); // 2秒超时强制执行

      this.disposables.add({ dispose: () => (window as any).cancelIdleCallback(handle) });
    } else {
      // 降级方案：使用 setTimeout 模拟
      // 50ms 延迟，给主线程留出呼吸时间
      const timer = setTimeout(fn, 50);
      this.disposables.add({ dispose: () => clearTimeout(timer) });
    }
  }

  dispose(): void {
    this.disposables.dispose();
    this.jobs = [];
    this.isRunning = false;
  }
}
