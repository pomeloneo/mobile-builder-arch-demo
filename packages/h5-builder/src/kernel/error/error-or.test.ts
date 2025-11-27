import type { ILvErrorOr } from './error-base';
import { makeOkWith } from './error-or';

describe('LvErrorOr', () => {
  test('creates error without error state', () => {
    const result = makeOkWith<number>(3);
    expect(result.ok).toBe(true);
    const [err, value] = result.pair();
    try {
      // @ts-expect-error Should fail at compile time because error data is used without checking state
      expect(err.ok).toBe(true);
    } catch (error) {
      // err is undefined, ignore
    }

    // TODO: Should fail when using success data without checking state, but adding | null subtype is acceptable
    expect(value).toBe(3);
    if (!err) {
      // State is checked as no error, should remove | null subtype here
      value.toString();
      expect(value).toBe(3);
    }
  });

  test('creates error without error state', () => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const result = getData();
    // @ts-expect-error Should fail at compile time, haven't checked if it's ok
    const { value } = result;
    void value;
    if (result.ok) {
      // State is checked as ok, can safely use value
      result.value.toString();
    }
    if (!result.ok) {
      // State is checked as not ok, can safely use error details
      result.code.toString();
    }

    function getData(): ILvErrorOr<number> {
      return makeOkWith(42);
    }
  });
});
