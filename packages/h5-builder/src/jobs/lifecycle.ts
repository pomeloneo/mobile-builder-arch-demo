export enum PageLifecycle {
  // 页面打开，一般在此处理处理最前置任务，比如获取页面 schema
  Open = "页面打开，一般在此处理处理最前置任务，比如获取页面 schema",
  // 加载组件逻辑Model
  LoadComponentLogic = "加载组件逻辑Model",
  // 构建模型树（也就是逻辑树)、同时加载组件视图
  Prepare = "构建模型树（也就是逻辑树)、同时加载组件视图",
  // 模型树和视图资源全部准备完成
  RenderReady = "模型树和视图资源全部准备完成",
  // 启动渲染   
  Render = "启动渲染",
  // 视图数据填充阶段，暂时叫 completed，更多的是指 render 完成
  // 因为现在是渐进式渲染方案，如果要首屏直出，这个任务换到 renderReady 阶段就行了
  Completed = "视图数据填充阶段",
  // 空闲阶段，处理闲时任务
  Idle = "空闲阶段",
}
