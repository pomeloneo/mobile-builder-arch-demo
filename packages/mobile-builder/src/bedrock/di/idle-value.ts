import { lvSchedulerCallback, PriorityLevel } from '@/bedrock/scheduler';
import type { IDisposable } from '@/bedrock/dispose';
import { Emitter, type Event } from '@/bedrock/event';

//
// 容器类型，存放一个可以延迟初始化的值
//
export class IdleValue<T> implements IDisposable {
  private readonly _executor: () => void;
  private readonly _handle: IDisposable;
  private _executorEmitter?: Emitter<[]>;

  private _didRun = false;
  private _value?: T;
  private _error: unknown;

  constructor(executor: () => T) {
    this._executor = () => {
      try {
        this._value = executor();
      } catch (err) {
        this._error = err;
        throw err;
      } finally {
        this._didRun = true;
        if (this._value && this._executorEmitter) {
          this._executorEmitter.fire();
        }
      }
    };
    this._handle = lvSchedulerCallback(() => this._executor(), {
      priorityLevel: PriorityLevel.IdlePriority,
    });
  }

  get value(): T {
    // 如果没有run过，dispose之后再立刻执行
    if (!this._didRun) {
      this._handle.dispose();
      this._executor();
    }
    if (this._error) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw this._error;
    }
    return this._value!;
  }

  get isInitialized(): boolean {
    return this._didRun;
  }

  get onExecutor(): Event<[]> {
    if (!this._executorEmitter) {
      this._executorEmitter = new Emitter<[]>();
    }
    return this._executorEmitter.event;
  }

  dispose(): void {
    this._handle.dispose();
  }
}
