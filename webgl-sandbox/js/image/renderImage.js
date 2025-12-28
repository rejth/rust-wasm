import vertexSource from './shaders/vertex.glsl';
import fragmentSource from './shaders/fragment.glsl';

import { resizeCanvasToDisplaySize, createShader, createProgram, createProjectionMatrix } from '../core.js';

export class RenderImage {
  constructor(gl, image) {
    if (RenderImage.instance) {
      return RenderImage.instance;
    }

    RenderImage.instance = this;

    this.gl = gl;
    this.image = image;

    const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentSource);
    const program = createProgram(this.gl, vertexShader, fragmentShader);

    this.programInfo = {
      program,
      attributeLocations: {
        vertexPosition: this.gl.getAttribLocation(program, 'a_position'),
        textureCoord: this.gl.getAttribLocation(program, 'a_uv'),
      },
      uniformLocations: {
        projection: this.gl.getUniformLocation(program, 'u_projection'),
        image: this.gl.getUniformLocation(program, 'u_image'),
        kernel: this.gl.getUniformLocation(program, 'u_kernel[0]'),
        kernelWeight: this.gl.getUniformLocation(program, 'u_kernelWeight'),
      },
    };

    // Define convolution kernels
    this.kernels = {
      normal: [0, 0, 0, 0, 1, 0, 0, 0, 0],
      gaussianBlur: [0.045, 0.122, 0.045, 0.122, 0.332, 0.122, 0.045, 0.122, 0.045],
      gaussianBlur2: [1, 2, 1, 2, 4, 2, 1, 2, 1],
      gaussianBlur3: [0, 1, 0, 1, 1, 1, 0, 1, 0],
      unsharpen: [-1, -1, -1, -1, 9, -1, -1, -1, -1],
      sharpness: [0, -1, 0, -1, 5, -1, 0, -1, 0],
      sharpen: [-1, -1, -1, -1, 16, -1, -1, -1, -1],
      edgeDetect: [-0.125, -0.125, -0.125, -0.125, 1, -0.125, -0.125, -0.125, -0.125],
      edgeDetect2: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
      edgeDetect3: [-5, 0, 0, 0, 0, 0, 0, 0, 5],
      edgeDetect4: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
      edgeDetect5: [-1, -1, -1, 2, 2, 2, -1, -1, -1],
      edgeDetect6: [-5, -5, -5, -5, 39, -5, -5, -5, -5],
      sobelHorizontal: [1, 2, 1, 0, 0, 0, -1, -2, -1],
      sobelVertical: [1, 0, -1, 2, 0, -2, 1, 0, -1],
      previtHorizontal: [1, 1, 1, 0, 0, 0, -1, -1, -1],
      previtVertical: [1, 0, -1, 1, 0, -1, 1, 0, -1],
      boxBlur: [0.111, 0.111, 0.111, 0.111, 0.111, 0.111, 0.111, 0.111, 0.111],
      triangleBlur: [0.0625, 0.125, 0.0625, 0.125, 0.25, 0.125, 0.0625, 0.125, 0.0625],
      emboss: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
    };
  }

  drawImage(effects) {
    resizeCanvasToDisplaySize(this.gl.canvas);

    // Vertex array object for framebuffer passes (full-texture quad at image dimensions)
    // Uses flipped UV coords because framebuffer textures are Y-inverted
    this.setFrameBufferAttributeState();

    // Vertex array object for canvas display (centered, scaled geometry)
    this.setCanvasAttributeState();

    // Create the texture and upload the image to it
    this.originalTexture = this.createTexture();
    this.uploadImageToTexture(this.image);

    // Create 2 more textures for effects and attach them to frame buffer objects
    const { textures, frameBuffers } = this.generateTextures();
    this.textures = textures;
    this.frameBuffers = frameBuffers;

    // Get enabled effects
    const enabledEffects = effects.filter((e) => e.on);

    // Draw the effects to the canvas
    this.drawEffects(enabledEffects);
  }

  drawEffects(effects) {
    const { program, uniformLocations } = this.programInfo;

    // Tell WebGL to use our program (pair of shaders)
    this.gl.useProgram(program);

    // Start with the original image texture on unit 0
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.originalTexture);
    this.gl.uniform1i(uniformLocations.image, 0);

    // Use the frame buffer attribute state for framebuffer passes
    this.gl.bindVertexArray(this.frameBufferVertexArray);

    // Set projection for image-sized framebuffers
    const frameBufferProjection = createProjectionMatrix(this.image.width, this.image.height);
    this.gl.uniformMatrix3fv(uniformLocations.projection, false, frameBufferProjection);

    // Apply each effect in sequence using ping-pong framebuffers
    let count = 0;
    for (let i = 0; i < effects.length; i++) {
      // Render to the appropriate framebuffer
      this.setFrameBuffer(this.frameBuffers[count % 2], this.image.width, this.image.height);

      // Apply this effect's kernel
      this.drawWithKernel(effects[i].name);

      // Use the result as input for the next pass
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[count % 2]);

      count++;
    }

    // Final pass: render to canvas with the canvas attribute state
    this.gl.bindVertexArray(this.canvasVertexArray);

    // Set projection for canvas
    const canvasProjection = createProjectionMatrix(this.gl.canvas.width, this.gl.canvas.height);
    this.gl.uniformMatrix3fv(uniformLocations.projection, false, canvasProjection);

    // Bind the default framebuffer (canvas)
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    // Tell WebGL how to convert from clip space to pixels
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    // Clear the canvas
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // Draw the final result with the default kernel
    this.drawWithKernel();
  }

  shapeGeometry() {
    // Get device pixel ratio to convert between CSS pixels and canvas pixels
    const dpr = window.devicePixelRatio || 1;

    // Calculate image size in canvas pixels (accounting for DPR)
    // The image's natural size should be multiplied by DPR to match canvas scale
    const imageWidth = this.image.width * dpr;
    const imageHeight = this.image.height * dpr;

    // Scale image down only if it is too large (80% of canvas)
    const maxSize = Math.min(this.gl.canvas.width, this.gl.canvas.height) * 0.8;
    const scale = Math.min(1, maxSize / Math.max(imageWidth, imageHeight));

    const width = imageWidth * scale;
    const height = imageHeight * scale;
    const centerX = this.gl.canvas.width / 2;
    const centerY = this.gl.canvas.height / 2;
    const x = centerX - width / 2;
    const y = centerY - height / 2;

    return { x, y, width, height };
  }

  createTexture() {
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    // Set up texture so we can render any size image and so we are working with pixels directly
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

    return texture;
  }

  uploadImageToTexture(image) {
    const mipLevel = 0; // the largest mip
    const internalFormat = this.gl.RGBA; // format we want in the texture
    const srcFormat = this.gl.RGBA; // format of data we are supplying
    const srcType = this.gl.UNSIGNED_BYTE; // type of data we are supplying

    // Upload the image into the texture
    this.gl.texImage2D(this.gl.TEXTURE_2D, mipLevel, internalFormat, srcFormat, srcType, image);
  }

  setFrameBufferAttributeState() {
    /* Create a vertex array object (attribute state).
     * The vertex array object is a GPU-side object that contains all the vertex attributes and the vertex buffer objects.
     * It is used as to store the attribute state for a given set of vertices.
     */
    this.frameBufferVertexArray = this.gl.createVertexArray();
    this.gl.bindVertexArray(this.frameBufferVertexArray);

    // Create the position buffer, put the positions into it and enable the position attribute so shader can access it
    this.setPositionBuffer(0, 0, this.image.width, this.image.height);
    this.enablePositionAttribute();

    // Create the texture coordinate buffer, put the texture coordinates into it and enable the texture coordinate attribute so shader can access it
    this.setTextureCoordBufferFlipped();
    this.enableTextureCoordAttribute();
  }

  setCanvasAttributeState() {
    /* Create a vertex array object (attribute state).
     * The vertex array object is a GPU-side object that contains all the vertex attributes and the vertex buffer objects.
     * It is used as to store the attribute state for a given set of vertices.
     */
    this.canvasVertexArray = this.gl.createVertexArray();
    this.gl.bindVertexArray(this.canvasVertexArray);

    const { x, y, width, height } = this.shapeGeometry();

    // Create the position buffer, put the positions into it and enable the position attribute so shader can access it
    this.setPositionBuffer(x, y, width, height);
    this.enablePositionAttribute();

    // Create the texture coordinate buffer, put the texture coordinates into it and enable the texture coordinate attribute so shader can access it
    this.setTextureCoordBuffer();
    this.enableTextureCoordAttribute();
  }

  setPositionBuffer(x, y, width, height) {
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

    const x1 = x;
    const x2 = x + width;
    const y1 = y;
    const y2 = y + height;

    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
      this.gl.STATIC_DRAW,
    );

    return positionBuffer;
  }

  enablePositionAttribute() {
    // Specify how to pull the data out of the positions buffer (ARRAY_BUFFER) into the vertexPosition attribute
    const size = 2; // pull out 2 values per iteration
    const type = this.gl.FLOAT; // the data in the buffer is 32bit floats
    const normalize = false; // don't normalize the data
    const stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
    const offset = 0; // start at the beginning of the buffer - how many bytes inside the buffer to start from

    const {
      attributeLocations: { vertexPosition },
    } = this.programInfo;

    // Tell the attribute how to get data out of position buffer (ARRAY_BUFFER)
    this.gl.vertexAttribPointer(vertexPosition, size, type, normalize, stride, offset);

    // Turn on the position attribute
    this.gl.enableVertexAttribArray(vertexPosition);
  }

  setTextureCoordBufferFlipped() {
    const textureCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureCoordBuffer);

    // UV coordinates flipped on Y axis for framebuffer textures (framebuffers store textures Y-inverted)
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0]),
      this.gl.STATIC_DRAW,
    );

    return textureCoordBuffer;
  }

  setTextureCoordBuffer() {
    const textureCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureCoordBuffer);

    // UV coordinates for the rectangle (used by the fragment shader)
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
      this.gl.STATIC_DRAW,
    );

    return textureCoordBuffer;
  }

  enableTextureCoordAttribute() {
    const size = 2;
    const type = this.gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;

    const {
      attributeLocations: { textureCoord },
    } = this.programInfo;

    // Tell the attribute how to get data out of position buffer (ARRAY_BUFFER)
    this.gl.vertexAttribPointer(textureCoord, size, type, normalize, stride, offset);

    // Turn on the texture coordinate attribute
    this.gl.enableVertexAttribArray(textureCoord);
  }

  generateTextures() {
    const textures = [];
    const frameBuffers = [];

    for (let i = 0; i < 2; ++i) {
      const texture = this.createTexture();
      textures.push(texture);

      // Make the texture the same size as the image
      const mipLevel = 0; // the largest mip
      const internalFormat = this.gl.RGBA; // format we want in the texture
      const border = 0; // must be 0
      const srcFormat = this.gl.RGBA; // format of data we are supplying
      const srcType = this.gl.UNSIGNED_BYTE; // type of data we are supplying
      const data = null; // no data = create a blank texture

      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        mipLevel,
        internalFormat,
        this.image.width,
        this.image.height,
        border,
        srcFormat,
        srcType,
        data,
      );

      // Create a frame buffer object
      const frameBuffer = this.gl.createFramebuffer();
      frameBuffers.push(frameBuffer);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, frameBuffer);

      // Attach a texture to it
      const attachmentPoint = this.gl.COLOR_ATTACHMENT0;
      this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, attachmentPoint, this.gl.TEXTURE_2D, texture, mipLevel);
    }

    return { textures, frameBuffers };
  }

  setFrameBuffer(frameBuffer, width, height) {
    // Make this the frame buffer object we are rendering to
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, frameBuffer);

    // Tell WebGL how to convert from clip space to pixels
    this.gl.viewport(0, 0, width, height);
  }

  drawWithKernel(name = 'normal') {
    // Set the kernel and it's weight
    this.gl.uniform1fv(this.programInfo.uniformLocations.kernel, this.kernels[name]);
    this.gl.uniform1f(this.programInfo.uniformLocations.kernelWeight, this.computeKernelWeight(this.kernels[name]));

    // Draw the geometry
    const primitiveType = this.gl.TRIANGLES;
    const offset = 0;
    const vertexCount = 6;
    this.gl.drawArrays(primitiveType, offset, vertexCount);
  }

  computeKernelWeight(kernel) {
    const weight = kernel.reduce((prev, curr) => prev + curr, 0);
    return weight <= 0 ? 1 : weight;
  }
}
