/*
  Vertex shader is responsible for transforming the geometry from object space to clip space.
  It is called once for each vertex of the geometry.
*/

struct VertexInput {
  @builtin(vertex_index) instance: u32, // Instance is the index of the geometry we draw. If we draw 6 rectangles, instances will be 0, 1, 2, 3, 4, 5.
};

struct VertexOutput {
  @builtin(position) clip_position: vec4f, // Position of the vertex in the clip space after all transformations are applied.
};

@vertex
fn main(input: VertexInput) -> VertexOutput {
  let x = f32(1 - i32(input.instance)) * 0.5;
  let y = f32(i32(input.instance & 1u) * 2 - 1) * 0.5;

  return VertexOutput(vec4f(x, y, 0.0, 1.0));
}
