/* eslint-disable no-console */

export const Logger = {
  error(...data: any[]): void {
    if (typeof console.error === 'function') {
      console.error(...data);
    }
  },
  info(...data: any[]): void {
    if (typeof console.info === 'function') {
      console.info(...data);
    }
  },
  log(...data: any[]): void {
    if (typeof console.log === 'function') {
      console.log(...data);
    }
  },
  time(label?: string): void {
    if (typeof console.time === 'function') {
      console.time(label);
    }
  },
  timeEnd(label?: string): void {
    if (typeof console.timeEnd === 'function') {
      console.timeEnd(label);
    }
  },
  timeLog(label?: string, ...data: any[]): void {
    if (typeof console.timeLog === 'function') {
      console.timeLog(label, ...data);
    }
  },
  timeStamp(label?: string): void {
    if (typeof console.timeStamp === 'function') {
      console.timeStamp(label);
    }
  },
  trace(...data: any[]): void {
    if (typeof console.trace === 'function') {
      console.trace(...data);
    }
  },
  warn(...data: any[]): void {
    if (typeof console.warn === 'function') {
      console.warn(...data);
    }
  },
  profile(label?: string): void {
    if (typeof console.profile === 'function') {
      console.profile(label);
    }
  },
  profileEnd(label?: string): void {
    if (typeof console.profileEnd === 'function') {
      console.profileEnd(label);
    }
  },
};
