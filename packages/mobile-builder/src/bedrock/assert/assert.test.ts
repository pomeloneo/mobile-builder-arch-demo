/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { lvAssert, lvAssertNever, lvAssertNotHere, lvAssertNotNil } from './assert';

describe('assert', () => {
  it('lvAssert', () => {
    expect(() => {
      lvAssert(false);
    }).toThrow('lvAssert(#expr is false)');

    expect(() => {
      lvAssert(true);
    }).not.toThrowError();

    expect(() => {
      const bool = true as boolean;
      lvAssert(bool);
      // assert 可以自动去掉 false
      const _true: true = bool;
      const str = 'hello' as string | undefined;
      lvAssert(str);
      // assert 可以自动去掉 undefined
      const _str: string = str;
    }).not.toThrowError();
  });

  it('lvAssertNotHere', () => {
    expect(() => {
      lvAssertNotHere();
      // @ts-expect-error 前面已经断言抛异常了，后面代码必定不会被执行，应该报错
      const _a = 1;
    }).toThrow('lvAssert(unreachable code flow)');
  });

  it('lvAssertNotNil', () => {
    expect(() => {
      lvAssertNotNil(undefined);
    }).toThrow('lvAssert(#val is nil)');

    expect(() => {
      lvAssertNotNil(null);
    }).toThrow('lvAssert(#val is nil)');

    expect(() => {
      lvAssertNotNil({});
    }).not.toThrowError();

    expect(() => {
      const nullableString = '' as string | undefined;
      lvAssertNotNil(nullableString);
      const _str: string = nullableString;
    }).not.toThrowError();
  });

  it('lvAssertNever', () => {
    enum ErrorCode {
      A,
      B,
      C,
    }

    const errorCode = ErrorCode.A as ErrorCode;
    const _handler1: () => 1 = () => {
      switch (errorCode) {
        case ErrorCode.A:
        case ErrorCode.B:
          return 1;
        default:
          // @ts-expect-error switch case 没有覆盖所有的 case，应该报错
          lvAssertNever(errorCode);
      }
    };

    const _handler2: () => 1 = () => {
      switch (errorCode) {
        case ErrorCode.A:
        case ErrorCode.B:
        case ErrorCode.C:
          return 1;
        default:
          // 已覆盖全部 case
          lvAssertNever(errorCode);
      }
    };
  });
});
