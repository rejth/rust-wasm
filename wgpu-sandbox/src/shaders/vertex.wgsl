/*
  Vertex shader is responsible for transforming the geometry from object space to clip space.
  It is called once for each vertex of the geometry.
*/

struct VertexInput {
  @builtin(vertex_index) vertex_index: u32, // Vertex index is the index of the vertex in the geometry. If we draw 3 vertices, vertex_index will be 0, 1, 2.
  @builtin(instance_index) instance_index: u32, // Instance is the index of the geometry we draw. If we draw 6 rectangles, instances will be 0, 1, 2, 3, 4, 5.
  @location(0) position: vec3f, // Position of the vertex in the geometry.
  @location(1) color: vec3f, // Color of the vertex.
};

struct VertexOutput {
  @builtin(position) clip_position: vec4f, // Position of the vertex in the clip space after all transformations are applied.
  @location(0) color: vec3f, // Color of the vertex.
};

@vertex
fn main(input: VertexInput) -> VertexOutput {
  return VertexOutput(vec4f(input.position, 1.0), input.color);
}
