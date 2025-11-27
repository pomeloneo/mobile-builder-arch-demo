import type { ILvErrorOr } from './error-base';
import { makeOkWith } from './error-or';
import { isLvErrorRef, makeError, makeErrorBy, makeOk } from './error-t';

const NETWORK_CODE = 404;
const NETWORK_MSG = 'network error';

describe('LvError', () => {
  test('creates error without error state', () => {
    const err = makeOk();
    if (!err.ok) {
      throw new Error('should be ok');
    }
    expect(err.ok).toBe(true);
    void err.code;
    // expect(err.code).toBe(0);
    // For non-error state, toString content is undefined
    expect(err.toString()).toBe('[object Object]');
  });

  test('error without error state supports destructuring', () => {
    const result = makeOk();
    const [err, value] = result.pair();
    if (err) {
      throw new Error('should be ok');
    }
    expect(err).toBe(null);
    expect(value).toBe(null);
  });

  test('creates error with error state', () => {
    const result = makeError(NETWORK_CODE, NETWORK_MSG);
    expect(result.ok).toBe(false);

    // Supports destructuring
    const [err, value] = result.pair();
    if (!err) {
      throw new Error('should be error');
    }
    expect(err.code).toBe(NETWORK_CODE);
    expect(err.msg).toBe(NETWORK_MSG);
    expect(value).toBe(null);

    // Supports getting cause
    expect(result.toString()).toBe('[404]network error.');
  });

  test('creates error with cause', () => {
    const err0 = new Error('original error');
    const err1 = makeErrorBy(NETWORK_CODE, NETWORK_MSG, err0);
    if (err1.ok) {
      throw new Error('should be error');
    }
    const err2 = makeErrorBy(NETWORK_CODE, NETWORK_MSG, err1);
    expect(err2.ok).toBe(false);
    expect(err2.toString()).toBe(
      '[404]network error.\ncaused by [404]network error\ncaused by [jsError]Error-original error',
    );
  });

  test('type testing', () => {
    const err0 = new Error('original error');
    // eslint-disable-next-line no-unused-vars
    const [err1, value1] = makeErrorBy(NETWORK_CODE, NETWORK_MSG, err0).pair();
    try {
      // @ts-expect-error Cannot use value1 without checking error state
      value1.toString();
    } catch {
      // value1 is null, ignore this runtime error
    }

    if (err1) {
      // Can directly convert destructured value to ILvErrorOr<string> for easy propagation
      // eslint-disable-next-line no-unused-vars
      const err2: ILvErrorOr<string> = err1;
    }
    const [err2, value2] = makeOkWith(1).pair();
    if (!err2) {
      // State is checked as OK, can directly use value
      value2.toString();
    }
  });

  test('checks if any object is LvErrorRef', () => {
    expect(isLvErrorRef(makeOk())).toBe(true);
    expect(isLvErrorRef(makeOkWith(1))).toBe(true);
    expect(isLvErrorRef(makeError(1, 'hello'))).toBe(true);
    expect(isLvErrorRef(makeErrorBy(NETWORK_CODE, NETWORK_MSG, makeError(1, 'hello')))).toBe(true);
    const falsyValues = [
      undefined,
      null,
      true,
      false,
      { ok: true, value: 1 },
      { ok: false },
      'ok',
      new Error(),
    ];
    falsyValues.forEach((val) => {
      expect(isLvErrorRef(val)).toBe(false);
    });
  });

  test('finds jsError from LvErrorRef if possible', () => {
    const jsError = new Error('jsError1');
    const lvError1 = makeErrorBy(-1, 'hello', jsError);
    expect(lvError1.findJsError()).toBe(jsError);

    const lvError2 = makeErrorBy(-1, 'hello', lvError1);
    expect(lvError2.findJsError()).toBe(jsError);

    const lvError3 = makeError(-1, 'world');
    const lvError4 = makeErrorBy(-1, 'hello', lvError3);
    expect(lvError4.findJsError().message).toBe('[-1]hello.\ncaused by [-1]world');
  });
});
