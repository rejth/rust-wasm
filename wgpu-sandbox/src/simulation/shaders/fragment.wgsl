/*
  Fragment shader calculates the color of a pixel.
  It is called once for each pixel of the geometry.

  The only way to pass vertex-specific data to fragment shader is through the vertex shader: FragmentInput = VertexOutput
*/

struct FragmentInput {
  @builtin(position) clip_position: vec4f,
  @location(0) cell: vec2f,
  @location(1) color: vec3f,
};

@group(0) @binding(0) var<uniform> grid: vec2f;

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
  let cell_color = input.cell / grid;

  return vec4f(cell_color, 1.0 - cell_color.x, 1.0);
}