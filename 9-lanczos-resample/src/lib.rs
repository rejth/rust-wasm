use wasm_bindgen::prelude::*;
use web_sys::{
    console, CanvasRenderingContext2d, HtmlCanvasElement, ImageBitmap, ImageData, OffscreenCanvas,
    OffscreenCanvasRenderingContext2d,
};

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

/// Lanczos kernel size (a=2 for speed)
const LANCZOS_A: f64 = 2.0;

/// Normalized sinc function: `sin(πx) / (πx)`
fn sinc(x: f64) -> f64 {
    if x == 0.0 {
        return 1.0;
    }
    let px = std::f64::consts::PI * x;
    f64::sin(px) / px
}

/// Lanczos kernel
fn lanczos_kernel(x: f64, alpha: f64) -> f64 {
    if x == 0.0 {
        return 1.0;
    }
    if x.abs() >= alpha {
        return 0.0;
    }
    sinc(x) * sinc(x / alpha)
}

/// Clamp value to valid range
fn clamp_idx(val: isize, max: usize) -> usize {
    val.max(0).min(max as isize - 1) as usize
}

/// Horizontal pass (1D) with edge extension
fn resample_horizontal(
    src: &[f64],
    src_w: usize,
    src_h: usize,
    dst_w: usize,
    alpha: f64,
) -> Vec<f64> {
    let mut dst = vec![0.0f64; dst_w * src_h * 4];
    let scale = src_w as f64 / dst_w as f64;
    let support = alpha.ceil() as isize;

    for y in 0..src_h {
        for dx in 0..dst_w {
            let cx = (dx as f64 + 0.5) * scale - 0.5;
            let center = cx.floor() as isize;

            let (mut r, mut g, mut b, mut a, mut w) = (0.0, 0.0, 0.0, 0.0, 0.0);

            // Sample full kernel window with edge clamping
            for offset in -support..=support {
                let sx = clamp_idx(center + offset, src_w);
                let weight = lanczos_kernel(cx - (center + offset) as f64, alpha);
                let i = (y * src_w + sx) * 4;
                r += src[i] * weight;
                g += src[i + 1] * weight;
                b += src[i + 2] * weight;
                a += src[i + 3] * weight;
                w += weight;
            }

            let i = (y * dst_w + dx) * 4;
            if w > 0.0 {
                dst[i] = r / w;
                dst[i + 1] = g / w;
                dst[i + 2] = b / w;
                dst[i + 3] = a / w;
            }
        }
    }
    dst
}

/// Vertical pass (1D) with edge extension
fn resample_vertical(src: &[f64], w: usize, src_h: usize, dst_h: usize, alpha: f64) -> Vec<u8> {
    let mut dst = vec![0u8; w * dst_h * 4];
    let scale = src_h as f64 / dst_h as f64;
    let support = alpha.ceil() as isize;

    for dy in 0..dst_h {
        let cy = (dy as f64 + 0.5) * scale - 0.5;
        let center = cy.floor() as isize;

        for x in 0..w {
            let (mut r, mut g, mut b, mut a, mut wt) = (0.0, 0.0, 0.0, 0.0, 0.0);

            // Sample full kernel window with edge clamping
            for offset in -support..=support {
                let sy = clamp_idx(center + offset, src_h);
                let weight = lanczos_kernel(cy - (center + offset) as f64, alpha);
                let i = (sy * w + x) * 4;
                r += src[i] * weight;
                g += src[i + 1] * weight;
                b += src[i + 2] * weight;
                a += src[i + 3] * weight;
                wt += weight;
            }

            let i = (dy * w + x) * 4;
            if wt > 0.0 {
                dst[i] = (r / wt).clamp(0.0, 255.0) as u8;
                dst[i + 1] = (g / wt).clamp(0.0, 255.0) as u8;
                dst[i + 2] = (b / wt).clamp(0.0, 255.0) as u8;
                dst[i + 3] = (a / wt).clamp(0.0, 255.0) as u8;
            }
        }
    }
    dst
}

/// Lanczos-2 resampling
fn lanczos_resample(src: &[u8], sw: usize, sh: usize, dw: usize, dh: usize, alpha: f64) -> Vec<u8> {
    let src_f64: Vec<f64> = src.iter().map(|&x| x as f64).collect();
    let intermediate = resample_horizontal(&src_f64, sw, sh, dw, alpha);
    resample_vertical(&intermediate, dw, sh, dh, alpha)
}

fn get_ctx(canvas: &HtmlCanvasElement) -> Result<CanvasRenderingContext2d, JsValue> {
    Ok(canvas
        .get_context("2d")?
        .ok_or("Failed to get 2d context")?
        .dyn_into::<CanvasRenderingContext2d>()?)
}

/// Scale canvas content by 2x using Lanczos-2 separable resampling
#[wasm_bindgen]
pub fn scale_canvas_2x(canvas: &HtmlCanvasElement) -> Result<(), JsValue> {
    let sw = canvas.width();
    let sh = canvas.height();
    let dw = sw * 2;
    let dh = sh * 2;

    log(&format!("Lanczos 2x: {}x{} → {}x{}", sw, sh, dw, dh));

    // Get pixel data
    let ctx = get_ctx(canvas)?;
    let src_data = ctx.get_image_data(0.0, 0.0, sw as f64, sh as f64)?;
    let src_pixels = src_data.data().to_vec();

    // Apply Lanczos-2 resampling
    let dst_pixels = lanczos_resample(
        &src_pixels,
        sw as usize,
        sh as usize,
        dw as usize,
        dh as usize,
        LANCZOS_A,
    );

    // Create output canvas with scaled image
    let dst_data = web_sys::ImageData::new_with_u8_clamped_array_and_sh(
        wasm_bindgen::Clamped(&dst_pixels),
        dw,
        dh,
    )?;

    canvas.set_width(dw);
    canvas.set_height(dh);

    let ctx = get_ctx(canvas)?;
    ctx.put_image_data(&dst_data, 0.0, 0.0)?;

    log("Done! 🎉");
    Ok(())
}

fn get_offscreen_ctx(
    canvas: &OffscreenCanvas,
) -> Result<OffscreenCanvasRenderingContext2d, JsValue> {
    Ok(canvas
        .get_context("2d")?
        .ok_or("Failed to get 2d context")?
        .dyn_into::<OffscreenCanvasRenderingContext2d>()?)
}

/// Scale an ImageBitmap to specified dimensions using Lanczos-2 resampling
#[wasm_bindgen]
pub fn scale_image(image: &ImageBitmap, dst_w: u32, dst_h: u32) -> Result<ImageData, JsValue> {
    let sw = image.width();
    let sh = image.height();

    log(&format!(
        "Lanczos scale: {}x{} → {}x{}",
        sw, sh, dst_w, dst_h
    ));

    // Draw ImageBitmap to OffscreenCanvas to get pixel data
    let src_canvas = OffscreenCanvas::new(sw, sh)?;
    let src_ctx = get_offscreen_ctx(&src_canvas)?;
    src_ctx.draw_image_with_image_bitmap(image, 0.0, 0.0)?;

    // Get pixel data
    let src_data = src_ctx.get_image_data(0.0, 0.0, sw as f64, sh as f64)?;
    let src_pixels = src_data.data().to_vec();

    // Apply Lanczos-2 resampling
    let dst_pixels = lanczos_resample(
        &src_pixels,
        sw as usize,
        sh as usize,
        dst_w as usize,
        dst_h as usize,
        LANCZOS_A,
    );

    // Create and return ImageData
    let dst_data = web_sys::ImageData::new_with_u8_clamped_array_and_sh(
        wasm_bindgen::Clamped(&dst_pixels),
        dst_w,
        dst_h,
    )?;

    log("Done! 🎉");
    Ok(dst_data)
}
