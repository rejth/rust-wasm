import vertexShaderSource from './vertex.wgsl';
import fragmentShaderSource from './fragment.wgsl';

import { Geometry } from './Geometry';
import { Matrix } from './Matrix';
import { Mesh, SceneGraphNode, NodeTransformation, Transformations } from './SceneGraph';
import { UNIT_RECT_VERTICES, UNIT_RECT_INDICES } from './shapes';
import { resizeCanvasToDisplaySize, parseColorToRGBA } from './utils';
import type { ColorLike, Settings } from './types';

const BYTES_PER_FLOAT = 4; // 4 bytes per float
const FLOATS_PER_VERTEX = 3; // x, y, z
const COLOR_FLOATS = 4; // r, g, b, a
const MATRIX_FLOATS = 16; // 4x4 matrix
/**
 * The stride of the vertex buffer.
 * This is for a position-only vertex layout: 3 floats (x, y, z) 4 bytes each = 12 bytes per vertex
 */
const VERTEX_STRIDE = FLOATS_PER_VERTEX * BYTES_PER_FLOAT;
/**
 * The size of the uniform buffer.
 * This is for a color and a matrix: 4 floats (r, g, b, a) 4 bytes each + 16 floats (4x4 matrix) 4 bytes each = 80 bytes
 */
const UNIFORM_BUFFER_SIZE = (COLOR_FLOATS + MATRIX_FLOATS) * BYTES_PER_FLOAT;

interface InstanceInfo {
  uniformBuffer: GPUBuffer;
  uniformValues: Float32Array;
  matrixValue: Float32Array;
  colorValue: Float32Array;
  bindGroup: GPUBindGroup;
}

type GPUInitialized = {
  device: GPUDevice;
  ctx: GPUCanvasContext;
  presentationFormat: GPUTextureFormat;
};

export class RenderManager {
  readonly canvas: HTMLCanvasElement;
  readonly geometry: Geometry;
  readonly settings: Settings;
  readonly meshes: Mesh[] = [];
  readonly transformMatrix: Matrix;
  readonly root: SceneGraphNode;

  private _gpu: GPUInitialized | null = null;
  private _instanceInfos: InstanceInfo[] = [];

  private _vertexBuffer: GPUBuffer | null = null;
  private _vertexBufferLayout: GPUVertexBufferLayout | null = null;
  private _indexBuffer: GPUBuffer | null = null;

  private _vertexShader: GPUShaderModule | null = null;
  private _fragmentShader: GPUShaderModule | null = null;

  private _bindGroupLayout: GPUBindGroupLayout | null = null;

  private _pipelineLayout: GPUPipelineLayout | null = null;
  private _renderPipeline: GPURenderPipeline | null = null;

  private _scratchMatrix = new Matrix();

  constructor(canvas: HTMLCanvasElement) {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported on this browser.');
    }

    this.canvas = canvas;
    this.root = new SceneGraphNode('root');
    this.geometry = new Geometry();
    this.transformMatrix = new Matrix();

    const boxSize = 300;
    this.settings = {
      useOrthographic: false,
      fieldOfView: this.geometry.degreesToRadians(100),
      zoom: 1,
      orthographicHeight: 1000,
      orthographicTranslation: [0, 0, 0],
      translation: [0, 0, -600],
      scale: [boxSize, boxSize, 1],
      rotation: this.geometry.degreesToRadians(0),
    };

    this.redraw = this.redraw.bind(this);
  }

  private assertGPU(): GPUInitialized {
    if (!this._gpu) {
      throw new Error('GPU not initialized. Call init() first.');
    }
    return this._gpu;
  }

  async init() {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('No appropriate GPUAdapter found.');
    }

    const device = await adapter.requestDevice();
    if (!device) {
      throw new Error('No appropriate GPUDevice found.');
    }

    const ctx = this.canvas.getContext('webgpu');
    if (!ctx) {
      throw new Error('Failed to get WebGPU context.');
    }

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({
      device,
      format: presentationFormat,
      /**
       * Enables transparency in the WebGPU canvas so the CSS background is visible instead of being fully covered.
       */
      alphaMode: 'premultiplied',
    });

    this._gpu = { device, ctx, presentationFormat };
    resizeCanvasToDisplaySize(this.canvas);
  }

  async run() {
    const { device, ctx } = this.assertGPU();

    this._createSharedGeometry();
    this._createBindGroupLayout();
    this._createShaders();
    this._createPipeline();

    this._render(device, ctx);
  }

  /** Workaround for TS lib ArrayBufferLike vs WebGPU GPUAllowSharedBufferSource */
  private toBufferSource(data: Float32Array | Uint16Array): BufferSource {
    return data as BufferSource;
  }

  /** Create the shared geometry for the rectangles. */
  private _createSharedGeometry() {
    const { device } = this.assertGPU();

    if (!this._vertexBuffer) {
      this._vertexBuffer = device.createBuffer({
        label: 'Vertex Buffer',
        size: UNIT_RECT_VERTICES.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });

      device.queue.writeBuffer(this._vertexBuffer, 0, this.toBufferSource(UNIT_RECT_VERTICES));

      this._vertexBufferLayout = {
        arrayStride: VERTEX_STRIDE,
        attributes: [
          {
            shaderLocation: 0,
            offset: 0,
            format: 'float32x3',
          },
        ],
      };
    }

    if (!this._indexBuffer) {
      this._indexBuffer = device.createBuffer({
        label: 'Index Buffer',
        size: UNIT_RECT_INDICES.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      });

      device.queue.writeBuffer(this._indexBuffer, 0, this.toBufferSource(UNIT_RECT_INDICES));
    }
  }

  /** Create the uniform buffer and bind group for a single geometry instance. */
  private _createInstanceInfo(): InstanceInfo {
    const { device } = this.assertGPU();

    const uniformBuffer = device.createBuffer({
      label: 'Instance Uniform Buffer',
      size: UNIFORM_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(UNIFORM_BUFFER_SIZE / BYTES_PER_FLOAT);
    const colorValue = uniformValues.subarray(0, COLOR_FLOATS);
    const matrixValue = uniformValues.subarray(COLOR_FLOATS, COLOR_FLOATS + MATRIX_FLOATS);

    const bindGroup = device.createBindGroup({
      label: 'Instance Bind Group',
      layout: this._bindGroupLayout!,
      entries: [
        {
          binding: 0,
          resource: { buffer: uniformBuffer },
        },
      ],
    });

    return {
      uniformBuffer,
      uniformValues,
      matrixValue,
      colorValue,
      bindGroup,
    };
  }

  private _getOrCreateInstanceInfo(index: number): InstanceInfo {
    while (this._instanceInfos.length <= index) {
      this._instanceInfos.push(this._createInstanceInfo());
    }
    return this._instanceInfos[index];
  }

  private _drawMesh(device: GPUDevice, pass: GPURenderPassEncoder, instanceNdx: number) {
    const mesh = this.meshes[instanceNdx];
    const instanceInfo = this._getOrCreateInstanceInfo(instanceNdx);

    // Copy the view-projection matrix to the temporary scratch matrix to keep the original matrix unchanged.
    this._scratchMatrix.elements.set(this.transformMatrix.elements);
    /**
     * The vertex shader expects model-view-projection (MVP):
     * clip_position = view_projection_matrix × world_matrix × local_vertex_position
     */
    this._scratchMatrix.multiply(mesh.node.worldMatrix);

    instanceInfo.matrixValue.set(this._scratchMatrix.elements);
    instanceInfo.colorValue.set(mesh.color);

    device.queue.writeBuffer(instanceInfo.uniformBuffer, 0, this.toBufferSource(instanceInfo.uniformValues));

    pass.setBindGroup(0, instanceInfo.bindGroup);
    pass.setVertexBuffer(0, this._vertexBuffer!);
    pass.setIndexBuffer(this._indexBuffer!, 'uint16');
    pass.drawIndexed(mesh.numIndices, 1, 0);
  }

  private _createShaders() {
    const { device } = this.assertGPU();

    this._vertexShader = device.createShaderModule({
      label: 'Vertex Shader',
      code: vertexShaderSource,
    });
    this._fragmentShader = device.createShaderModule({
      label: 'Fragment Shader',
      code: fragmentShaderSource,
    });
  }

  private _createBindGroupLayout() {
    const { device } = this.assertGPU();

    this._bindGroupLayout = device.createBindGroupLayout({
      label: 'Bind Group Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {},
        },
      ],
    });
  }

  private _createPipeline() {
    const { device, presentationFormat } = this.assertGPU();

    if (!this._vertexShader || !this._fragmentShader || !this._vertexBufferLayout || !this._bindGroupLayout) {
      throw new Error('Pipeline dependencies not created.');
    }

    this._pipelineLayout = device.createPipelineLayout({
      label: 'Pipeline Layout',
      bindGroupLayouts: [this._bindGroupLayout],
    });

    this._renderPipeline = device.createRenderPipeline({
      label: 'Render Pipeline',
      layout: this._pipelineLayout,
      vertex: {
        module: this._vertexShader,
        entryPoint: 'main',
        buffers: [this._vertexBufferLayout],
      },
      fragment: {
        module: this._fragmentShader,
        entryPoint: 'main',
        targets: [{ format: presentationFormat }],
      },
    });
  }

  private _computeViewProjection() {
    const aspect = this.canvas.width / this.canvas.height;

    if (this.settings.useOrthographic) {
      const halfHeight = (this.settings.orthographicHeight * 0.5) / this.settings.zoom;
      const halfWidth = halfHeight * aspect;
      this.settings.orthographicTranslation[0] = this.settings.translation[0];
      this.settings.orthographicTranslation[1] = this.settings.translation[1];
      this.settings.orthographicTranslation[2] = 0;

      this.transformMatrix
        .orthographic(-halfWidth, halfWidth, -halfHeight, halfHeight, -1, 1)
        .translate(this.settings.orthographicTranslation)
        .rotateZ(this.settings.rotation)
        .scale(this.settings.scale);
    } else {
      this.transformMatrix
        .perspective(this.settings.fieldOfView, aspect, 1, 2000)
        .translate(this.settings.translation)
        .rotateZ(this.settings.rotation)
        .scale(this.settings.scale);
    }
  }

  private _render(device: GPUDevice, ctx: GPUCanvasContext) {
    if (!this._renderPipeline) {
      throw new Error('Render pipeline not created.');
    }

    this._computeViewProjection();

    const encoder = device.createCommandEncoder();
    const renderPass = encoder.beginRenderPass({
      label: 'Render Pass',
      colorAttachments: [
        {
          view: ctx.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    renderPass.setPipeline(this._renderPipeline);

    this.root.updateWorldMatrix();

    for (let i = 0; i < this.meshes.length; i++) {
      this._drawMesh(device, renderPass, i);
    }

    renderPass.end();
    device.queue.submit([encoder.finish()]);
  }

  redraw() {
    const gpu = this._gpu;
    if (gpu && this._renderPipeline) {
      this._render(gpu.device, gpu.ctx);
    }
  }

  addNode(id: string, trs: Transformations, parent: SceneGraphNode = this.root): SceneGraphNode {
    const node = new SceneGraphNode(id, new NodeTransformation(trs));
    parent.addChild(node);
    return node;
  }

  addRect(id: string, trs: Transformations, color: ColorLike, parent: SceneGraphNode = this.root) {
    const node = this.addNode(id, trs, parent);
    const mesh = new Mesh(node, parseColorToRGBA(color), UNIT_RECT_INDICES.length);
    this.meshes.push(mesh);
    return mesh;
  }

  buildCard() {
    const card = this.addNode('card', { translation: [0, 0, 0] });
    this.addRect(`${card.id}-background`, { scale: [1.4, 1.4, 1] }, '#4a5568', card);
    this.addRect(`${card.id}-inner`, { scale: [0.8, 0.8, 1] }, '#e2e8f0', card);
    return card;
  }
}
