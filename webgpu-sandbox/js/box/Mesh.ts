import { SceneGraphNode } from './SceneGraph';

export class Mesh {
  node: SceneGraphNode;
  numIndices: number;

  color: Float32Array;

  constructor(node: SceneGraphNode, numIndices: number, color: Float32Array) {
    this.node = node;
    this.numIndices = numIndices;
    this.color = color;
  }
}
