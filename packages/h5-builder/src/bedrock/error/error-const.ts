import { makeError, makeErrorBy } from './error-t';

//
// Error编译时错误对象
//
export function lvErrorConst(code: number, msg: string) {
  return (rewrite?: string | Error) => {
    if (!rewrite) {
      return makeError(code, msg);
    }
    if (typeof rewrite === 'string') {
      return makeError(code, rewrite);
    }
    return makeErrorBy(code, rewrite.message, rewrite);
  };
}
