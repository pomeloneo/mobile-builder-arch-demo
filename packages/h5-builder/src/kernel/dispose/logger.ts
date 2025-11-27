import { Logger } from '@/kernel/_internal/logger';
import type { IDisposable } from './dispose-base';

let disposableLogger: IDisposableLogger | null = null;

export interface IDisposableLogger {
  branch: (from: string, to: string) => void;
  end: () => void;
}

function setDisposableLogger(logger: IDisposableLogger | null): void {
  disposableLogger = logger;
}

function makeDefaultLogger() {
  return new (class implements IDisposableLogger {
    private readonly _dep: [string, string][] = [];

    branch(from: string, to: string): void {
      this._dep.push([from, to]);
    }

    end(): void {
      Logger.log(this._dep);
    }
  })();
}

// 辅助能力 dispose触发时记录
export function BRANCH_DISPOSE(from: string, to: string) {
  disposableLogger?.branch(from, to);
}

export function disposeWithLog<T extends IDisposable>(x: T, logger: IDisposableLogger = makeDefaultLogger()) {
  setDisposableLogger(logger);
  x.dispose();
  logger.end();
  setDisposableLogger(null);
}
