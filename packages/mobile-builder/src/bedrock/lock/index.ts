// 读写能力的互斥量，实现读写锁的能力
export { SharedMutex } from './shared-mutex';

// 可解锁的句柄
export type { IUnlockable } from './utils';

// 转移独享锁控制权
export { transferLock } from './utils';
// 尝试转移独享锁控制权
export { tryTransferLock } from './utils';

// 转移共享锁控制权
export { transferSharedLock } from './utils';
// 尝试转移共享锁控制权
export { tryTransferSharedLock } from './utils';
