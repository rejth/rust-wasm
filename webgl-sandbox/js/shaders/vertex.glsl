#version 300 es

in vec4 a_position;
in vec4 a_color;
in vec2 a_uv;

uniform mat4 u_modelViewMatrix;
uniform mat4 u_projectionMatrix;

out vec4 v_color;
out vec2 v_uv;

void main() {
  v_color = a_color;
  v_uv = a_uv;

  gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
}
