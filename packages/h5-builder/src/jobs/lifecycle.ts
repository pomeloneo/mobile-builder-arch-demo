export enum PageLifecycle {
  Open = "页面打开，一般在此处理处理最前置任务，比如获取页面 schema",      // 页面打开，一般在此处理处理最前置任务，比如获取页面 schema
  LoadComponentLogic = "加载组件逻辑Model", // 加载组件逻辑Model
  Prepare = "构建模型树（也就是逻辑树)、同时加载组件视图",   // 构建模型树（也就是逻辑树)、同时加载组件视图
  RenderReady = "模型树和视图资源全部准备完成",    // 模型树和视图资源全部准备完成
  Render = "启动渲染",     // 启动渲染
  Completed = "无数据填充渲染任务完成",     // 无数据填充渲染任务完成
  Idle = "空闲阶段",     // 空闲阶段，处理闲时任务
}
