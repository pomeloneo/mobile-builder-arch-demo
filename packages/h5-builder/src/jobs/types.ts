export enum PageLifecycle {
  Open = 0,      // 组件资源加载
  Prepare = 1,   // 构建模型树
  Ready = 2,     // 视图加载完成（暂未使用）
  Completed = 3, // 数据初始化
  Idle = 4,      // 闲时任务（暂未使用）
}
