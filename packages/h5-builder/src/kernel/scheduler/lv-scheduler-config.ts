import { getScheduler } from './core/scheduler';
import type { IConfig } from './type';

export function lvSchedulerConfig(config: IConfig) {
  if (config.fps !== undefined) {
    getScheduler().executor.setFrameRate(config.fps);
  }

  if (config.enableInputPending !== undefined) {
    getScheduler().setEnableInputPending(config.enableInputPending);
  }
}

export function lvSchedulerResetConfig() {
  getScheduler().executor.resetFrameRate();
  getScheduler().setEnableInputPending(true);
}
