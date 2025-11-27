export enum PageLifecycle {
  Open = 0,      // 组件资源加载
  Prepare = 1,   // 构建模型树
  Render = 2,    // 渲染
  Ready = 3,     // 视图加载完成（暂未使用）
  Completed = 4, // 数据初始化
  Idle = 5,      // 闲时任务（暂未使用）
}
