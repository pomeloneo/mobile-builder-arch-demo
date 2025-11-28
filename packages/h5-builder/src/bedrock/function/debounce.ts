interface DebounceSettings {
  leading?: boolean | undefined;
  maxWait?: number | undefined;
  trailing?: boolean | undefined;
}

interface DebounceSettingsLeading extends DebounceSettings {
  leading: true;
}

interface InvokeContext {
  func: (...args: any[]) => any;
  lastThis?: any;
  lastArgs?: any[];
  lastCallTime: number;
  lastInvokeTime: number;
  wait: number;

  maxing: boolean;
  maxWait: number;

  leading: boolean;
  trailing: boolean;
  timerId?: any;
  result: any;
}

function invokeFunc(context: InvokeContext, time: number) {
  const args = context.lastArgs ?? [];
  const thisArg = context.lastThis;
  context.lastArgs = undefined;
  context.lastThis = undefined;
  context.lastInvokeTime = time;
  context.result = context.func.apply(thisArg, args);
  return context.result;
}

function leadingEdge(context: InvokeContext) {
  // Reset any `maxWait` timer.
  context.lastInvokeTime = context.lastCallTime;
  // Start the timer for the trailing edge.
  context.timerId = setTimeout(() => {
    timerExpired(context);
  }, context.wait);
  // Invoke the leading edge.
  return context.leading ? invokeFunc(context, context.lastCallTime) : context.result;
}

function remainingWait(context: InvokeContext, time: number) {
  const timeSinceLastCall = time - context.lastCallTime;
  const timeSinceLastInvoke = time - context.lastInvokeTime;
  const timeWaiting = context.wait - timeSinceLastCall;

  return context.maxing ? Math.min(timeWaiting, context.maxWait - timeSinceLastInvoke) : timeWaiting;
}

function shouldInvoke(context: InvokeContext, time: number): boolean {
  const timeSinceLastCall = time - context.lastCallTime;
  const timeSinceLastInvoke = time - context.lastInvokeTime;

  return Boolean(
    context.lastCallTime === 0 ||
      timeSinceLastCall >= context.wait ||
      timeSinceLastCall < 0 ||
      (context.maxWait && timeSinceLastInvoke >= context.maxWait),
  );
}

function timerExpired(context: InvokeContext) {
  const time = Date.now();
  if (shouldInvoke(context, time)) {
    return trailingEdge(context, time);
  }
  // Restart the timer.
  context.timerId = setTimeout(
    () => {
      timerExpired(context);
    },
    remainingWait(context, time),
  );
}

function trailingEdge(context: InvokeContext, time: number) {
  context.timerId = undefined;

  if (context.trailing && context.lastArgs) {
    return invokeFunc(context, time);
  }
  context.lastArgs = context.lastThis = undefined;
  return context.result;
}

function cancel(context: InvokeContext) {
  if (context.timerId !== undefined) {
    clearTimeout(context.timerId);
  }
  context.lastInvokeTime = 0;
  context.lastCallTime = 0;
  context.lastArgs = undefined;
  context.lastThis = undefined;
  context.timerId = undefined;
}

function flush(context: InvokeContext) {
  return context.timerId === undefined ? context.result : trailingEdge(context, Date.now());
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  _wait?: number,
  _options?: DebounceSettings | DebounceSettingsLeading,
): {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
} {
  const wait = _wait ?? 0;
  const maxing = _options?.maxWait !== undefined;

  const context: InvokeContext = {
    func,
    wait,
    maxing,
    maxWait: maxing ? Math.max(_options.maxWait ?? 0, wait) : wait,
    leading: _options?.leading ?? false,
    trailing: _options?.trailing ?? true,
    lastInvokeTime: 0,
    lastCallTime: 0,
    result: undefined,
  };

  function debounced(...args: any[]) {
    const time = Date.now();
    const isInvoking = shouldInvoke(context, time);

    context.lastThis = this;
    context.lastArgs = args;
    context.lastCallTime = time;

    if (isInvoking) {
      if (context.timerId === undefined) {
        return leadingEdge(context);
      }
      if (_options?.maxWait !== undefined) {
        // Handle invocations in a tight loop.
        clearTimeout(context.timerId);
        context.timerId = setTimeout(() => {
          timerExpired(context);
        }, wait);
        return invokeFunc(context, context.lastCallTime);
      }
    }
    if (context.timerId === undefined) {
      context.timerId = setTimeout(() => {
        timerExpired(context);
      }, wait);
    }
    return context.result;
  }

  debounced.cancel = () => {
    cancel(context);
  };
  debounced.flush = () => {
    return flush(context);
  };
  return debounced;
}
