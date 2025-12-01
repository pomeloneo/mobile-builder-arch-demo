import type { IBizErrorOr } from './error-base';
import { makeOkWith } from './error-or';
import { isBizErrorRef, makeError, makeErrorBy, makeOk } from './error-t';

const NETWORK_CODE = 404;
const NETWORK_MSG = 'network error';

describe('BizError', () => {
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
      // Can directly convert destructured value to IBizErrorOr<string> for easy propagation
      // eslint-disable-next-line no-unused-vars
      const err2: IBizErrorOr<string> = err1;
    }
    const [err2, value2] = makeOkWith(1).pair();
    if (!err2) {
      // State is checked as OK, can directly use value
      value2.toString();
    }
  });

  test('checks if any object is BizErrorRef', () => {
    expect(isBizErrorRef(makeOk())).toBe(true);
    expect(isBizErrorRef(makeOkWith(1))).toBe(true);
    expect(isBizErrorRef(makeError(1, 'hello'))).toBe(true);
    expect(isBizErrorRef(makeErrorBy(NETWORK_CODE, NETWORK_MSG, makeError(1, 'hello')))).toBe(true);
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
      expect(isBizErrorRef(val)).toBe(false);
    });
  });

  test('finds jsError from BizErrorRef if possible', () => {
    const jsError = new Error('jsError1');
    const bizError1 = makeErrorBy(-1, 'hello', jsError);
    expect(bizError1.findJsError()).toBe(jsError);

    const bizError2 = makeErrorBy(-1, 'hello', bizError1);
    expect(bizError2.findJsError()).toBe(jsError);

    const bizError3 = makeError(-1, 'world');
    const bizError4 = makeErrorBy(-1, 'hello', bizError3);
    expect(bizError4.findJsError().message).toBe('[-1]hello.\ncaused by [-1]world');
  });
});
