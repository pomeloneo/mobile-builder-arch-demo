// 任务调度的优先级，从高到低
export enum PriorityLevel {
  /** 立即执行任务的优先级 */
  ImmediatePriority,
  /** 用户阻塞的优先级 */
  UserBlockingPriority,
  /** 普通优先级 */
  NormalPriority,
  /** 低优先级 */
  LowPriority,
  /** 闲置优先级 */
  IdlePriority,
}

export interface IOptions {
  delay?: number;
  priorityLevel?: PriorityLevel;
}

export interface IConfig {
  fps?: number;
  enableInputPending?: boolean;
}

export interface IScheduledCallback {
  /**
   * @param chunkScheduler 分片调度器
   * @param didUserCallbackTimeout 该callback执行时，是否已经超过了注册时设置的过期时间
   * @param remainingTime 该callback执行时，当前调度loop中剩余的可用时间
   */
  (chunkScheduler: IChunkScheduler, didUserCallbackTimeout: boolean, remainingTime: number): void;
}

/**
 * 分片调度器
 * 支持将某个大的宏任务，拆成小的粒度执行
 */
export interface IChunkScheduler {
  /**
   * 在分片结束状态下，启动一个新的任务进入调度器
   */
  execute: (callback: IScheduledCallback, options?: IOptions) => void;

  /**
   * 在分片结束状态下，延续当前任务（本质上是立即执行任务）
   */
  continueExecute: (callback: IScheduledCallback) => void;
}
