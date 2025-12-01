import { isBizErrorRef } from './error-t';

export function getErrorInfo(ex: unknown): {
  name: string;
  code: number;
  message: string;
  stack?: Error['stack'];
} {
  if (isNil(ex)) {
    return {
      name: 'NilError',
      code: -1,
      message: 'unknown nil exception',
    };
  }

  if (typeof ex === 'string') {
    const { code, msg } = parseCodeAndMsg(ex);
    return {
      name: 'StringError',
      code,
      message: msg,
    };
  }

  if (isLiteral(ex)) {
    return {
      name: 'LiteralError',
      code: -1,
      message: `unknown literal exception '${ex}'`,
    };
  }

  if (isBizErrorRef(ex)) {
    return {
      name: 'BizError',
      code: ex.code,
      message: `${ex.code}: ${ex.msg}`,
    };
  }


  if (isError(ex)) {
    const { code, msg } = parseCodeAndMsg(ex.message);
    return {
      name: ex.name,
      code,
      message: msg,
      stack: ex.stack,
    };
  }

  if (typeof ex === 'object' && 'message' in ex && typeof ex.message === 'string') {
    // 带 message 的错误，可能是 worker 的错误
    let stack: string | undefined;
    if ('stack' in ex && typeof ex.stack === 'string') {
      stack = ex.stack;
    }
    return {
      name: 'MessageError',
      code: -1,
      message: ex.message,
      stack,
    };
  }

  if (typeof ex === 'object') {
    return {
      name: 'ObjectError',
      code: -1,
      message: `unknown object exception '${safeStringify(ex)}'`,
    };
  }

  return {
    name: 'UnknownError',
    code: -1,
    message: `unknown exception '${ex}'`,
  };
}

export function isLiteral(value: unknown): value is string | number | boolean | bigint {
  return ['string', 'number', 'boolean', 'bigint'].includes(typeof value);
}

export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function safeStringify(ex: unknown): string {
  try {
    return JSON.stringify(ex);
  } catch (_ex: unknown) {
    return '__stringify error__';
  }
}

export function isErrCodeValid(code: number) {
  if (typeof code !== 'number') {
    return false;
  }

  if (!Number.isFinite(code)) {
    return false;
  }
  if (code > Number.MAX_SAFE_INTEGER) {
    return false;
  }
  if (code < Number.MIN_SAFE_INTEGER) {
    return false;
  }
  return code !== 0;
}

export function parseCodeAndMsg(errMsg: string): {
  code: number;
  msg: string;
} {
  const defaultRet = {
    code: -1,
    msg: errMsg,
  };
  try {
    // case#1 -1: errmsg
    if (errMsg.includes(':')) {
      // biome-ignore lint/style/useNumberNamespace: 只解析字符串最前面的数字，所以用 parseInt
      const code = Number.parseInt(errMsg);
      if (isErrCodeValid(code)) {
        return {
          code,
          msg: errMsg,
        };
      }
    }

    // case#2 code:-1, msg:errmsg
    if (errMsg.startsWith('code:')) {
      const code = Number(errMsg.split(',')[0].split(':')[1]);
      if (isErrCodeValid(code)) {
        return {
          code,
          msg: errMsg,
        };
      }
    }
    return defaultRet;
  } catch (ex) {
    // ignore
    return defaultRet;
  }
}
