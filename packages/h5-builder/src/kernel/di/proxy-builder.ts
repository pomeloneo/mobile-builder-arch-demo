import { listenOnce } from '@/kernel/event';
import type { IdleValue } from './idle-value';

//
// 快速生成一个di proxy对象，用于di中的延迟初始化能力
// 依赖idleValue容器
//
export function makeProxy<T>(valueWrapper: IdleValue<T>, ctor: any) {
  const wrapper = Object.create(null);
  const result = new Proxy(wrapper, {
    get(target: any, key: PropertyKey): any {
      if (key in target) {
        return target[key];
      }

      const obj = valueWrapper.value as any;
      let prop = obj[key];
      if (typeof prop !== 'function') {
        return prop;
      }
      prop = prop.bind(obj);
      target[key] = prop;
      return prop;
    },
    set(_target: T, p: PropertyKey, value: any): boolean {
      const obj = valueWrapper.value as any;
      obj[p] = value;
      return true;
    },
  }) as T;
  // @ts-ignore
  wrapper.__originClass__ = ctor;
  listenOnce(valueWrapper.onExecutor)(() => {
    // @ts-ignore
    wrapper.__origin__ = valueWrapper.value;
  });
  return result as T;
}
