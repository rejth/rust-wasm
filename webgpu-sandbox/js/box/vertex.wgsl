struct VertexInput {
  @location(0) position: vec3<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
}

struct Uniforms {
  color: vec4<f32>,
  matrix: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(vertex: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  output.position = uniforms.matrix * vec4f(vertex.position, 1.0);
  return output;
}
