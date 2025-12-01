// 任务调度优先级
export { PriorityLevel } from './type';

// 分片调度器
export type { IChunkScheduler, IOptions as ISchedulerCallbackOptions } from './type';

// 执行一个调度任务
export { lvSchedulerCallback } from './lv-scheduler-callback';
export type { ILvCallbackToken } from './lv-scheduler-callback';

// 设置调度器配置
export { lvSchedulerConfig } from './lv-scheduler-config';

// 重置调度器配置
export { lvSchedulerResetConfig } from './lv-scheduler-config';
