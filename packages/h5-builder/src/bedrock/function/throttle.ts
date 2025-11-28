import { debounce } from './debounce';

interface ThrottleSettings {
  leading?: boolean | undefined;
  maxWait?: number | undefined;
  trailing?: boolean | undefined;
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  _wait?: number,
  _options?: ThrottleSettings,
) {
  let leading = true;
  let trailing = true;
  if (_options) {
    leading = _options.leading ?? leading;
    trailing = _options.trailing ?? trailing;
  }

  return debounce(func, _wait, {
    leading,
    maxWait: _options?.maxWait,
    trailing,
  });
}
