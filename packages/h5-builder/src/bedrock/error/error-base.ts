//
// 业务项目中使用的错误类型
//

export type IBizErrorRef<K = unknown> = IBizErrorOr<never, K>;

export interface ILvRealErrorRef<K = unknown> {
  readonly ok: false;
  readonly code: number;
  readonly msg: string;
  readonly cause?: IBizErrorRef | Error;
  readonly toString: () => string;
  readonly pair: () => [ILvRealErrorRef<K>, null];
  readonly errorInfo?: K;

  /**
   * @deprecated 使用findJsError获取到jsError后再拿stack
   */
  readonly stack?: string;

  /**
   * 尽可能找到bizError对应的js错误
   */
  readonly findJsError: () => Error;
}

//
// 没有错误时
//
type ILvValueRef<T> = {
  readonly ok: true;
  readonly code: 0;
  readonly msg: '';
  readonly cause?: undefined;
  readonly value: T;
  readonly toString: () => string;
  readonly pair: () => [null, T];
};

//
// 业务项目中使用的携带值可能错误类型
//
export type IBizErrorOr<T, K = unknown> = (ILvRealErrorRef<K> | ILvValueRef<T>) & {
  readonly pair: () => [null, T] | [ILvRealErrorRef<K>, null];
};
