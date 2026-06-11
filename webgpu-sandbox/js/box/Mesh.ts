import { SceneGraphNode } from './SceneGraph';

export interface MeshData {
  color: Float32Array;
}

export class Mesh {
  node: SceneGraphNode;
  /**
   * Unit mesh vertices (x, y, z) in clip space
   */
  vertexData: Float32Array;
  /**
   * Mesh indices
   */
  indexData: Uint16Array;
  /**
   * The number of indices in the mesh
   */
  numIndices: number;
  /**
   * Per-instance data (color, etc.)
   */
  data: MeshData;
  /**
   * GPU vertex buffer for this mesh
   */
  gpuVertexBuffer: GPUBuffer | null = null;
  /**
   * GPU index buffer for this mesh
   */
  gpuIndexBuffer: GPUBuffer | null = null;

  constructor(node: SceneGraphNode, vertexData: Float32Array, indexData: Uint16Array, data: MeshData) {
    this.node = node;
    this.vertexData = vertexData;
    this.indexData = indexData;
    this.numIndices = indexData.length;
    this.data = data;
  }
}
