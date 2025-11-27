export enum PageLifecycle {
  Open = 0,      // 页面打开，一般在此处理处理最前置任务，比如获取页面 schema
  LoadComponentLogic = 1, // 加载组件逻辑Model
  Prepare = 2,   // 构建模型树（也就是逻辑树）
  StartRender = 3,    //  开始上屏渲染
  RenderCompleted = 4,     // 上屏渲染完成
  Report = 5,     // 上报
  Idle = 6,     // 闲时任务
}
