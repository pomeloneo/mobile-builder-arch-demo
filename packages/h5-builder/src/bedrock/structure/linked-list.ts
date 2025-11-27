class ListNode<T> {
  constructor(
    public value: T,
    public next: ListNode<T> | null = null,
    public prev: ListNode<T> | null = null,
  ) {}
}

export class LinkedList<T> {
  protected _head: ListNode<T> | null = null;
  protected _tail: ListNode<T> | null = null;
  protected _count = 0;

  public get size(): number {
    return this._count;
  }

  public get firstNode(): ListNode<T> | null {
    return this._head;
  }

  public isEmpty(): boolean {
    return this._head === null;
  }

  public clear(): void {
    let current = this._head;
    while (current !== null) {
      const next = current.next;
      current.prev = null;
      current.next = null;
      current = next;
    }

    this._head = null;
    this._tail = null;
    this._count = 0;
  }

  public unshift(value: T): LinkedList<T> {
    const node = new ListNode(value);

    if (this.isEmpty()) {
      this._head = node;
      this._tail = node;
    } else {
      const oldHead = this._head;
      this._head = node;
      node.next = oldHead;
      oldHead!.prev = node;
    }

    this._count++;
    return this;
  }

  public push(value: T): LinkedList<T> {
    const node = new ListNode(value);

    if (this.isEmpty()) {
      this._head = node;
      this._tail = node;
    } else {
      const oldTail = this._tail;
      this._tail = node;
      node.prev = oldTail;
      oldTail!.next = node;
    }

    this._count++;
    return this;
  }

  public shift(): T | null {
    if (this.isEmpty()) {
      return null;
    }

    const node = this._head!;
    const value = node.value;
    this._remove(node);
    return value;
  }

  public pop(): T | null {
    if (this.isEmpty()) {
      return null;
    }

    const node = this._tail!;
    const value = node.value;
    this._remove(node);
    return value;
  }

  public toArray(): T[] {
    const result: T[] = [];
    for (const value of this) {
      result.push(value);
    }
    return result;
  }

  public *[Symbol.iterator](): Iterator<T> {
    let current = this._head;
    while (current !== null) {
      yield current.value;
      current = current.next;
    }
  }

  protected _remove(node: ListNode<T>): void {
    // 如果节点已经被移除（prev 和 next 都为 null），直接返回
    if (node.prev === null && node.next === null && node !== this._head && node !== this._tail) {
      return;
    }

    // 更新链表头尾指针
    if (node === this._head) {
      this._head = node.next;
      if (this._head) {
        this._head.prev = null;
      }
    }
    if (node === this._tail) {
      this._tail = node.prev;
      if (this._tail) {
        this._tail.next = null;
      }
    }

    // 更新相邻节点的引用
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }

    // 清理被移除节点的引用
    node.prev = null;
    node.next = null;
    this._count--;
  }
}
