class Node<K, T> {
  readonly incoming = new Map<K, Node<K, T>>();
  readonly outgoing = new Map<K, Node<K, T>>();

  constructor(
    public key: K,
    public data: T,
  ) {}
}

export class Graph<K, T> {
  private readonly _nodes = new Map<K, Node<K, T>>();

  constructor(private readonly _hashFn: (element: T) => K) {}

  // 寻找所有的叶子节点
  public leafs(): Node<K, T>[] {
    const ret: Node<K, T>[] = [];
    for (const node of this._nodes.values()) {
      if (node.outgoing.size === 0) {
        ret.push(node);
      }
    }
    return ret;
  }

  // 插入一条边
  public insertEdge(from: T, to: T): void {
    const fromNode = this.lookupOrInsertNode(from);
    const toNode = this.lookupOrInsertNode(to);

    fromNode.outgoing.set(toNode.key, toNode);
    toNode.incoming.set(fromNode.key, fromNode);
  }

  // 移除某个节点
  public removeNode(data: T): void {
    const key = this._hashFn(data);
    this._nodes.delete(key);
    for (const node of this._nodes.values()) {
      node.outgoing.delete(key);
      node.incoming.delete(key);
    }
  }

  // 查找某个节点
  public lookup(data: T): Node<K, T> | undefined {
    return this._nodes.get(this._hashFn(data));
  }

  // 查找某个节点，不存在则插入
  public lookupOrInsertNode(data: T): Node<K, T> {
    const key = this._hashFn(data);
    let node = this._nodes.get(key);

    if (!node) {
      node = new Node(key, data);
      this._nodes.set(key, node);
    }

    return node;
  }

  public isEmpty(): boolean {
    return this._nodes.size === 0;
  }

  public toString(): string {
    const data: string[] = [];
    for (const [key, value] of this._nodes) {
      data.push(
        `${key}\n\t(-> incoming)[${[...value.incoming.keys()].join(', ')}]\n\t(outgoing ->)[${[
          ...value.outgoing.keys(),
        ].join(',')}]\n`,
      );
    }
    return data.join('\n');
  }

  public findCycleSlow() {
    for (const [id, node] of this._nodes) {
      const seen = new Set<K>([id]);
      const res = this._findCycle(node, seen);
      if (res) {
        return res;
      }
    }
    return undefined;
  }

  private _findCycle(node: Node<K, T>, seen: Set<K>): string | undefined {
    for (const [id, outgoing] of node.outgoing) {
      if (seen.has(id)) {
        return [...seen, id].join(' -> ');
      }
      seen.add(id);
      const value = this._findCycle(outgoing, seen);
      if (value) {
        return value;
      }
      seen.delete(id);
    }
    return undefined;
  }
}
