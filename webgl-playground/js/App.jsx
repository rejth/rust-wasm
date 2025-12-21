import { useState, useEffect, useRef } from 'react';

import {
  createProgram,
  createShader,
  createVertexAttributeState,
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

    const gl = canvasRef.current.getContext('webgl2');
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
      // Attributes are variables that are stored for each vertex.
      attributeLocations: {
        vertexPosition: gl.getAttribLocation(program, 'aVertexPosition'),
        vertexColor: gl.getAttribLocation(program, 'aVertexColor'),
      },
      // Uniforms are variables that are shared between all vertices of the same object.
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program, 'uModelViewMatrix'),
      },
    };

    // Create the vertex attribute state
    createVertexAttributeState(gl, programInfo);

    // Draw the scene
    drawScene(gl, programInfo);
  }, [ready]);

  if (!ready) {
    return <div>Loading...</div>;
  }

  return <canvas ref={canvasRef} id="canvas" />;
}
