use wasm_bindgen::prelude::*;
use web_sys::{ImageBitmap, OffscreenCanvas, OffscreenCanvasRenderingContext2d, console};

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

fn log(message: &str) {
    console::log_1(&JsValue::from_str(message));
}

#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    #[cfg(debug_assertions)]
    console_error_panic_hook::set_once();

    log("WASM initialized 🦀");
    Ok(())
}

/// Lanczos resampling algorithm
///
/// The Lanczos kernel:
///
/// ```text
///         ⎧ sinc(x) × sinc(x/a)   if |x| < a
/// L(x) =  ⎨
///         ⎩ 0                     otherwise
/// ```
///
/// Where:
/// - `sinc(x) = sin(πx) / (πx)`
/// - `a` = kernel size (2 = faster, 3 = higher quality)

const ALPHA: f64 = 3.0;

/// Normalized sinc function: `sin(πx) / (πx)`
fn sinc(x: f64) -> f64 {
    if x == 0.0 {
        return 1.0;
    }
    let px = std::f64::consts::PI * x;
    return f64::sin(px) / px;
}

/// Lanczos kernel with parameter "a" (window size), a=2 is faster, a=3 is higher quality
fn lanczos_kernel(x: f64, a: f64) -> f64 {
    if x == 0.0 {
        return 1.0;
    }
    if x.abs() >= a {
        return 0.0;
    }
    return sinc(x) * sinc(x / a);
}

fn lanczos_resample(
    src_pixels: &[u8],
    src_width: usize,
    src_height: usize,
    dst_width: usize,
    dst_height: usize,
) -> Vec<u8> {
    let mut dst_pixels = vec![0u8; dst_width * dst_height * 4];

    // Scale factors
    let scale_x = src_width as f64 / dst_width as f64;
    let scale_y = src_height as f64 / dst_height as f64;

    // Iterate over each destination pixel
    for dst_y in 0..dst_height {
        for dst_x in 0..dst_width {
            // Map destination pixel to source coordinates (center of the pixel)
            let src_center_x = (dst_x as f64 + 0.5) * scale_x - 0.5;
            let src_center_y = (dst_y as f64 + 0.5) * scale_y - 0.5;

            // Determine the range of source pixels to sample
            let start_x = (src_center_x - ALPHA).max(0.0).floor() as usize;
            let end_x = ((src_center_x + ALPHA).ceil() as usize).min(src_width);
            let start_y = (src_center_y - ALPHA).max(0.0).floor() as usize;
            let end_y = ((src_center_y + ALPHA).ceil() as usize).min(src_height);

            // Accumulate weighted samples
            let mut r = 0.0;
            let mut g = 0.0;
            let mut b = 0.0;
            let mut a = 0.0;
            let mut weight_sum = 0.0;

            // Convolve with the Lanczos kernel
            for y_src in start_y..end_y {
                for x_src in start_x..end_x {
                    // Calculate Lanczos weight
                    let dx = src_center_x - x_src as f64;
                    let dy = src_center_y - y_src as f64;
                    let weight = lanczos_kernel(dx, ALPHA) * lanczos_kernel(dy, ALPHA);

                    // Get source pixel index
                    let src_idx = (y_src * src_width + x_src) * 4;

                    // Accumulate weighted sample
                    r += src_pixels[src_idx] as f64 * weight;
                    g += src_pixels[src_idx + 1] as f64 * weight;
                    b += src_pixels[src_idx + 2] as f64 * weight;
                    a += src_pixels[src_idx + 3] as f64 * weight;
                    weight_sum += weight;
                }
            }

            // Normalize and write to destination
            let dst_idx = (dst_y * dst_width + dst_x) * 4;
            if weight_sum > 0.0 {
                dst_pixels[dst_idx] = (r / weight_sum).clamp(0.0, 255.0) as u8;
                dst_pixels[dst_idx + 1] = (g / weight_sum).clamp(0.0, 255.0) as u8;
                dst_pixels[dst_idx + 2] = (b / weight_sum).clamp(0.0, 255.0) as u8;
                dst_pixels[dst_idx + 3] = (a / weight_sum).clamp(0.0, 255.0) as u8;
            }
        }
    }

    dst_pixels
}

fn get_ctx_2d(canvas: &OffscreenCanvas) -> Result<OffscreenCanvasRenderingContext2d, JsValue> {
    Ok(canvas
        .get_context("2d")?
        .ok_or("Failed to get 2d context")?
        .dyn_into::<OffscreenCanvasRenderingContext2d>()?)
}

/// Scale image using Lanczos resampling
#[wasm_bindgen]
pub async fn scale_image(
    bitmap: ImageBitmap,
    new_width: u32,
    new_height: u32,
) -> Result<ImageBitmap, JsValue> {
    #[cfg(debug_assertions)]
    console_error_panic_hook::set_once();

    // Get source dimensions
    let src_width = bitmap.width();
    let src_height = bitmap.height();

    // Create source canvas to extract pixel data
    let src_canvas = OffscreenCanvas::new(src_width, src_height)?;
    let src_ctx = get_ctx_2d(&src_canvas)?;
    src_ctx.draw_image_with_image_bitmap(&bitmap, 0.0, 0.0)?;

    let src_image_data = src_ctx.get_image_data(0.0, 0.0, src_width as f64, src_height as f64)?;
    let src_pixels = src_image_data.data().to_vec();

    // Resample the pixels using the Lanczos resampling algorithm
    let dst_pixels = lanczos_resample(
        &src_pixels,
        src_width as usize,
        src_height as usize,
        new_width as usize,
        new_height as usize,
    );

    // Create ImageData from result
    let dst_data = web_sys::ImageData::new_with_u8_clamped_array_and_sh(
        wasm_bindgen::Clamped(&dst_pixels),
        new_width,
        new_height,
    )?;

    // Create destination canvas to put the resampled data
    let dst_canvas = OffscreenCanvas::new(new_width, new_height)?;
    let dst_ctx = get_ctx_2d(&dst_canvas)?;
    dst_ctx.put_image_data(&dst_data, 0.0, 0.0)?;

    // Create ImageBitmap from canvas
    let result = dst_canvas.transfer_to_image_bitmap()?;
    Ok(result)
}
