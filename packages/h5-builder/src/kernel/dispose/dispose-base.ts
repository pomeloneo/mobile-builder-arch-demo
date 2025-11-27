//
// Disposable特征约束
//
export interface IDisposable {
  dispose: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const EmptyDispose = Object.freeze<IDisposable>({ dispose() {} });
