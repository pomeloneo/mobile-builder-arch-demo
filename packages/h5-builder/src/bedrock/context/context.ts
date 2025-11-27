/**
 * Context类型
 */
export enum ContextType {
  // 入口
  Entry,
  // 事件
  Event,
  // 用户
  UserInput,
  // 自定义任务
  Task,
}

export class Context {
  private readonly _store = new Map<string, any>();

  constructor(public readonly type: ContextType = ContextType.Task) { }

  /**
   * 获取一个纯粹的上下文
   */
  background() {
    return new Context(this.type);
  }

  /**
   * 绑定信息
   */
  setValue<T>(key: string, value: T) {
    this._store.set(key, value);
  }

  /**
   * 获取信息
   */
  getValue<T>(key: string) {
    return this._store.get(key) as T | undefined;
  }
}

export function makeEntryContext() {
  return new Context(ContextType.Entry);
}

export function makeEventContext() {
  return new Context(ContextType.Event);
}

export function makeUserInputContext() {
  return new Context(ContextType.UserInput);
}

export function makeTaskContext() {
  return new Context(ContextType.Task);
}

export function makeContext() {
  return new Context();
}
