import { EmptyDispose, type IDisposable } from '@/bedrock/dispose';
import type { Event } from '@/bedrock/event';
import { Emitter } from '@/bedrock/event';

//
// 任何可取消的异步调用 的令牌接口
// 因为异步调用无法真正意义上取消，但是可以在异步任务的回调中增加该令牌作为参数
// 以便在操作被取消时停止执行
//
export interface ICancellationToken {
  // 标记是否进行过了cancel
  readonly isCancellationRequested: boolean;

  // 取消的原因
  readonly reason?: string;

  // 令牌调用cancel后触发的回调
  // 有如下特点
  // 1. 只会触发一次
  // 2. 当监听的时候token已经cancelled，仍然会触发一次
  readonly onCancellationRequested: (
    listener: () => any,
    thisArgs?: any,
    disposables?: IDisposable[],
  ) => IDisposable;
}

//
// 编译时常量，一个快捷的事件响应
// 用于当外界监听令牌取消时，直接触发回调
//
const shortcutEvent: Event<[]> = Object.freeze(function (callback, context?): IDisposable {
  const handle = setTimeout(callback.bind(context), 0);

  return {
    dispose() {
      clearTimeout(handle);
    },
  };
});

//
// 可取消异步调用的令牌实现
// 默认是未取消状态，可以调用cancel进行取消
//
class MutableToken implements ICancellationToken, IDisposable {
  // 是否已经取消该异步调用
  private _isCancelled = false;
  private _emitter: Emitter<[]> | null = null;
  private _reason?: string;

  public get reason(): undefined | string {
    return this._reason;
  }

  // 获取当前是否已经取消该异步调用
  public get isCancellationRequested(): boolean {
    return this._isCancelled;
  }

  // 外界可以监听异步取消发起
  public get onCancellationRequested(): Event<[]> {
    if (this._isCancelled) {
      return shortcutEvent;
    }
    if (!this._emitter) {
      this._emitter = new Emitter<[]>();
    }
    return this._emitter.event;
  }

  public cancel(reason?: string) {
    if (!this._isCancelled) {
      this._reason = reason;
      this._isCancelled = true;
      if (this._emitter) {
        this._emitter.fire();
        this.dispose();
      }
    }
  }

  public dispose(): void {
    if (this._emitter) {
      this._emitter.dispose();
      this._emitter = null;
    }
  }
}

//
// 编译期提供的一些常量Token
// 不可修改
//
// eslint-disable-next-line unicorn/no-static-only-class, @typescript-eslint/no-extraneous-class
export class CancellationToken {
  static None = Object.freeze<ICancellationToken>({
    isCancellationRequested: false,
    onCancellationRequested: () => EmptyDispose,
  });

  static Cancelled = Object.freeze<ICancellationToken>({
    isCancellationRequested: true,
    onCancellationRequested: shortcutEvent,
  });

  static Make = (reason: string) => {
    return Object.freeze<ICancellationToken>({
      isCancellationRequested: true,
      onCancellationRequested: shortcutEvent,
      reason,
    });
  };
}

//
// 任何可取消的异步调用 的控制类
// 参考ICancellationToken，我们通过在异步调用的回调中添加token参数来判断异步调用的状态
// token来源于CancellationTokenSource
// CancellationTokenSource也会暴露cancel的接口
//
// 使用方式
// const tokenSource = new CancellationTokenSource();
//
// asyncCall(() => {
//   if (token.isCancellationRequested) { return; }  // 如果cancelled
//   doSomething();
// });
//
// tokenSource.cancel();  // 因为某些情况，可能会cancel
// tokenSource.dispose();  // dispose时一定会cancel
//
export class CancellationTokenSource implements IDisposable {
  // 真正的token
  private _token?: ICancellationToken = undefined;
  // 可能存在父级CancellationTokenSource
  private readonly _parentListener?: IDisposable = undefined;
  // 为了支持signal场景，所以在需要时会初始化浏览器提供的abortController原生结构
  private _abortController?: AbortController = undefined;

  constructor(parent?: ICancellationToken) {
    // 如果存在父级，当父对象cancel时，子对象也必须cancel
    this._parentListener = parent?.onCancellationRequested(this.cancel, this);
  }

  /**
   * 传统的cancellation用法
   */
  public get token(): ICancellationToken {
    if (!this._token) {
      this._token = new MutableToken();
    }
    return this._token;
  }

  /**
   * 对齐浏览器提供的abortSignal，支持给fetch、axios等传参使用
   */
  public get signal(): AbortSignal {
    if (this._abortController) {
      return this._abortController.signal;
    }
    this._abortController = new AbortController();
    if (this._token?.isCancellationRequested) {
      this._abortController.abort();
    }
    return this._abortController.signal;
  }

  public cancel(reason?: string): void {
    if (!this._token) {
      // 如果没有使用过token就直接cancel，那么就返回一个常量即可
      this._token = reason === undefined ? CancellationToken.Cancelled : CancellationToken.Make(reason);
    } else if (this._token instanceof MutableToken) {
      this._token.cancel(reason);
    }
    if (this._abortController) {
      this._abortController.abort(reason);
    }
  }

  public dispose(cancel = false): void {
    if (cancel) {
      this.cancel();
    }
    this._parentListener?.dispose();
    if (!this._token) {
      this._token = CancellationToken.None;
    } else if (this._token instanceof MutableToken) {
      this._token.dispose();
    }
  }
}
