attribute vec3 externalColors;

varying vec2 vUv;
varying vec3 vExternalColors;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  vUv = uv;
  vExternalColors = externalColors;
}
