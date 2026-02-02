use hsl::HSL;
use rand::Rng;
use rayon::prelude::*;
use wasm_bindgen::prelude::*;
use web_sys::console;

// Re-export the thread pool initializer for JavaScript
pub use wasm_bindgen_rayon::init_thread_pool;

#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    #[cfg(debug_assertions)]
    console_error_panic_hook::set_once();

    console::log_1(&JsValue::from_str("WASM initialized 🦀"));

    Ok(())
}

/// Generate a random color palette - different each time
pub fn generate_palette(max_iterations: u32) -> Vec<[u8; 4]> {
    let mut rng = rand::thread_rng();

    (0..max_iterations)
        .map(|_| {
            let (r, g, b) = HSL {
                h: rng.gen_range(0.0..360.0),
                s: 0.5,
                l: 0.6,
            }
            .to_rgb();
            [r, g, b, 255]
        })
        .collect()
}

fn mandelbrot_escape(cx: f64, cy: f64, max_iterations: u32) -> u32 {
    let mut x: f64 = 0.0;
    let mut y: f64 = 0.0;
    let mut iterations = 0;

    while iterations < max_iterations {
        let x2 = x * x - y * y + cx;
        let y2 = 2.0 * x * y + cy;
        x = x2;
        y = y2;

        if x * x + y * y > 4.0 {
            break;
        }
        iterations += 1;
    }

    iterations
}

#[wasm_bindgen]
pub fn mandelbrot_set(width: u32, height: u32) -> Vec<u8> {
    let center_x = -0.75;
    let center_y = 0.0;
    let scale = 3.2;

    let aspect = width as f64 / height as f64;
    let half_width = (scale * aspect) / 2.0;
    let half_height = scale / 2.0;

    let max_iterations = 500;
    let palette = generate_palette(max_iterations);

    let mut data = vec![0u8; (width * height * 4) as usize];

    let mut p = 0;
    for py in 0..height {
        let cy = center_y + (py as f64 / (height - 1) as f64) * (2.0 * half_height) - half_height;

        for px in 0..width {
            let cx = center_x + (px as f64 / (width - 1) as f64) * (2.0 * half_width) - half_width;

            let iterations = mandelbrot_escape(cx, cy, max_iterations);

            let color = if iterations == max_iterations {
                [0, 0, 0, 255] // Black for points in the set
            } else {
                palette[iterations as usize]
            };

            data[p] = color[0];
            data[p + 1] = color[1];
            data[p + 2] = color[2];
            data[p + 3] = color[3];
            p += 4;
        }
    }

    data
}

/// Parallel Mandelbrot computation using Rayon
#[wasm_bindgen]
pub fn mandelbrot_set_parallel(width: u32, height: u32) -> Vec<u8> {
    let center_x = -0.75;
    let center_y = 0.0;
    let scale = 3.2;

    let aspect = width as f64 / height as f64;
    let half_width = (scale * aspect) / 2.0;
    let half_height = scale / 2.0;

    let max_iterations = 500;
    let palette = generate_palette(max_iterations);
    let width = width as usize;
    let height = height as usize;

    // Compute rows in parallel
    let rows: Vec<Vec<u8>> = (0..height)
        .into_par_iter()
        .map(|py| {
            let cy =
                center_y + (py as f64 / (height - 1) as f64) * (2.0 * half_height) - half_height;

            let mut row_data = vec![0u8; width * 4];

            for px in 0..width {
                let cx =
                    center_x + (px as f64 / (width - 1) as f64) * (2.0 * half_width) - half_width;
                let iterations = mandelbrot_escape(cx, cy, max_iterations as u32);

                let color = if iterations == max_iterations as u32 {
                    [0, 0, 0, 255]
                } else {
                    palette[iterations as usize]
                };

                let p = px * 4;
                row_data[p] = color[0];
                row_data[p + 1] = color[1];
                row_data[p + 2] = color[2];
                row_data[p + 3] = color[3];
            }

            row_data
        })
        .collect();

    rows.into_iter().flatten().collect()
}
