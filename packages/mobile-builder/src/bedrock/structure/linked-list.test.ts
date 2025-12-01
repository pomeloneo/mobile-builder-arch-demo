import { LinkedList } from './linked-list';

describe('LinkedList', () => {
  let list: LinkedList<number>;

  beforeEach(() => {
    list = new LinkedList<number>();
  });

  it('isEmpty should return true for an empty list', () => {
    expect(list.isEmpty()).toBe(true);
  });

  it('isEmpty should return false when the list contains elements', () => {
    list.push(1);

    expect(list.isEmpty()).toBe(false);
  });

  it('clear should remove all elements from the list', () => {
    list.push(1);
    list.push(2);
    list.push(3);
    list.clear();

    expect(list.isEmpty()).toBe(true);
  });

  it('unshift should add elements to the front of the list', () => {
    list.unshift(1);
    list.unshift(2);
    list.unshift(3);

    expect(list.toArray()).toEqual([3, 2, 1]);
  });

  it('push should add elements to the end of the list', () => {
    list.push(1);
    list.push(2);
    list.push(3);

    expect(list.toArray()).toEqual([1, 2, 3]);
  });

  it('shift should remove and return the first element of the list', () => {
    list.push(1);
    list.push(2);
    list.push(3);

    const value = list.shift();
    expect(value).toBe(1);
    expect(list.toArray()).toEqual([2, 3]);
  });

  it('shift should return undefined for an empty list', () => {
    const value = list.shift();
    expect(value).toBeNull();
  });

  it('pop should remove and return the last element of the list', () => {
    list.push(1);
    list.push(2);
    list.push(3);

    const value = list.pop();
    expect(value).toBe(3);
    expect(list.toArray()).toEqual([1, 2]);
  });

  it('pop should return undefined for an empty list', () => {
    const value = list.pop();
    expect(value).toBeNull();
  });
});
