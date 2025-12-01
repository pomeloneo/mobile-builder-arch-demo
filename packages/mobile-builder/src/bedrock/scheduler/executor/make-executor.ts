import type { IExecutor } from './executor.interface';
import { IdleCallbackExecutor } from './idle-callback-executor';
import { PostMessageExecutor } from './post-message-executor';

declare const global: {
  window?: any;
};

export function makeExecutor(): IExecutor {
  try {
    if (global.window) {
      return new PostMessageExecutor();
    }
  } catch (e) {
    // ...
  }
  return new IdleCallbackExecutor();
}
