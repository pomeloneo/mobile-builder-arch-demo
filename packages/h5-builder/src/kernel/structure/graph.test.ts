/* eslint-disable max-lines-per-function */
import { Graph } from './graph';

describe('Graph', () => {
  let graph: Graph<string, string>;

  beforeEach(() => {
    graph = new Graph<string, string>((v) => v);
  });

  it('should create an empty graph', () => {
    expect(graph.isEmpty()).toBe(true);
    expect(graph.toString()).toBe('');
  });

  it('should add nodes to the graph', () => {
    const nodeA = graph.lookupOrInsertNode('A');
    const nodeB = graph.lookupOrInsertNode('B');
    const nodeC = graph.lookupOrInsertNode('C');

    expect(graph.isEmpty()).toBe(false);
    expect(graph.toString().replace(/\s/g, '')).toBe(
      `
      A
        (-> incoming)[]
        (outgoing ->)[]
    
      B
        (-> incoming)[]
        (outgoing ->)[]

      C
        (-> incoming)[]
        (outgoing ->)[]`.replace(/\s/g, ''),
    );

    expect(nodeA).toBe(graph.lookup('A'));
    expect(nodeB).toBe(graph.lookup('B'));
    expect(nodeC).toBe(graph.lookup('C'));
  });

  it('should add edges to the graph', () => {
    const nodeA = graph.lookupOrInsertNode('A');
    const nodeB = graph.lookupOrInsertNode('B');
    const nodeC = graph.lookupOrInsertNode('C');

    graph.insertEdge(nodeA.data, nodeB.data);
    graph.insertEdge(nodeA.data, nodeC.data);

    expect(graph.toString().replace(/\s/g, '')).toBe(
      `
      A
        (-> incoming)[]
        (outgoing ->)[B,C]
      
      B
        (-> incoming)[A]
        (outgoing ->)[]
      
      C
        (-> incoming)[A]
        (outgoing ->)[]`.replace(/\s/g, ''),
    );
  });

  it('should remove nodes and edges from the graph', () => {
    const nodeA = graph.lookupOrInsertNode('A');
    const nodeB = graph.lookupOrInsertNode('B');
    const nodeC = graph.lookupOrInsertNode('C');
    const nodeD = graph.lookupOrInsertNode('D');

    expect(graph.isEmpty()).toBe(false);
    expect(graph.toString().replace(/\s/g, '')).toBe(
      `
      A
        (-> incoming)[]
        (outgoing ->)[]
      
      B
        (-> incoming)[]
        (outgoing ->)[]
      
      C
        (-> incoming)[]
        (outgoing ->)[]
      
      D
        (-> incoming)[]
        (outgoing ->)[]`.replace(/\s/g, ''),
    );

    graph.insertEdge(nodeA.data, nodeB.data);
    graph.insertEdge(nodeA.data, nodeC.data);
    graph.insertEdge(nodeB.data, nodeD.data);
    graph.insertEdge(nodeC.data, nodeD.data);

    expect(graph.toString().replace(/\s/g, '')).toBe(
      `
      A
        (-> incoming)[]
        (outgoing ->)[B,C]
      
      B
        (-> incoming)[A]
        (outgoing ->)[D]
      
      C
        (-> incoming)[A]
        (outgoing ->)[D]
      
      D
        (-> incoming)[B, C]
        (outgoing ->)[]`.replace(/\s/g, ''),
    );

    graph.removeNode(nodeC.data);
    expect(graph.toString().replace(/\s/g, '')).toBe(
      `
      A
        (-> incoming)[]
        (outgoing ->)[B]
      
      B
        (-> incoming)[A]
        (outgoing ->)[D]
      
      D
        (-> incoming)[B]
        (outgoing ->)[]`.replace(/\s/g, ''),
    );

    graph.removeNode(nodeD.data);
    expect(graph.toString().replace(/\s/g, '')).toBe(
      `
      A
        (-> incoming)[]
        (outgoing ->)[B]
      
      B
        (-> incoming)[A]
        (outgoing ->)[]`.replace(/\s/g, ''),
    );

    graph.removeNode(nodeA.data);
    expect(graph.toString().replace(/\s/g, '')).toBe(
      `
      B
        (-> incoming)[]
        (outgoing ->)[]`.replace(/\s/g, ''),
    );

    graph.removeNode(nodeB.data);
    expect(graph.isEmpty()).toBe(true);
  });

  it('should find the leafs of a graph', () => {
    const nodeA = graph.lookupOrInsertNode('A');
    const nodeB = graph.lookupOrInsertNode('B');
    const nodeC = graph.lookupOrInsertNode('C');
    const nodeD = graph.lookupOrInsertNode('D');

    graph.insertEdge(nodeA.data, nodeB.data);
    graph.insertEdge(nodeA.data, nodeC.data);
    graph.insertEdge(nodeB.data, nodeD.data);
    graph.insertEdge(nodeC.data, nodeD.data);

    expect(graph.leafs().length).toBe(1);
    expect(graph.leafs()[0].data).toBe(nodeD.data);

    graph.removeNode(nodeA.data);

    expect(graph.leafs().length).toBe(1);
    expect(graph.leafs()[0].data).toBe(nodeD.data);

    graph.removeNode(nodeD.data);

    expect(graph.leafs().length).toBe(2);
    expect(graph.leafs()[0].data).toBe(nodeB.data);
    expect(graph.leafs()[1].data).toBe(nodeC.data);
  });
});
