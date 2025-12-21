import { mat4 } from 'gl-matrix';

export function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) return shader;

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

export function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) return program;

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

export function initBuffers(gl) {
  const positionBuffer = initPositionBuffer(gl);
  const colorBuffer = initColorBuffer(gl);

  return {
    position: positionBuffer,
    color: colorBuffer,
  };
}

export function initPositionBuffer(gl) {
  // Create a buffer for the geometry's positions
  const positionBuffer = gl.createBuffer();

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the geometry
  const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

  // Now pass the list of positions into WebGL to build the shape.
  // We do this by creating a Float32Array from the JavaScript array, then use it to fill the current buffer
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  return positionBuffer;
}

export function initColorBuffer(gl) {
  // Create a buffer for the geometry's colors
  const colorBuffer = gl.createBuffer();

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = colorBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

  // Now create an array of colors for the geometry
  const colors = [
    1.0,
    0.0,
    0.0,
    1.0, // red
    0.0,
    1.0,
    0.0,
    1.0, // green
    0.0,
    0.0,
    1.0,
    1.0, // blue
    1.0,
    1.0,
    1.0,
    1.0, // white
  ];

  // Now pass the list of colors into WebGL to color the geometry.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  return colorBuffer;
}

function setPositionAttribute(gl, programInfo) {
  // Specify how to pull the data out of the positions buffer (ARRAY_BUFFER) into the vertexPosition attribute
  const size = 2; // pull out 2 values per iteration
  const type = gl.FLOAT; // the data in the buffer is 32bit floats
  const normalize = false; // don't normalize the data
  const stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
  const offset = 0; // start at the beginning of the buffer - how many bytes inside the buffer to start from

  // Tell the attribute how to get data out of position buffer (ARRAY_BUFFER)
  gl.vertexAttribPointer(
    programInfo.attributeLocations.vertexPosition,
    size,
    type,
    normalize,
    stride,
    offset,
  );

  // Turn on the position attribute
  gl.enableVertexAttribArray(programInfo.attributeLocations.vertexPosition);
}

function setColorAttribute(gl, programInfo) {
  // Specify how to pull the data out of the colors buffer (ARRAY_BUFFER) into the vertexColor attribute
  const size = 4;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  // Tell the attribute how to get data out of colors buffer (ARRAY_BUFFER)
  gl.vertexAttribPointer(
    programInfo.attributeLocations.vertexColor,
    size,
    type,
    normalize,
    stride,
    offset,
  );

  // Turn on the color attribute
  gl.enableVertexAttribArray(programInfo.attributeLocations.vertexColor);
}

export function createVertexAttributeState(gl, programInfo) {
  // Before we render a geometry, we need to create the buffer that contains its vertex positions and put the vertex positions in it
  const buffers = initBuffers(gl);

  // Create a vertex array object (attribute state).
  // The vertex array object is a GPU-side object that contains the vertex attributes and the vertex buffer.
  // It is used to store the attribute state for a given set of vertices.
  const vao = gl.createVertexArray();

  // Make it the one we're currently working with, so that all of our attribute settings will apply to that set of attribute state
  gl.bindVertexArray(vao);

  // Bind the position buffer to ARRAY_BUFFER
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

  // Tell WebGL how to pull out the positions from the position buffer into the vertexPosition attribute
  setPositionAttribute(gl, programInfo);

  // Bind the color buffer to ARRAY_BUFFER
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);

  // Tell WebGL how to pull out the colors from the color buffer into the vertexColor attribute
  setColorAttribute(gl, programInfo);
}

export function drawScene(gl, programInfo) {
  webglUtils.resizeCanvasToDisplaySize(gl.canvas);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
  gl.clearDepth(1.0); // Clear everything
  gl.enable(gl.DEPTH_TEST); // Enable depth testing
  gl.depthFunc(gl.LEQUAL); // Near things obscure far things

  // Clear the canvas before we start drawing on it.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create a perspective matrix, a special matrix that is used to simulate the distortion of perspective in a camera.
  // Our field of view is 45 degrees, with a width/height ratio that matches the display size of the canvas
  // and we only want to see objects between 0.1 units and 100 units away from the camera.
  const fieldOfView = (45 * Math.PI) / 180; // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  // glMatrix always has the first argument as the destination to receive the result
  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  // Set the drawing position to the "identity" point, which is the center of the scene
  const modelViewMatrix = mat4.create();

  // Now move the drawing position a bit to where we want to start drawing the square
  mat4.translate(
    modelViewMatrix, // destination matrix
    modelViewMatrix, // matrix to translate
    [-0.0, 0.0, -6.0],
  );

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  // Set the shader uniforms
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix,
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    modelViewMatrix,
  );

  // Draw the geometry
  {
    const primitiveType = gl.TRIANGLE_STRIP;
    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(primitiveType, offset, vertexCount);
  }
}
