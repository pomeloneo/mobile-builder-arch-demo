import type { IBizErrorRef, IBizErrorOr, ILvRealErrorRef } from './error-base';

//
// Error类
//
// 用户给函数签名明确错误
// function foo(): IBizErrorRef
//   return makeOk();  // 如果没有错误
//   return makeError(code, msg);  // 指定错误码和携带消息
//
//   const SomeError = BizErrorConst(code, msg);  // 更推荐用BizErrorConst生成
//   return SomeError();
//

const bizErrorRefSymbol = Symbol('bizErrorRef');

function findJsError(error: IBizErrorRef | Error) {
  let obj: IBizErrorRef | Error | undefined = error;
  while (obj) {
    if (obj instanceof Error) {
      return obj;
    }
    obj = (obj as IBizErrorRef).cause;
  }
  // 如果没有Error，那就序列化bizError
  return new Error((error as IBizErrorRef).toString());
}

export function makeOk<K>(): IBizErrorOr<never, K> {
  return {
    ok: true,
    value: null!,
    pair() {
      return [null, null!];
    },
    code: 0,
    msg: '',
    ...{ [bizErrorRefSymbol]: true }, // 跳过类型检测
  };
}

export function makeOkWith<T, K = unknown>(value: T): IBizErrorOr<T, K> {
  return {
    ok: true,
    value,
    pair() {
      return [null, value];
    },
    code: 0,
    msg: '',
    ...{ [bizErrorRefSymbol]: true }, // 跳过类型检测
  };
}

function printCause(cause: IBizErrorRef | Error | undefined): string {
  if (cause === undefined) {
    return '';
  } else if (cause instanceof Error) {
    return `\ncaused by [jsError]${cause.name}-${cause.message}`;
  } else {
    return `\ncaused by [${cause.code}]${cause.msg}${cause.ok ? '' : printCause(cause.cause)}`;
  }
}

function internalMakeError<T>(code: number, msg: string, cause?: IBizErrorRef | Error, errorInfo?: T) {
  const errorRef: ILvRealErrorRef<T> = {
    ok: false,
    code,
    msg,
    cause,
    errorInfo,
    toString() {
      return `[${code}]${msg}.${cause ? printCause(cause) : ''}`;
    },
    pair() {
      return [errorRef, null];
    },
    stack: cause instanceof Error ? cause.stack : undefined,
    findJsError: () => findJsError(errorRef),
    ...{ [bizErrorRefSymbol]: true }, // 跳过类型检测
  };
  return errorRef;
}

export function makeError<T = unknown>(code: number, msg: string, errorInfo?: T): ILvRealErrorRef<T> {
  return internalMakeError(code, msg, undefined, errorInfo);
}

export function makeErrorBy<T = unknown>(
  code: number,
  msg: string,
  cause: IBizErrorRef | Error,
  errorInfo?: T,
): ILvRealErrorRef<T> {
  return internalMakeError(code, msg, cause, errorInfo);
}

export function isBizErrorRef(val: unknown): val is IBizErrorRef {
  return typeof val === 'object' && val !== null && bizErrorRefSymbol in val;
}
