import vertexShaderSource from './vertex.wgsl';
import fragmentShaderSource from './fragment.wgsl';

import { Geometry } from './Geometry';
import { Matrix4 } from './Matrix';
import { SceneGraphNode, NodeTransformation, Transformations } from './SceneGraph';
import { Mesh } from './Mesh';
import { UNIT_RECT_VERTICES, UNIT_RECT_INDICES } from './shapes';
import { resizeCanvasToDisplaySize, parseColorToRGBA } from './utils';
import type { ColorLike, Settings } from './types';
import { type OrbitCamera } from './OrbitCamera';

const BYTES_PER_FLOAT = 4;
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
  readonly transformMatrix: Matrix4;
  readonly root: SceneGraphNode;

  #camera: OrbitCamera | null = null;
  #scratchMatrix = new Matrix4();

  #gpu: GPUInitialized | null = null;
  #instanceInfos: InstanceInfo[] = [];

  #vertexBuffer: GPUBuffer | null = null;
  #vertexBufferLayout: GPUVertexBufferLayout | null = null;
  #indexBuffer: GPUBuffer | null = null;

  #vertexShader: GPUShaderModule | null = null;
  #fragmentShader: GPUShaderModule | null = null;

  #bindGroupLayout: GPUBindGroupLayout | null = null;
  #pipelineLayout: GPUPipelineLayout | null = null;
  #renderPipeline: GPURenderPipeline | null = null;

  constructor(canvas: HTMLCanvasElement) {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported on this browser.');
    }

    this.canvas = canvas;
    this.root = new SceneGraphNode('root');
    this.geometry = new Geometry();
    this.transformMatrix = new Matrix4();

    this.settings = {
      useOrthographic: false,
      fieldOfView: this.geometry.degreesToRadians(100),
      zoom: 1,
      orthographicHeight: 1000,
      orthographicTranslation: new Float32Array([0, 0, 0]),
      translation: new Float32Array([0, 0, -600]),
      scale: new Float32Array([1, 1, 1]),
      rotation: this.geometry.degreesToRadians(0),
    };

    this.redraw = this.redraw.bind(this);
  }

  #assertGPU(): GPUInitialized {
    if (!this.#gpu) {
      throw new Error('GPU not initialized. Call init() first.');
    }
    return this.#gpu;
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

    this.#gpu = { device, ctx, presentationFormat };

    resizeCanvasToDisplaySize(this.canvas);
  }

  async run() {
    const { device, ctx } = this.#assertGPU();

    this.#createSharedGeometry();
    this.#createBindGroupLayout();
    this.#createShaders();
    this.#createPipeline();

    this.#render(device, ctx);
  }

  /** Workaround for TS lib ArrayBufferLike vs WebGPU GPUAllowSharedBufferSource */
  #toBufferSource(data: Float32Array | Uint16Array): BufferSource {
    return data as BufferSource;
  }

  /** Create the shared geometry for the rectangles. */
  #createSharedGeometry() {
    const { device } = this.#assertGPU();

    if (!this.#vertexBuffer) {
      this.#vertexBuffer = device.createBuffer({
        label: 'Vertex Buffer',
        size: UNIT_RECT_VERTICES.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });

      device.queue.writeBuffer(this.#vertexBuffer, 0, this.#toBufferSource(UNIT_RECT_VERTICES));

      this.#vertexBufferLayout = {
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

    if (!this.#indexBuffer) {
      this.#indexBuffer = device.createBuffer({
        label: 'Index Buffer',
        size: UNIT_RECT_INDICES.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      });

      device.queue.writeBuffer(this.#indexBuffer, 0, this.#toBufferSource(UNIT_RECT_INDICES));
    }
  }

  /** Create the uniform buffer and bind group for a single geometry instance. */
  #createInstanceInfo(): InstanceInfo {
    const { device } = this.#assertGPU();

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
      layout: this.#bindGroupLayout!,
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

  #getOrCreateInstanceInfo(index: number): InstanceInfo {
    while (this.#instanceInfos.length <= index) {
      this.#instanceInfos.push(this.#createInstanceInfo());
    }
    return this.#instanceInfos[index];
  }

  #createShaders() {
    const { device } = this.#assertGPU();

    this.#vertexShader = device.createShaderModule({
      label: 'Vertex Shader',
      code: vertexShaderSource,
    });
    this.#fragmentShader = device.createShaderModule({
      label: 'Fragment Shader',
      code: fragmentShaderSource,
    });
  }

  #createBindGroupLayout() {
    const { device } = this.#assertGPU();

    this.#bindGroupLayout = device.createBindGroupLayout({
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

  #createPipeline() {
    const { device, presentationFormat } = this.#assertGPU();

    if (!this.#vertexShader || !this.#fragmentShader || !this.#vertexBufferLayout || !this.#bindGroupLayout) {
      throw new Error('Pipeline dependencies not created.');
    }

    this.#pipelineLayout = device.createPipelineLayout({
      label: 'Pipeline Layout',
      bindGroupLayouts: [this.#bindGroupLayout],
    });

    this.#renderPipeline = device.createRenderPipeline({
      label: 'Render Pipeline',
      layout: this.#pipelineLayout,
      vertex: {
        module: this.#vertexShader,
        entryPoint: 'main',
        buffers: [this.#vertexBufferLayout],
      },
      fragment: {
        module: this.#fragmentShader,
        entryPoint: 'main',
        targets: [{ format: presentationFormat }],
      },
    });
  }

  #computeViewProjection() {
    const aspect = this.canvas.width / this.canvas.height;

    if (this.#camera) {
      /**
       * Copy the OrbitCamera's matrix to the temporary matrix to keep the original Camera matrix unchanged.
       */
      this.#scratchMatrix.set(this.#camera.getMatrix().elements);
      /**
       * Make a view matrix from the camera's matrix.
       */
      this.#scratchMatrix.inverse();
      /**
       * Apply the perspective projection to the view matrix.
       */
      this.transformMatrix.perspective(this.settings.fieldOfView, aspect, 1, 2000).multiply(this.#scratchMatrix);

      return;
    }

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

  #drawMesh(device: GPUDevice, pass: GPURenderPassEncoder, instanceNdx: number) {
    const mesh = this.meshes[instanceNdx];
    const instanceInfo = this.#getOrCreateInstanceInfo(instanceNdx);

    /**
     * Copy the view-projection matrix to the temporary scratch matrix to keep the original matrix unchanged.
     */
    this.#scratchMatrix.set(this.transformMatrix.elements);
    /**
     * The vertex shader expects model-view-projection (MVP):
     * clip_position = view_projection_matrix × world_matrix × local_vertex_position
     */
    this.#scratchMatrix.multiply(mesh.node.worldMatrix);

    instanceInfo.matrixValue.set(this.#scratchMatrix.elements);
    instanceInfo.colorValue.set(mesh.color);
    device.queue.writeBuffer(instanceInfo.uniformBuffer, 0, this.#toBufferSource(instanceInfo.uniformValues));

    pass.setBindGroup(0, instanceInfo.bindGroup);
    pass.setVertexBuffer(0, this.#vertexBuffer!);
    pass.setIndexBuffer(this.#indexBuffer!, 'uint16');
    pass.drawIndexed(mesh.numIndices, 1, 0);
  }

  #render(device: GPUDevice, ctx: GPUCanvasContext) {
    if (!this.#renderPipeline) {
      throw new Error('Render pipeline not created.');
    }

    this.root.updateWorldMatrix();
    this.#computeViewProjection();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      label: 'Render Pass',
      colorAttachments: [
        {
          view: ctx.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    pass.setPipeline(this.#renderPipeline);

    for (let i = 0; i < this.meshes.length; i++) {
      this.#drawMesh(device, pass, i);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  redraw() {
    const gpu = this.#gpu;
    if (gpu && this.#renderPipeline) {
      this.#render(gpu.device, gpu.ctx);
    }
  }

  setCamera(camera: OrbitCamera) {
    this.#camera = camera;
  }

  addNode(id: string, trs: Transformations, parent: SceneGraphNode = this.root): SceneGraphNode {
    const node = new SceneGraphNode(id, new NodeTransformation(trs));
    parent.addChild(node);
    return node;
  }

  addRect(id: string, trs: Transformations, color: ColorLike, parent: SceneGraphNode = this.root) {
    const node = this.addNode(id, trs, parent);
    const mesh = new Mesh(node, UNIT_RECT_INDICES.length, parseColorToRGBA(color));
    this.meshes.push(mesh);
    return mesh;
  }

  buildCard() {
    const card = this.addNode('card', { translation: [0, 0, 0], scale: [300, 300, 1] });
    this.addRect(`${card.id}-background`, { scale: [1.4, 1.4, 1] }, '#4a5568', card);
    this.addRect(`${card.id}-inner`, { scale: [0.8, 0.8, 1] }, '#e2e8f0', card);
    return card;
  }
}
