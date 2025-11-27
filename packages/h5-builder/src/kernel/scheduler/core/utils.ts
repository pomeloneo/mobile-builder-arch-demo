// Max 31 bit integer. The max integer size in V8 for 32-bit systems.
// Math.pow(2, 30) - 1

import { Task } from './task';
import { PriorityLevel, type IScheduledCallback, type IOptions } from '../type';

// 0b111111111111111111111111111111
const maxSigned31BitInt = 1073741823;

// Times out immediately
const IMMEDIATE_PRIORITY_TIMEOUT = -1;
// Eventually times out
const USER_BLOCKING_PRIORITY_TIMEOUT = 250;
const NORMAL_PRIORITY_TIMEOUT = 5000;
const LOW_PRIORITY_TIMEOUT = 10000;
// Never times out
const IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;

export function getCurrentTime() {
  return Date.now();
}

export function getTimeout(priorityLevel: PriorityLevel = PriorityLevel.NormalPriority) {
  switch (priorityLevel) {
    case PriorityLevel.ImmediatePriority:
      return IMMEDIATE_PRIORITY_TIMEOUT;
    case PriorityLevel.UserBlockingPriority:
      return USER_BLOCKING_PRIORITY_TIMEOUT;
    case PriorityLevel.IdlePriority:
      return IDLE_PRIORITY_TIMEOUT;
    case PriorityLevel.LowPriority:
      return LOW_PRIORITY_TIMEOUT;
    case PriorityLevel.NormalPriority:
    default:
      return NORMAL_PRIORITY_TIMEOUT;
  }
}

export function makeTask(callback: IScheduledCallback, options: IOptions = {}) {
  const currentTime = getCurrentTime();
  const delay = options.delay ?? 0;
  const timeout = getTimeout(options.priorityLevel);
  const startTime = delay + currentTime;
  const expirationTime = startTime + timeout;

  const newTask = new Task(callback, startTime, expirationTime);
  return newTask;
}
