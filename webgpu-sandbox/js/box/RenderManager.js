import vertexShader from './vertex.wgsl';
import fragmentShader from './fragment.wgsl';

import { Geometry } from './Geometry.js';
import { Matrix } from './Matrix.js';

import { resizeCanvasToDisplaySize } from '../core.js';

export class RenderManager {
  constructor(canvas) {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported on this browser.');
    }

    this.canvas = canvas;
    this.geometry = new Geometry();
    this.transformMatrix = new Matrix();

    const boxSize = 300;

    this.settings = {
      useOrthographic: false,
      fieldOfView: this.geometry.degreesToRadians(100), // field of view in radians for perspective camera
      zoom: 1, // zoom factor for orthographic camera
      orthographicHeight: 1000, // visible world height when orthographic camera is enabled
      orthographicTranslation: [0, 0, 0], // translation for orthographic camera
      translation: [0, 0, -600], // pixels (x, y, z)
      scale: [boxSize, boxSize, 1], // pixels (width, height, depth)
      rotation: this.geometry.degreesToRadians(0), // z-axis rotation in radians
    };

    this.redraw = this.redraw.bind(this);
  }

  async _initAdapter() {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });

    if (!adapter) {
      throw new Error('No appropriate GPUAdapter found.');
    }

    this.adapter = adapter;
  }

  async _initDevice() {
    const device = await this.adapter.requestDevice();

    if (!device) {
      throw new Error('No appropriate GPUDevice found.');
    }

    this.device = device;
  }

  _initContext() {
    if (!this.canvas) {
      throw new Error('Canvas not initialized. Call init() first.');
    }

    const ctx = this.canvas.getContext('webgpu');

    if (!ctx) {
      throw new Error('Failed to get WebGPU context.');
    }

    this.ctx = ctx;
  }

  _resizeCanvas() {
    resizeCanvasToDisplaySize(this.canvas);
  }

  _createVertexBuffer(vertices) {
    if (this.vertexBuffer) {
      return;
    }

    this.vertexBuffer = this.device.createBuffer({
      label: 'Vertex Buffer',
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(this.vertexBuffer, 0, vertices);

    this.vertexBufferLayout = {
      // position-only vertex layout: 3 floats (x, y, z) 4 bytes each = 12 bytes
      arrayStride: 3 * 4, // 4 bytes per float
      attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
    };
  }

  _createIndexBuffer(indices) {
    if (this.indexBuffer) {
      return;
    }

    this.indexBuffer = this.device.createBuffer({
      label: 'Index Buffer',
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(this.indexBuffer, 0, indices);
  }

  _createUniformBuffer() {
    if (this.uniformBuffer) {
      this.uniformBuffer.destroy();
      this.uniformBuffer = null;
      this.uniformValues = null;
    }

    // 1 color: 4 floats (r, g, b, a) 4 bytes each + matrix: 16 floats (4x4 matrix) 4 bytes each = 20 floats * 4 bytes each = 80 bytes
    const uniformBufferSize = (4 + 16) * 4; // 4 bytes per float

    this.uniformBuffer = this.device.createBuffer({
      label: 'Uniform Buffer',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.uniforms = new Float32Array(uniformBufferSize / 4);

    const colorOffset = 0;
    const matrixOffset = 4;

    this.uniformValues = {
      color: this.uniforms.subarray(colorOffset, colorOffset + 4),
      matrix: this.uniforms.subarray(matrixOffset, matrixOffset + 16),
    };
  }

  _createVertexShader(vertexShader) {
    this.vertexShader = this.device.createShaderModule({
      label: 'Vertex Shader',
      code: vertexShader,
    });
  }

  _createFragmentShader(fragmentShader) {
    this.fragmentShader = this.device.createShaderModule({
      label: 'Fragment Shader',
      code: fragmentShader,
    });
  }

  _createBindGroupLayout() {
    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Bind Group Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {},
        },
      ],
    });

    const bindGroup = this.device.createBindGroup({
      label: 'Bind Group',
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
      ],
    });

    this.bindGroupLayout = bindGroupLayout;
    this.bindGroup = bindGroup;
  }

  _createPipelineLayout() {
    this.pipelineLayout = this.device.createPipelineLayout({
      label: 'Pipeline Layout',
      bindGroupLayouts: [this.bindGroupLayout],
    });
  }

  _createRenderPipeline() {
    this.renderPipeline = this.device.createRenderPipeline({
      label: 'Render Pipeline',
      layout: this.pipelineLayout,
      vertex: {
        module: this.vertexShader,
        entryPoint: 'main',
        buffers: [this.vertexBufferLayout],
      },
      fragment: {
        module: this.fragmentShader,
        entryPoint: 'main',
        targets: [{ format: this.presentationFormat }],
      },
    });
  }

  setVertices(vertices) {
    this.vertices = new Float32Array(vertices);

    if (!this.vertexBuffer) {
      this._createVertexBuffer(this.vertices);
    }

    if (this.vertexBuffer.size >= this.vertices.byteLength) {
      this.device.queue.writeBuffer(this.vertexBuffer, 0, this.vertices);
    } else {
      this.vertexBuffer.destroy();
      this._createVertexBuffer(this.vertices);
    }
  }

  setIndices(indices) {
    this.indices = new Uint16Array(indices);

    if (!this.indexBuffer) {
      this._createIndexBuffer(this.indices);
    }

    if (this.indexBuffer.size >= this.indices.byteLength) {
      this.device.queue.writeBuffer(this.indexBuffer, 0, this.indices);
    } else {
      this.indexBuffer.destroy();
      this._createIndexBuffer(this.indices);
    }
  }

  async init() {
    await this._initAdapter();
    await this._initDevice();
    this._initContext();

    this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    this.ctx.configure({
      device: this.device,
      format: this.presentationFormat,
      alphaMode: 'premultiplied', // enables transparency in the WebGPU canvas so the CSS background is visible instead of being fully covered
    });

    this._resizeCanvas();
  }

  async run() {
    if (!this.canvas) {
      throw new Error('Canvas not initialized. Call init() first.');
    }

    this._createVertexBuffer(this.vertices);
    this._createIndexBuffer(this.indices);
    this._createUniformBuffer();

    this._createVertexShader(vertexShader);
    this._createFragmentShader(fragmentShader);

    this._createBindGroupLayout();
    this._createPipelineLayout();
    this._createRenderPipeline();

    this._render();
  }

  redraw() {
    this._render();
  }

  _render() {
    const encoder = this.device.createCommandEncoder();

    const renderPass = encoder.beginRenderPass({
      label: 'Render Pass',
      colorAttachments: [
        {
          view: this.ctx.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.bindGroup);
    renderPass.setVertexBuffer(0, this.vertexBuffer);
    renderPass.setIndexBuffer(this.indexBuffer, 'uint16');

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

    // Upload the matrix to the uniform buffer
    this.uniformValues.matrix.set(this.transformMatrix.elements);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniforms);

    // Draw the geometry
    renderPass.drawIndexed(this.indices.length, 1, 0);
    renderPass.end();

    // Submit the command buffer to the GPU
    this.device.queue.submit([encoder.finish()]);
  }
}
