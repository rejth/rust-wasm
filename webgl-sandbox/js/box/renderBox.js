import { resizeCanvasToDisplaySize, createShader, createProgram, createProjectionMatrix } from '../core.js';
import vertexSource from './shaders/vertex.glsl';
import fragmentSource from './shaders/fragment.glsl';

export function renderBox(gl) {
  // Resize canvas before creating geometry
  resizeCanvasToDisplaySize(gl.canvas);

  // Create GLSL shaders, compile the shaders, upload the GLSL source
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  // Link the two shaders into a program
  const program = createProgram(gl, vertexShader, fragmentShader);

  // Collect all the info needed to use the shader program
  // Look up where the vertex data needs to go. It will read the vertex data from the buffer
  const programInfo = {
    program,
    // Attributes are variables that are stored for each vertex.
    attributeLocations: {
      vertexPosition: gl.getAttribLocation(program, 'a_position'),
      textureCoord: gl.getAttribLocation(program, 'a_uv'),
    },
    // Uniforms are variables that are shared between all vertices of the same object.
    uniformLocations: {
      projection: gl.getUniformLocation(program, 'u_projection'),
    },
  };

  /* Create a vertex array object (attribute state).
   * The vertex array object is a GPU-side object that contains all the vertex attributes and the vertex buffer objects.
   * It is used as to store the attribute state for a given set of vertices.
   */
  const vao = gl.createVertexArray();

  // Make it the one we're currently working with, so that all of our attribute settings will apply to that set of attribute state
  gl.bindVertexArray(vao);

  // Create a square in the center of the canvas
  const size = 800;
  const centerX = gl.canvas.width / 2;
  const centerY = gl.canvas.height / 2;
  const x = centerX - size / 2;
  const y = centerY - size / 2;

  // Create the position buffer and enable the position attribute
  initPositionBuffer(gl, x, y, size, size);
  // Tell WebGL how to pull out the positions from the position buffer into the vertexPosition attribute
  enablePositionAttribute(gl, programInfo);

  // Create the texture coordinate buffer and enable the texture coordinate attribute
  initTextureCoordBuffer(gl);
  // Tell WebGL how to pull out the texture coordinates from the texture buffer into the textureCoord attribute
  enableTextureCoordAttribute(gl, programInfo);

  // Draw the scene
  drawScene(gl, programInfo);
}

function initPositionBuffer(gl, x, y, width, height) {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const x1 = x;
  const x2 = x + width;
  const y1 = y;
  const y2 = y + height;

  // Now pass the list of positions into WebGL to build the shape.
  // We do this by creating a Float32Array from the JavaScript array, then use it to fill the current buffer
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW);

  return positionBuffer;
}

function enablePositionAttribute(gl, programInfo) {
  // Specify how to pull the data out of the positions buffer (ARRAY_BUFFER) into the vertexPosition attribute
  const size = 2; // pull out 2 values per iteration
  const type = gl.FLOAT; // the data in the buffer is 32bit floats
  const normalize = false; // don't normalize the data
  const stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
  const offset = 0; // start at the beginning of the buffer - how many bytes inside the buffer to start from

  // Tell the attribute how to get data out of position buffer (ARRAY_BUFFER)
  gl.vertexAttribPointer(programInfo.attributeLocations.vertexPosition, size, type, normalize, stride, offset);

  // Turn on the position attribute
  gl.enableVertexAttribArray(programInfo.attributeLocations.vertexPosition);
}

function initTextureCoordBuffer(gl) {
  const textureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

  // UV coordinates for the rectangle (used by the fragment shader)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
    gl.STATIC_DRAW,
  );

  return textureCoordBuffer;
}

function enableTextureCoordAttribute(gl, programInfo) {
  const size = 2;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  gl.vertexAttribPointer(programInfo.attributeLocations.textureCoord, size, type, normalize, stride, offset);

  gl.enableVertexAttribArray(programInfo.attributeLocations.textureCoord);
}

function drawScene(gl, programInfo) {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
  gl.clearDepth(1.0); // Clear everything
  gl.enable(gl.DEPTH_TEST); // Enable depth testing
  gl.depthFunc(gl.LEQUAL); // Near things obscure far things

  gl.useProgram(programInfo.program);

  // Set projection matrix
  const projection = createProjectionMatrix(gl.canvas.width, gl.canvas.height);
  gl.uniformMatrix3fv(programInfo.uniformLocations.projection, false, projection);

  // Draw the geometry
  {
    const primitiveType = gl.TRIANGLES;
    const offset = 0;
    const vertexCount = 6;
    gl.drawArrays(primitiveType, offset, vertexCount);
  }
}
