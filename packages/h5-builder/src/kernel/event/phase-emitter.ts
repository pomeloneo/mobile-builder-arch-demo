import { lvAssert } from '@/kernel/assert';
import { Emitter, type Event, type EmitterOptions } from './emitter';
import {
  type IMakeShortcutEvent,
  makeSyncShortcutEvent,
  makeAsyncShortcutEvent,
} from './shortcut-event-utils';
import type { IDisposable } from '@/kernel/dispose';
import { Logger } from '@/kernel/_internal/logger';

export interface IPhaseChecker<T> {
  (before: T, after: T): boolean;
}

function defaultCheck<T>(_before: T, _after: T) {
  return true;
}

/**
 * WhenPhaseEvent相比较Event有如下特点
 * 1. 增加了callback前第一个参数，可以明确listener对应的phase
 * 2. 会进行状态补发
 */
export interface WhenPhaseEvent<T> {
  (phase: T, listener: () => any): IDisposable;
}

/**
 * PhaseEvent相比较Event有如下特点
 * 1. 参数一定为空
 * 2. 会进行状态补发
 */
export type PhaseEvent = Event<[]>;

interface IPhaseEmitter {
  emitter: Emitter<[]>;
  fn: Event<[]>;
}

export enum ShortcutEventMode {
  Async,
  Sync,
}

interface IPhaseEmitterConfig<T> {
  checker?: IPhaseChecker<T>;
  shortcutEventMode?: ShortcutEventMode;
}

/**
 * 阶段状态事件触发器，相比较原始的emitter有如下不同
 * 1. 明确了事件类型一定是生命周期的扭转
 *   a. 必须传入一个枚举表示阶段状态
 *   b. 抛出的事件只能是生命周期扭转，不允许携带参数
 *
 * 2. 当状态已经到达，后监听，进行补发事件
 *
 * -------------------------
 * 注意：由于存在事件补发，所以该事件触发器其实很危险，冲击到了依赖关系
 * 本身A依赖B的某个事件，那么正确的顺序应该是：
 * B模块初始化->A模块初始化->B抛出事件->A监听到事件
 *
 * 但如果存在事件补发，以下流程表面没有问题
 * B模块初始化->B抛出事件->A模块初始化->A监听到事件
 * 实际上可能有两个问题
 *   1. A监听到的事件，并不清楚在A初始化前触发还是初始化后触发，信息丢失
 *   2. B抛出事件，A其实必须要响应，响应晚了其实也是问题
 *
 * 所以事件补发是一件非常危险的事情，不要随意补发。
 * -------------------------
 *
 * 只有状态扭转的事件可以存在合理的补发
 * A监听B的状态变更
 * 一般来说，A模块内代码的写法可能是
 * ```
 * if (B.isReady) {
 *   doSomething();
 * } else {
 *   B.onReady(doSomething);
 * }
 * ```
 * 这种情况，我们借助事件补发可以变成如下来减少代码量。
 * ```
 * B.onReady(doSomething);
 * ```
 *
 * 最经典的事件补发就是CancellationSourceToken的设计，我们将其抽象出一种通用能力。
 * 使用demo如下：
 * ```
 * enum Phase {
 *   Waiting,
 *   Eventually,
 * }
 *
 * class Foo {
 *   phaseEmitter = new PhaseEmitter<Phase>(Phase.Waiting);
 *   // 方式1，监听指定的状态到达
 *   // 外部: foo.onEventually(doSomething);
 *   onEventually = this.phaseEmitter.when(Phase.Eventually);
 *
 *   // 方式2，给予外部更高的自由度
 *   // 外部: foo.onPhase(Phase.Eventually, doSomething);
 *   onPhase = this.phaseEmitter.whenPhase;
 *
 *   // 方式3，监听变更（该方式不会补发）
 *   // 外部: foo.onPhaseChange((phase) => doSomething)
 *   onPhaseChange = this.phaseEmitter.event;
 * }
 * ```
 * 有问题联系基建侧同学。
 */
export class PhaseEmitter<T, K extends T = T> {
  private _globalEmitter?: Emitter<[T]>;
  private readonly _phaseEmitterMap: Map<K, IPhaseEmitter> = new Map();
  private _phaseEvent?: WhenPhaseEvent<T>;
  private readonly _shortcutEvent: IMakeShortcutEvent<T>;

  constructor(
    private _currentPhase: K,
    config: IPhaseEmitterConfig<T> = {},
    private readonly _phaseChecker: IPhaseChecker<T> = defaultCheck,
    private readonly _options?: EmitterOptions,
  ) {
    this._phaseChecker = config.checker ?? defaultCheck;

    const shortcutEventMode = config.shortcutEventMode ?? ShortcutEventMode.Async;
    this._shortcutEvent =
      shortcutEventMode === ShortcutEventMode.Async ? makeAsyncShortcutEvent : makeSyncShortcutEvent;
  }

  get currentPhase() {
    return this._currentPhase;
  }

  get event(): Event<[T]> {
    if (!this._globalEmitter) {
      this._globalEmitter = new Emitter<T[]>();
    }
    return this._globalEmitter!.event;
  }

  get whenPhase(): WhenPhaseEvent<T> {
    if (this._phaseEvent) {
      return this._phaseEvent;
    }

    this._phaseEvent = (phase: T, listener: () => any) => {
      if (this._currentPhase === phase) {
        return this._shortcutEvent(this._currentPhase)(listener);
      }
      if (!this._phaseEmitterMap.has(phase as K)) {
        this._setPhaseEmitter(phase as K);
      }
      return this._phaseEmitterMap.get(phase as K)!.fn(listener);
    };

    return this._phaseEvent;
  }

  when(phase: K): PhaseEvent {
    if (this._currentPhase === phase) {
      return this._shortcutEvent(phase);
    }

    if (!this._phaseEmitterMap.has(phase)) {
      this._setPhaseEmitter(phase);
    }
    return this._phaseEmitterMap.get(phase)!.fn;
  }

  dispose(): void {
    for (const [_phase, emitter] of this._phaseEmitterMap) {
      emitter.emitter.dispose();
    }
    this._globalEmitter?.dispose();
  }

  setPhase(phase: K): void {
    if (this._currentPhase === phase) {
      Logger.warn(`duplicate set phase: ${phase}.`);
      return;
    }
    lvAssert(this._phaseChecker(this._currentPhase, phase));
    this._currentPhase = phase;
    this._phaseEmitterMap.get(phase)?.emitter.fire();
    this._globalEmitter?.fire(phase);
  }

  /**
   * 该接口为了和emitter对齐，优先使用setPhase
   * @deprecated 优先使用setPhase，未来可能会去掉
   */
  fire(phase: K): void {
    this.setPhase(phase);
  }

  private _setPhaseEmitter(phase: K) {
    const emitter = new Emitter<[]>(this._options);
    this._phaseEmitterMap.set(phase, {
      emitter,
      fn: (listener: () => any) => {
        if (this._currentPhase === phase) {
          return this._shortcutEvent(this._currentPhase)(listener);
        }
        return emitter.event(listener);
      },
    });
  }
}
