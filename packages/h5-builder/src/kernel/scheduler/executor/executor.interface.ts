export interface IExecutedCallback {
  /**
   * hasTimeRemaining 该回调执行时还有没有剩余时间片
   * currentTime 执行该回调时时间
   */
  (hasTimeRemaining: boolean, currentTime: number, deadline: number): boolean;
}

export interface IExecutor {
  /**
   * 设置帧率，该值会影响每次执行的deadline
   */
  setFrameRate: (fps: number) => void;

  /**
   * 重置帧率
   */
  resetFrameRate: () => void;

  /**
   * 请求及时任务调用
   */
  requestHostCallback: (fn: IExecutedCallback) => void;

  /**
   * 取消及时任务调用
   */
  cancelHostCallback: () => void;

  /**
   * 请求延迟任务调用
   */
  requestHostTimeout: (fn: () => void, delayMs: number) => void;

  /**
   * 取消延迟任务调用
   */
  cancelHostTimeout: () => void;
}
