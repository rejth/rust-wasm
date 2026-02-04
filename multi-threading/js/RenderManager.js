import vertexShader from './shaders/vertex.wgsl';
import fragmentShader from './shaders/fragment.wgsl';
import { resize } from './utils.js';

export class RenderManager {
  constructor(canvas) {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported on this browser.');
    }
    this.canvas = canvas;
  }

  async initAdapter() {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });

    if (!adapter) {
      throw new Error('No appropriate GPUAdapter found.');
    }

    this.adapter = adapter;
  }

  async initDevice() {
    const device = await this.adapter.requestDevice();

    if (!device) {
      throw new Error('No appropriate GPUDevice found.');
    }

    this.device = device;
  }

  initContext() {
    if (!this.canvas) {
      throw new Error('Canvas not initialized. Call init() first.');
    }

    const ctx = this.canvas.getContext('webgpu');

    if (!ctx) {
      throw new Error('Failed to get WebGPU context.');
    }

    this.ctx = ctx;
  }

  async init() {
    await this.initAdapter();
    await this.initDevice();
    this.initContext();

    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.ctx.configure({ device: this.device, format: this.format });

    resize(this.canvas);
  }

  async setupPipeline() {
    if (!this.canvas) {
      throw new Error('Canvas not initialized. Call init() first.');
    }

    const width = this.canvas.width;
    const height = this.canvas.height;
    const seed = Math.random() * 1000.0;

    this.uniforms = new Float32Array([width, height, -0.75, 0.0, 3.2, 500.0, seed]);

    this.createUniformBuffer(this.uniforms, 'Uniforms');
    this.createVertexShader(vertexShader, 'Vertex Shader');
    this.createFragmentShader(fragmentShader, 'Fragment Shader');
    this.createBindGroupLayout();
    this.createPipelineLayout();
    this.createRenderPipeline();
    this.draw();
  }

  redraw() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const seed = Math.random() * 1000.0;

    console.time('mandelbrot_gpu');

    this.uniforms = new Float32Array([width, height, -0.75, 0.0, 3.2, 500.0, seed]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniforms);
    this.draw();

    console.timeEnd('mandelbrot_gpu');
  }

  createUniformBuffer(uniforms, label) {
    this.uniformBuffer = this.device.createBuffer({
      label,
      size: uniforms.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(this.uniformBuffer, /*bufferOffset=*/ 0, uniforms);
  }

  createVertexShader(vertexShader, label) {
    this.vertexShader = this.device.createShaderModule({
      label,
      code: vertexShader,
    });
  }

  createFragmentShader(fragmentShader, label) {
    this.fragmentShader = this.device.createShaderModule({
      label,
      code: fragmentShader,
    });
  }

  createBindGroupLayout() {
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

  createPipelineLayout() {
    this.pipelineLayout = this.device.createPipelineLayout({
      label: 'Pipeline Layout',
      bindGroupLayouts: [this.bindGroupLayout],
    });
  }

  createRenderPipeline() {
    this.renderPipeline = this.device.createRenderPipeline({
      label: 'Render Pipeline',
      layout: this.pipelineLayout,
      vertex: {
        module: this.vertexShader,
        entryPoint: 'main',
      },
      fragment: {
        module: this.fragmentShader,
        entryPoint: 'main',
        targets: [{ format: this.format }],
      },
    });
  }

  draw() {
    const encoder = this.device.createCommandEncoder();

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.ctx.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: { r: 0, g: 0, b: 0.0, a: 1 },
          storeOp: 'store',
        },
      ],
    });

    pass.setPipeline(this.renderPipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(4); // draw a full-screen quad (4 vertices)
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }
}
