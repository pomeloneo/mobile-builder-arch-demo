import { LinkedList } from '@/kernel/structure/linked-list';

export class DisposableLinkedList<T> extends LinkedList<T> {
  unshiftAndGetDisposableNode(value: T): () => void {
    this.unshift(value);

    const node = this._head!;
    let hasRemoved = false;
    return (): void => {
      if (!hasRemoved) {
        hasRemoved = true;
        super._remove(node);
      }
    };
  }

  pushAndGetDisposableNode(value: T): () => void {
    this.push(value);

    const node = this._tail!;
    let hasRemoved = false;
    return (): void => {
      if (!hasRemoved) {
        hasRemoved = true;
        super._remove(node);
      }
    };
  }
}
