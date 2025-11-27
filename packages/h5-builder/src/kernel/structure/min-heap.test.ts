import { MinHeap } from './min-heap';

describe('MinHeap', () => {
  let heap: MinHeap<number>;

  beforeEach(() => {
    heap = new MinHeap();
  });

  test('insert adds a value and sifts it up the heap', () => {
    heap.insert(2);
    expect(heap.peek()).toEqual(2);

    heap.insert(3);
    expect(heap.peek()).toEqual(2);

    heap.insert(1);
    expect(heap.peek()).toEqual(1);
  });

  test('peek returns the minimum value without removing it', () => {
    expect(heap.peek()).toBeNull();

    heap.insert(1);
    expect(heap.peek()).toEqual(1);

    heap.insert(0);
    expect(heap.peek()).toEqual(0);

    heap.remove();
    expect(heap.peek()).toEqual(1);
  });

  test('remove extracts the minimum value and returns it', () => {
    expect(heap.remove()).toBeNull();

    heap.insert(2);
    heap.insert(3);
    heap.insert(1);

    expect(heap.remove()).toBe(1);
    expect(heap.remove()).toBe(2);
    expect(heap.remove()).toBe(3);
    expect(heap.remove()).toBeNull();
  });

  test('size returns the number of elements in the heap', () => {
    expect(heap.size()).toBe(0);

    heap.insert(2);
    heap.insert(3);
    expect(heap.size()).toBe(2);

    heap.remove();
    expect(heap.size()).toBe(1);
  });

  test('heap maintains the heap property on inserts and removes', () => {
    heap.insert(3);
    heap.insert(4);
    heap.insert(5);
    heap.insert(1);
    heap.insert(2);

    expect(heap.remove()).toEqual(1);
    expect(heap.remove()).toEqual(2);
    expect(heap.remove()).toEqual(3);
    expect(heap.remove()).toEqual(4);
    expect(heap.remove()).toEqual(5);
  });
});
