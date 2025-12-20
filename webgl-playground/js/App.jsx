import React, { useState, useEffect, useRef } from 'react';

import {
  createProgram,
  createShader,
  initBuffers,
  setupVertexArray,
  drawScene,
} from './shaders/utils.js';
import vertexSource from './shaders/vertex.glsl';
import fragmentSource from './shaders/fragment.glsl';

import init from '../pkg/webgl_playground.js';

export function App() {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    init().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const gl = canvas.getContext('webgl2');
    if (!gl) return;

    // Create GLSL shaders, upload the GLSL source, compile the shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    // Link the two shaders into a program
    const program = createProgram(gl, vertexShader, fragmentShader);

    // Collect all the info needed to use the shader program
    // Look up where the vertex data needs to go. It will read the vertex data from the buffer
    const programInfo = {
      program,
      attributeLocations: {
        vertexPosition: gl.getAttribLocation(program, 'aVertexPosition'),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program, 'uModelViewMatrix'),
      },
    };

    const buffers = initBuffers(gl);

    // Configure the vertex array
    setupVertexArray(gl, buffers, programInfo);

    // Resize canvas to display size
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Set viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Draw
    drawScene(gl, programInfo);
  }, [ready]);

  if (!ready) {
    return <div>Loading...</div>;
  }

  return <canvas ref={canvasRef} id="canvas" />;
}
