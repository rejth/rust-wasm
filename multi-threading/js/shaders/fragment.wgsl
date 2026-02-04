struct FragmentInput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

struct Uniforms {
  width: f32,
  height: f32,
  center_x: f32,
  center_y: f32,
  zoom: f32,
  max_iterations: f32,
  seed: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
  // Map UV coordinates to complex plane
  let aspect = uniforms.width / uniforms.height;
  let scale = uniforms.zoom;
  
  let real = (input.uv.x - 0.5) * scale * aspect + uniforms.center_x;
  let imag = (input.uv.y - 0.5) * scale + uniforms.center_y;
  
  // Mandelbrot iteration
  var z_real = 0.0;
  var z_imag = 0.0;
  var iterations = 0.0;
  let max_iter = uniforms.max_iterations;
  
  for (var i = 0; i < 1000; i++) {
    if (iterations >= max_iter) {
      break;
    }
    
    let z_real_sq = z_real * z_real;
    let z_imag_sq = z_imag * z_imag;
    
    if (z_real_sq + z_imag_sq > 4.0) {
      break;
    }
    
    z_imag = 2.0 * z_real * z_imag + imag;
    z_real = z_real_sq - z_imag_sq + real;
    iterations = iterations + 1.0;
  }
  
  // Color mapping
  if (iterations >= max_iter) {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0); // Black for points in the set
  }
  
  // Generate pseudo-random hue based on discrete iteration count and global seed
  // Use floor to create distinct color bands, not per-pixel randomness
  let color_seed = (floor(iterations) + uniforms.seed) * 12.9898;
  let pseudo_random = fract(sin(color_seed) * 43758.5453);
  let hue = pseudo_random * 360.0;
  
  let saturation = 0.8; // Increased from 0.5 for more vibrant colors
  let lightness = 0.6;
  
  let rgb = hsl_to_rgb(hue, saturation, lightness);
  
  return vec4<f32>(rgb, 1.0);
}

// HSL to RGB conversion helper function
fn hue_to_rgb(p: f32, q: f32, t_input: f32) -> f32 {
  var t = t_input;
  if (t < 0.0) { t += 1.0; }
  if (t > 1.0) { t -= 1.0; }
  if (t < 1.0 / 6.0) { return p + (q - p) * 6.0 * t; }
  if (t < 1.0 / 2.0) { return q; }
  if (t < 2.0 / 3.0) { return p + (q - p) * (2.0 / 3.0 - t) * 6.0; }
  return p;
}

fn hsl_to_rgb(h: f32, s: f32, l: f32) -> vec3<f32> {
  let h_norm = h / 360.0;
  
  if (s == 0.0) {
    return vec3<f32>(l, l, l);
  }
  
  let q = select(l + s - l * s, l * (1.0 + s), l < 0.5);
  let p = 2.0 * l - q;
  
  let r = hue_to_rgb(p, q, h_norm + 1.0 / 3.0);
  let g = hue_to_rgb(p, q, h_norm);
  let b = hue_to_rgb(p, q, h_norm - 1.0 / 3.0);
  
  return vec3<f32>(r, g, b);
}
