import { createDecorator } from './base';
import { SyncDescriptor } from './descriptor';
import { ServiceCollection } from './service-collection';

class Foo {}
class Bar {}

const IFoo = createDecorator<Foo>('foo');
const IBar = createDecorator<Bar>('bar');

describe('service collection', () => {
  it('success', () => {
    const collection = new ServiceCollection();
    expect(collection.has(IFoo)).toBe(false);
    // 设置SyncDescriptor
    const descriptor = new SyncDescriptor<Foo>(Foo);
    collection.set(IFoo, descriptor);
    expect(collection.has(IFoo)).toBe(true);
    expect(collection.get(IFoo)).toBe(descriptor);

    expect(collection.has(IBar)).toBe(false);
    // 设置instance
    const bar = new Bar();
    collection.set(IBar, bar);
    expect(collection.has(IBar)).toBe(true);
  });
});
