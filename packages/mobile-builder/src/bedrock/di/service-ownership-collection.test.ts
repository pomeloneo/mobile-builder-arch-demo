import { createDecorator } from './base';
import { ServiceOwnershipCollection, ServiceOwnership } from './service-ownership-collection';

class Foo {}
class Bar {}

const IFoo = createDecorator<Foo>('foo');
const IBar = createDecorator<Bar>('bar');

describe('service collection', () => {
  it('success', () => {
    const collection = new ServiceOwnershipCollection();
    expect(collection.has(IFoo)).toBe(false);

    collection.set(IFoo, ServiceOwnership.Owned);
    expect(collection.has(IFoo)).toBe(true);
    expect(collection.get(IFoo)).toBe(ServiceOwnership.Owned);

    collection.set(IFoo, ServiceOwnership.Reference);
    expect(collection.get(IFoo)).toBe(ServiceOwnership.Reference);
  });

  it('base', () => {
    const collection = new ServiceOwnershipCollection(
      [IFoo, ServiceOwnership.Owned],
      [IBar, ServiceOwnership.Reference],
    );

    expect(collection.has(IFoo)).toBe(true);
    expect(collection.has(IBar)).toBe(true);
    expect(collection.get(IFoo)).toBe(ServiceOwnership.Owned);
    expect(collection.get(IBar)).toBe(ServiceOwnership.Reference);

    const ownership = collection.entries;
    expect(ownership.size).toBe(2);
    expect(ownership.get(IFoo)).toBe(ServiceOwnership.Owned);
    expect(ownership.get(IBar)).toBe(ServiceOwnership.Reference);
  });
});
