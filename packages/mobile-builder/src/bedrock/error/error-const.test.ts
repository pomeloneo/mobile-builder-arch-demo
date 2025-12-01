import { bizErrorConst } from './error-const';

const NETWORK_CODE = 404;
const NETWORK_MSG = 'network error';

const networkError = bizErrorConst(NETWORK_CODE, NETWORK_MSG);

describe('BizErrorConst', () => {
  test('creates runtime error', () => {
    const err = networkError();
    expect(err.ok).toBe(false);
    expect(err.code).toBe(NETWORK_CODE);
    expect(err.msg).toBe(NETWORK_MSG);
    if (!err.ok) {
      expect(err.code).toBe(NETWORK_CODE);
      expect(err.msg).toBe(NETWORK_MSG);
    }
  });

  test('creates runtime error with overridden message', () => {
    const err = networkError('new error msg');
    expect(err.ok).toBe(false);
    expect(err.code).toBe(NETWORK_CODE);
    expect(err.msg).toBe('new error msg');
    if (!err.ok) {
      expect(err.code).toBe(NETWORK_CODE);
      expect(err.msg).toBe('new error msg');
    }
  });
});
