//
// lv项目中使用的错误类型
//

export type ILvErrorRef<K = unknown> = ILvErrorOr<never, K>;

export interface ILvRealErrorRef<K = unknown> {
  readonly ok: false;
  readonly code: number;
  readonly msg: string;
  readonly cause?: ILvErrorRef | Error;
  readonly toString: () => string;
  readonly pair: () => [ILvRealErrorRef<K>, null];
  readonly errorInfo?: K;

  /**
   * @deprecated 使用findJsError获取到jsError后再拿stack
   */
  readonly stack?: string;

  /**
   * 尽可能找到lvError对应的js错误
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
// lv项目中使用的携带值可能错误类型
//
export type ILvErrorOr<T, K = unknown> = (ILvRealErrorRef<K> | ILvValueRef<T>) & {
  readonly pair: () => [null, T] | [ILvRealErrorRef<K>, null];
};
