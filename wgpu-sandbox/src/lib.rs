use std::sync::Arc;

use winit::{
    application::ApplicationHandler,
    dpi::PhysicalPosition,
    event::*,
    event_loop::{ActiveEventLoop, EventLoop},
    keyboard::{KeyCode, PhysicalKey},
    window::Window,
};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
fn log(message: &str) {
    use wasm_bindgen::JsValue;
    use web_sys::console;
    console::log_1(&JsValue::from_str(message));
}

pub struct State {
    surface: wgpu::Surface<'static>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    config: wgpu::SurfaceConfiguration,
    render_pipeline: wgpu::RenderPipeline,
    clear_color: wgpu::Color,
    window: Arc<Window>,
    is_surface_configured: bool,
}

impl State {
    pub async fn new(window: Arc<Window>) -> anyhow::Result<Self> {
        let size = window.inner_size();

        // The instance is a handle to our GPU.
        // Backends::PRIMARY => Vulkan + Metal + DX12 + Browser WebGPU.
        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            #[cfg(not(target_arch = "wasm32"))]
            backends: wgpu::Backends::PRIMARY,
            #[cfg(target_arch = "wasm32")]
            backends: wgpu::Backends::BROWSER_WEBGPU,
            ..Default::default()
        });

        // The surface is the part of the window that we draw to.
        let surface = instance.create_surface(window.clone()).unwrap();

        // The adapter is a handle for our actual graphics card.
        // We request an adapter that is compatible with our surface.
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::default(),
                compatible_surface: Some(&surface),
                force_fallback_adapter: false,
            })
            .await
            .unwrap();

        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor {
                label: None,
                required_features: wgpu::Features::empty(),
                experimental_features: wgpu::ExperimentalFeatures::disabled(),
                // "required_limits" describes the limit of certain types of resources that we can create.
                // WebGL doesn't support all of wgpu's features, so if we're building for the web we'll have to disable some.
                required_limits: if cfg!(target_arch = "wasm32") {
                    wgpu::Limits::downlevel_webgl2_defaults()
                } else {
                    wgpu::Limits::default()
                },
                // The "memory_hints" field provides the adapter with a preferred memory allocation strategy.
                // This is used to optimize the allocation of memory for the resources.
                memory_hints: Default::default(),
                // "trace" describes the tracing level of the device.
                trace: wgpu::Trace::Off,
            })
            .await
            .unwrap();

        let surface_caps = surface.get_capabilities(&adapter);
        // Shader code assumes an sRGB surface texture. Using a different
        // one will result in all the colors coming out darker. If you want to support non
        // sRGB surfaces, you'll need to account for that when drawing to the frame.
        let surface_format = surface_caps
            .formats
            .iter()
            .find(|f| f.is_srgb())
            .copied()
            .unwrap_or(surface_caps.formats[0]);

        // The config is the configuration of the surface.
        // This will define how the surface creates its underlying SurfaceTexture.
        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT, // Describes how SurfaceTextures will be used. RENDER_ATTACHMENT specifies that the textures will be used to write to the screen.
            format: surface_format, // Defines how SurfaceTextures will be stored on the GPU. The format of the surface - sRGB surface texture.
            width: size.width,      // The width of the surface in pixels.
            height: size.height,    // The height of the surface in pixels.
            present_mode: surface_caps.present_modes[0], // Determines how to sync the surface with the display. FIFO (first in, first out) ensures that frames are displayed in the order they are submitted.
            alpha_mode: surface_caps.alpha_modes[0], // The alpha mode of the surface. It has something to do with transparent windows
            view_formats: vec![], // List of TextureFormats that you can use when creating TextureViews.
            desired_maximum_frame_latency: 2, // The desired maximum frame latency of the surface.
        };

        // TODO: Specify vertices. Shape a geometry in clip space.
        // TODO: Create a vertex buffer
        // TODO: Create a vertex buffer layout
        /*
          Vertex buffer layout tells the GPU how to interpret the vertex buffer (how to read the data from the buffer)
        */

        let vertex_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Vertex Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shaders/vertex.wgsl").into()),
        });

        let fragment_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Fragment Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shaders/fragment.wgsl").into()),
        });

        // TODO: Create a bind group layout
        /*
          When having multiple pipelines (for example, render and compute) that want to share resources, we need to create the layout explicitly, and then provide it to both the bind group and pipelines.
          Layout describes all of the resources that are present in the bind group, not just the ones used by a specific pipeline.
        */

        // TODO: Create a bind group
        /*
          A bind group is a collection of resources that are accessible to our vertex shader. There may be multiple bind groups in a pipeline.
          Each bind group can contain buffers, textures, samplers and other resources.
        */

        let render_pipeline_layout =
            device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some("Render Pipeline Layout"),
                bind_group_layouts: &[],
                immediate_size: 0,
            });

        let render_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Render Pipeline"),
            layout: Some(&render_pipeline_layout),
            vertex: wgpu::VertexState {
                module: &vertex_shader,
                entry_point: Some("main"),
                buffers: &[], // Tells wgpu what type of vertices we want to pass to the vertex shader
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &fragment_shader,
                entry_point: Some("main"),
                // tells wgpu what color outputs it should set up
                targets: &[Some(wgpu::ColorTargetState {
                    format: config.format,
                    blend: Some(wgpu::BlendState {
                        color: wgpu::BlendComponent::REPLACE,
                        alpha: wgpu::BlendComponent::REPLACE,
                    }),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            }),
            // Describes how to interpret our vertices when converting them into triangles
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList, // Means that every three vertices will correspond to one triangle
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw, // Tells wgpu how to determine whether a given triangle is facing forward or not. FrontFace::Ccw means that a triangle is facing forward if the vertices are arranged in a counter-clockwise direction. Triangles that are not considered facing forward are culled (not included in the render) as specified by CullMode::Back
                cull_mode: Some(wgpu::Face::Back), // Tells wgpu whether to cull the triangles or not. Face::Back means that triangles that are not facing forward are culled
                // Setting this to anything other than Fill requires Features::NON_FILL_POLYGON_MODE
                polygon_mode: wgpu::PolygonMode::Fill, // Tells wgpu whether to fill the triangles or not
                // Requires Features::DEPTH_CLIP_CONTROL
                unclipped_depth: false, // Tells wgpu whether to clip fragments that are outside the depth range of the depth/stencil attachment
                // Requires Features::CONSERVATIVE_RASTERIZATION
                conservative: false, // Tells wgpu whether to use conservative rasterization
            },
            depth_stencil: None, // Depth/stencil buffer
            // Determines how many samples the pipeline will use
            multisample: wgpu::MultisampleState {
                count: 1, // Determines how many samples the pipeline will use. In this case, we are using 1 sample
                mask: !0, // Specifies which samples should be active. In this case, we are using all of them
                alpha_to_coverage_enabled: false, // Has to do with anti-aliasing
            },
            // If the pipeline will be used with a multiview render pass, this tells wgpu to render to just specific texture layers.
            multiview_mask: None, // Indicates how many array layers the render attachments can have. We won't be rendering to array textures, so we can set this to None
            cache: None, // Allows wgpu to cache shader compilation data. Only really useful for Android build targets
        });

        Ok(Self {
            surface,
            device,
            queue,
            config,
            window,
            render_pipeline,
            clear_color: wgpu::Color::BLACK,
            is_surface_configured: false,
        })
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        if width > 0 && height > 0 {
            // Clamp dimensions to maximum supported texture size for WebGL
            // let max_dimension = self.device.limits().max_texture_dimension_2d;
            // self.config.width = width.min(max_dimension);
            // self.config.height = height.min(max_dimension);

            self.config.width = width;
            self.config.height = height;
            self.surface.configure(&self.device, &self.config);
            self.is_surface_configured = true;
        }
    }

    fn handle_key(&self, event_loop: &ActiveEventLoop, code: KeyCode, is_pressed: bool) {
        match (code, is_pressed) {
            (KeyCode::Escape, true) => event_loop.exit(),
            _ => {}
        }
    }

    fn handle_mouse_moved(&mut self, position: PhysicalPosition<f64>) {
        self.clear_color.r = position.x / self.config.width as f64;
        self.clear_color.g = position.y / self.config.height as f64;
    }

    fn update(&mut self) {
        // TODO: Implement update logic
    }

    fn render(&mut self) -> Result<(), wgpu::SurfaceError> {
        self.window.request_redraw();

        // We can't render unless the surface is configured
        if !self.is_surface_configured {
            return Ok(());
        }

        // Get the current texture and create a view for it. It is a texture that receives the output of any drawing commands performed.
        let output = self.surface.get_current_texture()?;
        let view = output
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());

        // Command encoder is used to record all the drawing commands that will be executed by the GPU.
        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("Render Encoder"),
            });

        {
            /*
             * Begin a render pass to clear the canvas.
             * Render pass is when all drawing operations in GPU happen.
             * Render pass may have several textures, called attachments, with various purposes such as storing the depth of rendered geometry or providing antialiasing.
             */
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Render Pass"),
                // The "color_attachments" field describes where we are going to draw our color data to.
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,          // informs wgpu what texture to save the colors to
                    resolve_target: None, // it is the texture that will receive the resolved output. It is used to resolve the multisampled texture to a single sample texture.
                    depth_slice: None,
                    // This tells wgpu what to do with the colors on the screen
                    ops: wgpu::Operations {
                        // The "load" field tells wgpu how to handle colors stored from the previous frame. In out setup we want to clear the texture to a specific color.
                        load: wgpu::LoadOp::Clear(self.clear_color),
                        // Store the result of the render pass in the texture
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                occlusion_query_set: None,
                timestamp_writes: None,
                multiview_mask: None,
            });

            render_pass.set_pipeline(&self.render_pipeline);
            // TODO: Set bind group
            // TODO: Set vertex buffer
            render_pass.draw(0..3, 0..1);
        }

        /*
         * Submit the command buffer to the GPU.
         * First finish the command encoder and get the command buffer to be submitted to the GPU.
         * Then submit the command buffer to the GPU. The queue performs all GPU commands, ensuring that their execution is well ordered and properly synchronized.
         * Once you submit a command buffer, it cannot be used again, so you need to create a new one for other commands
         */
        self.queue.submit(std::iter::once(encoder.finish()));
        output.present();

        Ok(())
    }
}

pub struct App {
    #[cfg(target_arch = "wasm32")]
    proxy: Option<winit::event_loop::EventLoopProxy<State>>,
    state: Option<State>,
}

impl App {
    pub fn new(#[cfg(target_arch = "wasm32")] event_loop: &EventLoop<State>) -> Self {
        #[cfg(target_arch = "wasm32")]
        let proxy = Some(event_loop.create_proxy());
        Self {
            state: None,
            #[cfg(target_arch = "wasm32")]
            proxy,
        }
    }
}

impl ApplicationHandler<State> for App {
    /*
       It defines attributes about the window including some web specific stuff.
       We use those attributes to create the window.
       We create a future that creates our State struct
       On native we use pollster to get await the future
       On web we run the future asynchronously which sends the results to the user_event function
    */
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        #[allow(unused_mut)]
        let mut window_attributes = Window::default_attributes();

        #[cfg(target_arch = "wasm32")]
        {
            use wasm_bindgen::JsCast;
            use winit::platform::web::WindowAttributesExtWebSys;

            const CANVAS_ID: &str = "canvas";

            let window = wgpu::web_sys::window().unwrap_throw();
            let document = window.document().unwrap_throw();
            let canvas = document.get_element_by_id(CANVAS_ID).unwrap_throw();
            let html_canvas_element = canvas.unchecked_into();
            window_attributes = window_attributes.with_canvas(Some(html_canvas_element));
        }

        let window = Arc::new(event_loop.create_window(window_attributes).unwrap());

        #[cfg(not(target_arch = "wasm32"))]
        {
            // If we are not on web we can use pollster to await the
            self.state = Some(pollster::block_on(State::new(window)).unwrap());
        }

        #[cfg(target_arch = "wasm32")]
        {
            // Run the future asynchronously and use the proxy to send the results to the event loop
            if let Some(proxy) = self.proxy.take() {
                wasm_bindgen_futures::spawn_local(async move {
                    assert!(
                        proxy
                            .send_event(State::new(window).await.expect("Unable to create canvas"))
                            .is_ok()
                    )
                });
            }
        }
    }

    #[allow(unused_mut)]
    fn user_event(&mut self, _event_loop: &ActiveEventLoop, mut event: State) {
        // This is where proxy.send_event() ends up
        #[cfg(target_arch = "wasm32")]
        {
            event.window.request_redraw();
            event.resize(
                event.window.inner_size().width,
                event.window.inner_size().height,
            );
        }
        self.state = Some(event);
    }

    /*
    This function is called when a window event occurs.
    It dispatches the event to the appropriate handler.
    This is where we can process events such as keyboard inputs, and mouse movements, as well as other window events such as when the window wants to draw or is resized.
    */
    fn window_event(
        &mut self,
        event_loop: &ActiveEventLoop,
        _window_id: winit::window::WindowId,
        event: WindowEvent,
    ) {
        let state = match &mut self.state {
            Some(canvas) => canvas,
            None => return,
        };

        match event {
            WindowEvent::CloseRequested => event_loop.exit(),
            WindowEvent::Resized(size) => state.resize(size.width, size.height),
            WindowEvent::CursorMoved { position, .. } => state.handle_mouse_moved(position),
            WindowEvent::RedrawRequested => {
                state.update();
                match state.render() {
                    Ok(_) => {
                        log::info!("Rendered");
                    }
                    // Reconfigure the surface if it's lost or outdated
                    Err(wgpu::SurfaceError::Lost | wgpu::SurfaceError::Outdated) => {
                        let size = state.window.inner_size();
                        state.resize(size.width, size.height);
                    }
                    Err(e) => {
                        log::error!("Unable to render {}", e);
                    }
                }
            }
            WindowEvent::MouseInput { state, button, .. } => match (button, state.is_pressed()) {
                (MouseButton::Left, true) => {
                    log::info!("Mouse button left pressed");
                }
                (MouseButton::Left, false) => {
                    log::info!("Mouse button left released");
                }
                _ => {}
            },
            WindowEvent::KeyboardInput {
                event:
                    KeyEvent {
                        physical_key: PhysicalKey::Code(code),
                        state: key_state,
                        ..
                    },
                ..
            } => state.handle_key(event_loop, code, key_state.is_pressed()),
            _ => {}
        }
    }
}

pub fn run() -> anyhow::Result<()> {
    #[cfg(not(target_arch = "wasm32"))]
    {
        env_logger::init();
    }
    #[cfg(target_arch = "wasm32")]
    {
        console_log::init_with_level(log::Level::Info).unwrap_throw();
    }

    let event_loop = EventLoop::with_user_event().build()?;
    let mut app = App::new(
        #[cfg(target_arch = "wasm32")]
        &event_loop,
    );

    event_loop.run_app(&mut app)?;

    Ok(())
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn run_web() -> Result<(), wasm_bindgen::JsValue> {
    console_error_panic_hook::set_once();

    log("WASM initialized 🦀");

    run().unwrap_throw();

    Ok(())
}
