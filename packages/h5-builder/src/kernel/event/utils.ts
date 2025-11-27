import { EmptyDispose } from '@/kernel/dispose';
import type { Event } from './emitter';

export const NeverEvent: Event<[any]> = () => {
  return EmptyDispose;
};
