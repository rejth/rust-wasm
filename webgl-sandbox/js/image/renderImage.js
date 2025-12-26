import {
  resizeCanvasToDisplaySize,
  createShader,
  createProgram,
  createProjectionMatrix,
} from '../core.js';
import vertexSource from './shaders/vertex.glsl';
import fragmentSource from './shaders/fragment.glsl';

export function renderTexture(gl, image) {
  resizeCanvasToDisplaySize(gl.canvas);

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = createProgram(gl, vertexShader, fragmentShader);

  const programInfo = {
    program,
    attributeLocations: {
      vertexPosition: gl.getAttribLocation(program, 'a_position'),
      textureCoord: gl.getAttribLocation(program, 'a_uv'),
    },
    uniformLocations: {
      projection: gl.getUniformLocation(program, 'u_projection'),
      image: gl.getUniformLocation(program, 'u_image'),
    },
  };

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const { x, y, width, height } = shapeGeometry(gl, image);

  // Create the position buffer and set the position attribute
  initPositionBuffer(gl, x, y, width, height);
  enablePositionAttribute(gl, programInfo);

  // Create the texture coordinate buffer and set the texture coordinate attribute
  initTextureCoordBuffer(gl);
  enableTextureCoordAttribute(gl, programInfo);

  // Create the texture and bind it to the texture unit
  createTexture(gl, image);

  // Draw the scene
  drawScene(gl, programInfo);
}

function shapeGeometry(gl, image) {
  // Get device pixel ratio to convert between CSS pixels and canvas pixels
  const dpr = window.devicePixelRatio || 1;

  // Calculate image size in canvas pixels (accounting for DPR)
  // The image's natural size should be multiplied by DPR to match canvas scale
  const imageWidth = image.width * dpr;
  const imageHeight = image.height * dpr;

  // Scale image down only if it is too large (80% of canvas)
  const maxSize = Math.min(gl.canvas.width, gl.canvas.height) * 0.8;
  const scale = Math.min(1, maxSize / Math.max(imageWidth, imageHeight));

  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const centerX = gl.canvas.width / 2;
  const centerY = gl.canvas.height / 2;
  const x = centerX - width / 2;
  const y = centerY - height / 2;

  return { x, y, width, height };
}

function initPositionBuffer(gl, x, y, width, height) {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const x1 = x;
  const x2 = x + width;
  const y1 = y;
  const y2 = y + height;

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
    gl.STATIC_DRAW,
  );
}

function enablePositionAttribute(gl, programInfo) {
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

function initTextureCoordBuffer(gl) {
  const textureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

  // UV coordinates for the rectangle (used by the fragment shader)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
    ]),
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

  gl.vertexAttribPointer(
    programInfo.attributeLocations.textureCoord,
    size,
    type,
    normalize,
    stride,
    offset,
  );

  gl.enableVertexAttribArray(programInfo.attributeLocations.textureCoord);
}

function createTexture(gl, image) {
  const texture = gl.createTexture();

  // Make unit 0 the active texture unit (i.e, the unit all other texture commands will affect)
  gl.activeTexture(gl.TEXTURE0 + 0);

  // Bind texture to 'texture unit '0' 2D bind point
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the parameters so we don't need mips and so we're not filtering and we don't repeat
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  const mipLevel = 0; // the largest mip
  const internalFormat = gl.RGBA; // format we want in the texture
  const srcFormat = gl.RGBA; // format of data we are supplying
  const srcType = gl.UNSIGNED_BYTE; // type of data we are supplying

  // Upload the image into the texture
  gl.texImage2D(
    gl.TEXTURE_2D,
    mipLevel,
    internalFormat,
    srcFormat,
    srcType,
    image,
  );
}

function drawScene(gl, programInfo) {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
  gl.clearDepth(1.0); // Clear everything
  gl.enable(gl.DEPTH_TEST); // Enable depth testing
  gl.depthFunc(gl.LEQUAL); // Near things obscure far things

  gl.useProgram(programInfo.program);

  // Create and set the projection matrix so we can convert from pixels to clip space in the shader
  const projection = createProjectionMatrix(gl.canvas.width, gl.canvas.height);
  gl.uniformMatrix3fv(
    programInfo.uniformLocations.projection,
    false,
    projection,
  );

  // Tell the shader to get the texture from texture unit 0
  gl.uniform1i(programInfo.uniformLocations.image, 0);

  // Draw the geometry
  {
    const primitiveType = gl.TRIANGLES;
    const offset = 0;
    const vertexCount = 6;
    gl.drawArrays(primitiveType, offset, vertexCount);
  }
}
