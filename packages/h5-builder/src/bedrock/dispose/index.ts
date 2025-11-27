// dispose核心接口
export type { IDisposable } from './dispose-base';

// 记录持有关系的核心数据结构
export { DisposableStore } from './disposable-store';

// dispose常用类型
// 可以作为IDisposable的基类，自带disposableStore
export { Disposable } from './disposable-t';

// 容器类，允许替换内部的IDisposable，每次替换时，旧value自动dispose
export { MutableDisposable } from './disposable-t';

// 容器类，内部IDisposable对象最多只执行一次dispose
export { SafeDisposable } from './disposable-t';
export { makeSafeDisposable } from './disposable-utils';

// 容器类，表示一个IDisposable的转移
export { TransferDisposable } from './disposable-t';
export { makeTransferDisposable } from './disposable-utils';

// 辅助常量，空的IDisposable对象
export { EmptyDispose } from './dispose-base';

// 辅助函数，判断是否是disposable对象
export { isDisposable } from './disposable-utils';

// 辅助函数，定时器disposable化
export { setDisposableTimeout } from './timer';
export { setDisposableInterval } from './timer';

// 开发阶段辅助函数，忽略disposable泄漏检测
export { ignoreDispose } from './disposable-utils';
export { enableTrack, disableTrack, SET_PARENT_OF_DISPOSABLE } from './tracker';
