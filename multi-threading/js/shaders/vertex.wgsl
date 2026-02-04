struct VertexInput {
  @builtin(vertex_index) vertex_index: u32,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  
  // Create a full-screen quad using vertex index
  let x = f32((input.vertex_index << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(input.vertex_index & 2u) * 2.0 - 1.0;
  
  output.position = vec4<f32>(x, y, 0.0, 1.0);
  output.uv = vec2<f32>(x * 0.5 + 0.5, 1.0 - (y * 0.5 + 0.5));
  
  return output;
}