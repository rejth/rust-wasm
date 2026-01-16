import { resizeCanvasToDisplaySize } from '../core.js';
import cellVertexShader from './shaders/vertex.wgsl';
import cellFragmentShader from './shaders/fragment.wgsl';
import cellComputeShader from './shaders/compute.wgsl';

export class RenderManager {
  GRID_SIZE = 64;
  WORKGROUP_SIZE = 8;
  WORKGROUP_COUNT = Math.ceil(this.GRID_SIZE / this.WORKGROUP_SIZE);
  UPDATE_INTERVAL = 200; // Update every 200ms (5 times/sec)

  constructor() {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported on this browser.');
    }
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

  initContext(canvas) {
    const ctx = canvas.getContext('webgpu');

    if (!ctx) {
      throw new Error('Failed to get WebGPU context.');
    }

    this.ctx = ctx;
  }

  async init(canvas) {
    await this.initAdapter();
    await this.initDevice();
    this.initContext(canvas);

    /*
       Texture format that the context should use for rendering to the canvas.
       Each texture has a format that lets the GPU know how that data is laid out in memory.
       Format impacts efficiency of displaying images on the canvas.
       Different types of devices perform best when using different texture formats.
       If you don't use the device's preferred format it may cause extra memory copies to happen behind the scenes before the image can be displayed as part of the page.
      */
    this.format = navigator.gpu.getPreferredCanvasFormat();

    // Configure the rendering context with the device and texture format
    this.ctx.configure({ device: this.device, format: this.format });

    // Resize the canvas to match the display size with device pixel ratio
    resizeCanvasToDisplaySize(canvas);
  }

  async run(canvas) {
    await this.init(canvas);

    // Shape a geometry - 4 vertices in a square (in clip space)
    this.vertices = new Float32Array([
      // Triangle 1
      -0.8, -0.8, 0.8, -0.8, 0.8, 0.8,
      // Triangle 2
      -0.8, -0.8, 0.8, 0.8, -0.8, 0.8,
    ]);

    // Create a uniform buffer that describes the grid
    this.uniforms = new Float32Array([this.GRID_SIZE, this.GRID_SIZE]);

    this.createVertexBuffer(this.vertices, 'Cell Vertices');
    this.createUniformBuffer(this.uniforms, 'Cell Uniforms');

    this.createVertexShader(cellVertexShader, 'Cell vertex shader');
    this.createFragmentShader(cellFragmentShader, 'Cell fragment shader');
    this.createComputeShader(cellComputeShader, 'Cell compute shader');

    this.createCellState();

    this.createBindGroupLayout();
    this.createPipelineLayout();

    this.createComputePipeline();
    this.createRenderPipeline();

    this.draw();
  }

  createVertexBuffer(vertices, label) {
    this.vertexBuffer = this.device.createBuffer({
      label,
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    /*
      Tell the GPU how to interpret the vertex buffer (how to read the data from the buffer)
    */
    this.vertexBufferLayout = {
      /*
        The number of bytes the GPU needs to skip forward in the buffer when it's looking for the next vertex.
        Each vertex of our square is made up of two 32-bit floating point numbers. A 32-bit float is 4 bytes, so two floats is 8 bytes.
      */
      arrayStride: 8,
      // The attributes of the vertex buffer. An attribute is a single piece of data that is associated with a vertex. It is unique for each vertex.
      attributes: [
        {
          /*
            The format of the attribute.
            "float32x2" means two 32-bit floats per vertex.
          */
          format: 'float32x2',
          /*
            The offset of the attribute in the buffer. We really only have to worry about this if our buffer has more than one attribute in it.
          */
          offset: 0,
          /*
            The location of the attribute in the vertex shader.
            shaderLocation is the index (0-15) of the attribute in the vertex shader - @location(0) in vertex shader
          */
          shaderLocation: 0,
        },
      ],
    };

    /*
      Write the uniform array to the uniform buffer.
      bufferOffset is the offset in the buffer where we want to write the data.
      We want to write the data at the beginning of the buffer, so we pass 0.
    */
    this.device.queue.writeBuffer(this.vertexBuffer, /*bufferOffset=*/ 0, vertices);
  }

  createUniformBuffer(uniforms, label) {
    /*
      A uniform is a value from a buffer that is the same for every invocation of a shader. They are like constants in a shader.
      They are useful for communicating values that are common for a piece of geometry (like its position), a full frame of animation (like the current time), or even the entire lifespan of the app (like a user preference).
      Unlike storage buffers, uniform buffers are read-only by the GPU and are used for smaller amounts of data that have the potential to update frequently (like model, view, and projection matrices in 3D applications).
      For smaller amounts of data that has to be updated frequently, uniform buffers are typically the safer choice for better performance.
    */
    this.uniformBuffer = this.device.createBuffer({
      label,
      size: uniforms.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    /*
      Write the uniform array to the uniform buffer.
      bufferOffset is the offset in the buffer where we want to write the data.
      We want to write the data at the beginning of the buffer, so we pass 0.
    */
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

  createComputeShader(computeShader, label) {
    this.computeShader = this.device.createShaderModule({
      label,
      code: computeShader,
    });
  }

  createCellState() {
    // Create an array representing the active state of each cell
    const cellStateArray = new Uint32Array(this.GRID_SIZE * this.GRID_SIZE);

    // Set each cell to a random state, then copy the JS array into the storage buffer
    for (let i = 0; i < cellStateArray.length; ++i) {
      cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
    }

    /*
      Create two storage buffers to hold the cell state.
      Storage buffers are general-use buffers that can be read and written to in compute shaders, and read in vertex shaders.
      They are like general memory. They can be very large and are useful for storing data that needs to be efficiently shared between the CPU and GPU.
    */

    /*
      We use ping-pong pattern to alternate between two storage buffers.
      On each step of the simulation, it reads from one copy of the state and writes to the other. Then, on the next step, it flips it and reads from the state it wrote to previously.
      By using the ping pong pattern, we ensure that the GPU always performs the next step of the simulation using only the results of the last step.
    */
    this.cellStateStorage = [
      this.device.createBuffer({
        label: 'Cell State A',
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      this.device.createBuffer({
        label: 'Cell State B',
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
    ];

    this.device.queue.writeBuffer(this.cellStateStorage[0], 0, cellStateArray);
  }

  createBindGroupLayout() {
    /*
      When having multiple pipelines (render and compute) that want to share resources, we need to create the layout explicitly, and then provide it to both the bind group and pipelines.
      Layout describes all of the resources that are present in the bind group, not just the ones used by a specific pipeline.
    */
    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Cell Bind Group Layout',
      entries: [
        {
          binding: 0, // @binding(0) in shaders
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, // Expose the data for vertex, fragment and compute shaders
          buffer: {}, // Grid uniform buffer
        },
        {
          binding: 1, // @binding(1) in shaders
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, // Expose the data for vertex and compute shaders
          buffer: { type: 'read-only-storage' }, // Cell state input buffer
        },
        {
          binding: 2, // @binding(2) in shaders
          visibility: GPUShaderStage.COMPUTE, // Expose the data for compute shader only
          buffer: { type: 'storage' }, // Cell state output buffer
        },
      ],
    });

    /*
      Create a bind group to pass the grid uniforms into the pipeline.
      A bind group is a collection of resources that are accessible to our vertex shader. There may be multiple bind groups in a pipeline.
      Each bind group can contain buffers, textures, samplers and other resources.
    */
    const bindGroups = [
      /*
        @group(0) in vertex shader
      */
      this.device.createBindGroup({
        label: 'Cell renderer bind group A',
        layout: bindGroupLayout, // Layout describes which types of resources this bind group contains
        entries: [
          {
            binding: 0, // @group(0) @binding(0) in vertex shader
            resource: { buffer: this.uniformBuffer },
          },
          {
            binding: 1, // @group(0) @binding(1) in vertex shader
            resource: { buffer: this.cellStateStorage[0] },
          },
          {
            binding: 2, // @group(0) @binding(2) in vertex shader
            resource: { buffer: this.cellStateStorage[1] },
          },
        ],
      }),
      /*
        @group(1) in vertex shader
      */
      this.device.createBindGroup({
        label: 'Cell renderer bind group B',
        layout: bindGroupLayout, // Layout describes which types of resources this bind group contains
        entries: [
          {
            binding: 0, // @group(1) @binding(0) in vertex shader
            resource: { buffer: this.uniformBuffer },
          },
          {
            binding: 1, // @group(1) @binding(1) in vertex shader
            resource: { buffer: this.cellStateStorage[1] },
          },
          {
            binding: 2, // @group(1) @binding(2) in vertex shader
            resource: { buffer: this.cellStateStorage[0] },
          },
        ],
      }),
    ];

    this.bindGroupLayout = bindGroupLayout;
    this.bindGroups = bindGroups;
  }

  createPipelineLayout() {
    /*
      A pipeline layout is a list of bind group layouts that one or more pipelines use.
      The order of the bind group layouts in the array needs to correspond with the @group attributes in the shaders.
      This means that bindGroupLayout is associated with @group(0).
    */
    this.cellPipelineLayout = this.device.createPipelineLayout({
      label: 'Cell Pipeline Layout',
      bindGroupLayouts: [this.bindGroupLayout],
    });
  }

  createRenderPipeline() {
    /*
      Create a render pipeline.
      The render pipeline controls how geometry is drawn, including things like which shaders are used, how to interpret data in vertex buffers, which kind of geometry should be rendered (lines, points, triangles...)
    */
    this.cellRenderPipeline = this.device.createRenderPipeline({
      label: 'Cell Render Pipeline',
      layout: this.cellPipelineLayout, // Describes what types of inputs (other than vertex buffers) the pipeline needs
      vertex: {
        module: this.vertexShader,
        entryPoint: 'main',
        buffers: [this.vertexBufferLayout], // Describes the layout of the vertex buffer
      },
      fragment: {
        module: this.fragmentShader,
        entryPoint: 'main',
        targets: [{ format: this.format }], // Describes the format of the output color attachment
      },
    });
  }

  createComputePipeline() {
    this.cellComputePipeline = this.device.createComputePipeline({
      label: 'Simulation pipeline',
      layout: this.cellPipelineLayout,
      compute: {
        module: this.computeShader,
        entryPoint: 'main',
      },
    });
  }

  draw() {
    let step = 0; // Track how many simulation steps have been run

    const updateGrid = () => {
      // Command encoder is used to record commands that will be executed by the GPU
      const encoder = this.device.createCommandEncoder();

      /**
       * We want to do the compute pass before the render pass because it allows the render pass to immediately use the latest results from the compute pass.
       * This way, the output buffer of the compute pipeline becomes the input buffer for the render pipeline.
       */
      const computePass = encoder.beginComputePass();
      computePass.setPipeline(this.cellComputePipeline);
      computePass.setBindGroup(0, this.bindGroups[step % 2]);
      /**
       * It's not the number of invocations. Instead, it's the number of workgroups to execute, as defined by the @workgroup_size in your shader.
       * If we want the shader to execute 32x32 times in order to cover the entire grid, and our workgroup size is 8x8, we need to dispatch 4x4 workgroups (4 * 8 = 32).
       * That's why we divide the grid size by the workgroup size and pass that value into dispatchWorkgroups().
       */
      computePass.dispatchWorkgroups(this.WORKGROUP_COUNT, this.WORKGROUP_COUNT);
      computePass.end();

      step++;

      /*
        Begin a render pass to clear the canvas and draw the grid.
        Render pass is when all drawing operations in WebGPU happen.
        Render pass may have several textures, called attachments, with various purposes such as storing the depth of rendered geometry or providing antialiasing.
      */
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            // Get the current texture and create a view for it. It is a texture that receives the output of any drawing commands performed
            view: this.ctx.getCurrentTexture().createView(),
            // Clear the texture to a specific color
            loadOp: 'clear',
            // Clear the texture to a specific color
            clearValue: { r: 0, g: 0, b: 0.0, a: 1 },
            // Store the result of the render pass in the texture
            storeOp: 'store',
          },
        ],
      });
      pass.setPipeline(this.cellRenderPipeline);
      pass.setBindGroup(0, this.bindGroups[step % 2]);
      pass.setVertexBuffer(0, this.vertexBuffer);

      /**
       * Draw 6 vertices GRID_SIZE * GRID_SIZE times.
       * Instancing is a way to tell the GPU to draw multiple copies of the same geometry with a single call to draw, which is much faster than calling draw once for every copy.
       * Here we draw 2 triangles with 3 vertices each -> 6 vertices with 2 floats (x, y) per vertex -> 12 floats / 2 coordinates per vertex == 6 vertices.
       * We draw GRID_SIZE * GRID_SIZE times, which means we draw 6 vertices GRID_SIZE * GRID_SIZE times with a single call to draw.
       */
      pass.draw(this.vertices.length / 2, this.GRID_SIZE * this.GRID_SIZE);

      pass.end();

      // Finish the command encoder and get the command buffer to be submitted to the GPU
      const commandBuffer = encoder.finish();

      /**
       * Submit the command buffer to the GPU.
       * The queue performs all GPU commands, ensuring that their execution is well ordered and properly synchronized
       * Once you submit a command buffer, it cannot be used again, so you need to create a new one for other commands
       */
      this.device.queue.submit([commandBuffer]);
    };

    // Schedule updateGrid() to run repeatedly
    setInterval(updateGrid, this.UPDATE_INTERVAL);
  }
}
