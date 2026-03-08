
struct FragmentInput {
  @builtin(position) position: vec4<f32>,
};

struct Uniforms {
  color: vec4<f32>,
  matrix: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
  return uniforms.color;
}
