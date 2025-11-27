/**
 * 针对未捕获的错误，异步抛出，不阻塞事件响应主流程
 * 默认模式
 */
export function asyncUnexpectedError(e: any): void {
  setTimeout(() => {
    throw e;
  }, 0);
}

/**
 * 针对未捕获的错误，同步抛出，阻塞事件响应主流程
 */
export function syncUnexpectedError(e: any): void {
  throw e;
}

/**
 * 针对未捕获的错误，静默掉，不进行处理
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function ignoreUnexpectedError(e: any): void {}
