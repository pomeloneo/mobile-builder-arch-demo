function abort(reason: string): never {
  throw new Error(`lvAssert(${reason})`);
}

/**
 * 断言表达式为真
 * @param expr 
 * @param reason 
 */
export function lvAssert(expr: unknown, reason?: string): asserts expr {
  if (!expr) {
    abort(reason ?? '#expr is false');
  }
}

/**
 * 断言deadcode路径
 * @param reason 
 */
export function lvAssertNotHere(reason?: string): never {
  abort(reason ?? 'unreachable code flow');
}

/**
 * 断言类型不可达
 * @param member 
 * @param message 
 */
export function lvAssertNever(member: never, message = 'Illegal value:'): never {
  abort(`${message}: ${member}`);
}

/**
 * 断言变量为null或者undefined
 * @param val 
 * @param reason 
 */
export function lvAssertNotNil<T>(val: T, reason?: string): asserts val is NonNullable<T> {
  if (val === null || val === undefined) {
    abort(reason ?? '#val is nil');
  }
}
