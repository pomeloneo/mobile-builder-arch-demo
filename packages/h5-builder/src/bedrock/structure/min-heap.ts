export class MinHeap<T> {
  private readonly _heap: T[] = [];
  private readonly _compare: (a: T, b: T) => number;

  constructor(compareFunction?: (a: T, b: T) => number) {
    if (compareFunction) {
      this._compare = compareFunction;
    } else {
      this._compare = (a, b) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      };
    }
  }

  public insert(value: T): void {
    this._heap.push(value);
    this._siftUp();
  }

  public peek(): T | null {
    return this._heap.length > 0 ? this._heap[0] : null;
  }

  public remove(): T | null {
    if (this._heap.length === 0) return null;
    if (this._heap.length === 1) return this._heap.pop()!;

    const item = this._heap[0];
    this._heap[0] = this._heap.pop()!;
    this._siftDown();
    return item;
  }

  public size(): number {
    return this._heap.length;
  }

  public clear(): void {
    this._heap.length = 0;
  }

  private _getLeftChildIndex(parentIndex: number): number {
    return 2 * parentIndex + 1;
  }

  private _getRightChildIndex(parentIndex: number): number {
    return 2 * parentIndex + 2;
  }

  private _getParentIndex(childIndex: number): number {
    return Math.floor((childIndex - 1) / 2);
  }

  private _swap(indexOne: number, indexTwo: number): void {
    [this._heap[indexOne], this._heap[indexTwo]] = [this._heap[indexTwo], this._heap[indexOne]];
  }

  private _siftUp(): void {
    let index = this._heap.length - 1;
    while (index > 0 && this._compare(this._heap[this._getParentIndex(index)], this._heap[index]) > 0) {
      const parentIndex = this._getParentIndex(index);
      this._swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private _siftDown(): void {
    let index = 0;
    let smallerChildIndex = this._getLeftChildIndex(index);

    while (smallerChildIndex < this._heap.length) {
      const rightChildIndex = this._getRightChildIndex(index);
      if (
        rightChildIndex < this._heap.length &&
        this._compare(this._heap[rightChildIndex], this._heap[smallerChildIndex]) < 0
      ) {
        smallerChildIndex = rightChildIndex;
      }

      if (this._compare(this._heap[index], this._heap[smallerChildIndex]) <= 0) {
        break;
      }

      this._swap(index, smallerChildIndex);
      index = smallerChildIndex;
      smallerChildIndex = this._getLeftChildIndex(index);
    }
  }
}
