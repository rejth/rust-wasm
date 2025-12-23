#version 300 es

precision highp float;

in vec4 v_color;
in vec2 v_uv;

out vec4 outColor;

void main() {
  float strength = 0.015 / length(v_uv - 0.5);
  outColor = vec4(vec3(strength), 1.0);
}
