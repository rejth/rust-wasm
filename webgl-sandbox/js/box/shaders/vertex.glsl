#version 300 es

// Position in pixel coordinates
in vec2 a_position;

// Texture coordinates
in vec2 a_uv;

// Orthographic projection matrix (in pixels)
uniform mat3 u_projection;

// Used to pass the texture coordinates to the fragment shader
out vec2 v_uv;

void main() {
  // Apply projection matrix to convert pixels to clip space
  vec2 position = (u_projection * vec3(a_position, 1.0)).xy;
  gl_Position = vec4(position, 0.0, 1.0);

  // Pass the texture coordinates to the fragment shader
  v_uv = a_uv;
}
