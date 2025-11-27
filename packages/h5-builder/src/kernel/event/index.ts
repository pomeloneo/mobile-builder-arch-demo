// 事件触发器
export { Emitter } from './emitter';
// 事件监听
export type { Event } from './emitter';

// 状态扭转事件触发器
// 需要绑定生命周期，默认提供事件补发
export { PhaseEmitter } from './phase-emitter';
// 状态扭转事件监听
export type { PhaseEvent } from './phase-emitter';
export type { WhenPhaseEvent } from './phase-emitter';

// 快捷事件类型
export { ShortcutEventMode } from './phase-emitter';
// 辅助函数，生成快捷事件
// 生成一个异步快捷事件
export { makeAsyncShortcutEvent } from './shortcut-event-utils';
// 生成一个同步快捷事件
export { makeSyncShortcutEvent } from './shortcut-event-utils';

// 辅助函数，监听事件一次后解绑
export { listenOnce } from './once';
// 辅助函数，监听事件满足回调后解绑
export { listenWhen } from './when';
// 辅助常量，空事件监听，永不触发
export { NeverEvent } from './utils';

// 针对事件抛出过程中，遇到错误，对应的处理方案（构建Emitter对象中参数）
// 异步抛出错误
export { asyncUnexpectedError } from './error-handler';
// 同步抛出错误
export { syncUnexpectedError } from './error-handler';
// 忽略错误
export { ignoreUnexpectedError } from './error-handler';
