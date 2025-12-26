#version 300 es

// Fragment shaders don't have a default precision so we need to pick one. 
// "highp" is a good default. It means "high precision"
precision highp float;

// Our texture
uniform sampler2D u_image;

// Texture coordinates
in vec2 v_uv;

// Output for the fragment shader
out vec4 outColor;

void main() {
  outColor = texture(u_image, v_uv);
}
