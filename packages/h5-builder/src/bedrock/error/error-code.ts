import { bizErrorConst } from './error-const';

/**
 * 提供了通用的错误码(+1至+256)
 *
 * 注意：这里只是提供了通用的错误码，方便服务使用，但并不是要求服务一定使用如下的错误码来表明某种错误
 */
export enum GenericError {
  Ok = 0,
  Cancelled = 1, // 操作被取消
  TimedOut = 2, // 操作超时
  PermissionDenied = 3, // 无权限
  NotSupported = 5, // 操作不支持
  OutOfRange = 7, // (参数/结果等)发生越界
  InvalidArgument = 8, // 无效参数
  NetworkFailed = 9, // 网络失败
  Interrupted = 10, // 操作被中断(捕获异常转为错误)
  ResultNil = 11, // 结果不存在(null or undefined转为错误)
}

/**
 * 通用错误码所对应的编译时常量对象(ErrorConst)
 */
export const cancelledError = bizErrorConst(GenericError.Cancelled, 'operation(s) cancelled.');
export const timeoutError = bizErrorConst(GenericError.TimedOut, 'operation(s) timed out.');
export const permissionDeniedError = bizErrorConst(GenericError.PermissionDenied, 'permission denied.');
export const notSupportedError = bizErrorConst(GenericError.NotSupported, 'operation(s) not supported.');
export const outOfRangeError = bizErrorConst(GenericError.OutOfRange, 'out of range.');
export const invalidArgumentError = bizErrorConst(GenericError.InvalidArgument, 'invalid arguments.');
export const networkFailedError = bizErrorConst(GenericError.NetworkFailed, 'network failed.');
export const interruptedError = bizErrorConst(GenericError.Interrupted, 'interrupted.');
export const resultNilError = bizErrorConst(GenericError.ResultNil, 'result is nil.');
