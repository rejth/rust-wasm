/*
  Fragment shader is responsible for calculating the color of a pixel.
  It is called once for each pixel of the geometry.

  The only way to pass vertex-specific data to fragment shader is through the vertex shader: FragmentInput = VertexOutput
*/

struct FragmentInput {
  @builtin(position) clip_position: vec4f,
  @location(0) color: vec3f, // Color of the vertex.
};

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
  return vec4f(input.color, 1.0);
}