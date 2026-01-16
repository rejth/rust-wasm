use std::sync::Arc;

use wgpu::util::DeviceExt;
use winit::{
    dpi::PhysicalPosition, event_loop::ActiveEventLoop, keyboard::KeyCode, window::Window,
};

pub struct State {
    pub window: Arc<Window>,
    surface: wgpu::Surface<'static>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    config: wgpu::SurfaceConfiguration,
    render_pipeline: wgpu::RenderPipeline,
    compute_pipeline: wgpu::ComputePipeline,
    vertex_buffer: wgpu::Buffer,
    index_buffer: wgpu::Buffer,
    num_indices: u32,
    cell_bind_groups: [wgpu::BindGroup; 2],
    clear_color: wgpu::Color,
    is_surface_configured: bool,
    step: usize,
}

#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
struct Vertex {
    position: [f32; 2], // Represents the x, y of the vertex in 2D space
    color: [f32; 3],    // Represents the r, g, and b of the vertex color
}

impl Vertex {
    fn desc() -> wgpu::VertexBufferLayout<'static> {
        // Vertex buffer layout defines how a buffer is represented in memory and tells the GPU how to interpret the vertex buffer (how to read the data from the buffer).
        // Without this, the render pipeline has no idea how to map the buffer in the shader.
        wgpu::VertexBufferLayout {
            // The number of bytes the GPU needs to skip forward in the buffer when it's looking for the next vertex.
            // Each vertex of our square is made up of two (x, y) 32-bit floating point numbers. A 32-bit float is 4 bytes, so two floats per vertex is 8 bytes per vertex.
            // Since we store two attributes (position and color) in the vertex, the total stride is 16 bytes.
            array_stride: std::mem::size_of::<Vertex>() as wgpu::BufferAddress,
            // Tells the pipeline whether each element of the array in this buffer represents per-vertex data or per-instance data.
            // We can specify wgpu::VertexStepMode::Instance if we only want to change vertices when we start drawing a new instance.
            step_mode: wgpu::VertexStepMode::Vertex,
            // The attributes of the vertex buffer. An attribute is a single piece of data that is associated with a vertex. It is unique for each vertex.
            attributes: &[
                // The first attribute is the position.
                wgpu::VertexAttribute {
                    // This defines the offset in bytes until the attribute starts.
                    // We really only have to worry about this if our buffer has more than one attribute in it.
                    // For the first attribute, the offset is usually zero. For any later attributes, the offset is the sum over size_of of the previous attributes' data.
                    offset: 0,
                    // Tells the shader what location to store this attribute at.
                    // shader_location is the index (0-15) of the attribute in the vertex shader - @location(0) in vertex shader
                    shader_location: 0,
                    // Tells the shader the shape of the attribute.
                    // Float32x3 corresponds to vec3<f32> in shader code.
                    // The max value we can store in an attribute is Float32x4 (Uint32x4, and Sint32x4 work as well).
                    // We should keep this in mind for when we have to store things that are bigger than Float32x4.
                    format: wgpu::VertexFormat::Float32x2,
                },
                // The second attribute is the color.
                wgpu::VertexAttribute {
                    offset: std::mem::size_of::<[f32; 2]>() as wgpu::BufferAddress,
                    shader_location: 1,
                    format: wgpu::VertexFormat::Float32x3,
                },
            ],
        }
    }
}

impl State {
    const GRID_SIZE: f32 = 64.0;
    const CELL_STATE_LENGTH: u32 = (Self::GRID_SIZE * Self::GRID_SIZE) as u32;

    const WORKGROUP_SIZE: f32 = 8.0;
    const WORKGROUP_COUNT: u32 = (Self::GRID_SIZE / Self::WORKGROUP_SIZE).ceil() as u32;

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

        /*
         * Texture format that the context should use for rendering to the canvas.
         * Each texture has a format that lets the GPU know how that data is laid out in memory.
         * Format impacts efficiency of displaying images on the canvas.
         * Different types of devices perform best when using different texture formats.
         * If you don't use the device's preferred format it may cause extra memory copies to happen behind the scenes before the image can be displayed as part of the page.

        * Shader code assumes an sRGB surface texture. Using a different one will result in all the colors coming out darker.
        * If you want to support non-sRGB surfaces, you'll need to account for that when drawing to the frame.
        * sRGB surfaces, you'll need to account for that when drawing to the frame.
        * We find the first sRGB format and use it. If no sRGB format is found, we use the first format.
        */
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

        /*
         * Define the vertices in clip space. To draw a rectangle, we need to render 2 triangles (since a rectangle is made of 2 triangles).
         * We arrange the vertices in counter-clockwise order: top-left, bottom-left, bottom-right, top-right.
         * We do it this way partially out of tradition, but mostly because we specified in the primitive of the render_pipeline that we want the front_face of our geometry to be wgpu::FrontFace::Ccw so that we cull the back face.
         * This means that any geometry that should be facing us should have its vertices in counter-clockwise order.
         */
        const VERTICES: &[Vertex] = &[
            Vertex {
                position: [-0.5, 0.5],
                color: [1.0, 0.0, 0.0],
            }, // 0: Top-left
            Vertex {
                position: [-0.5, -0.5],
                color: [0.0, 1.0, 0.0],
            }, // 1: Bottom-left
            Vertex {
                position: [0.5, -0.5],
                color: [0.0, 0.0, 1.0],
            }, // 2: Bottom-right
            Vertex {
                position: [0.5, 0.5],
                color: [1.0, 1.0, 0.0],
            }, // 3: Top-right
        ];

        /*
         * Define the indices to draw the vertices.
         * We will use indices to draw the vertices. Indices are a list of indices that correspond to the vertices.
         * This is useful and memory efficient because it allows us to reuse vertices and avoid duplicating them.
         * Basically, we store all the unique vertices in VERTICES, and we create another buffer that stores indices to elements in VERTICES to create the triangles.
         * The order of the indices matters. The triangles are created counterclockwise. To change it to clockwise, go to render pipeline and change the "front_face" to Cw.
         */
        const INDICES: &[u16] = &[
            0, 1, 2, // First triangle (top-left, bottom-left, bottom-right)
            0, 2, 3, // Second triangle (top-left, bottom-right, top-right)
        ];

        // Create a vertex buffer to store the vertices.
        let vertex_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Vertex Buffer"),
            contents: bytemuck::cast_slice(VERTICES),
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
        });

        let index_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Index Buffer"),
            contents: bytemuck::cast_slice(INDICES),
            usage: wgpu::BufferUsages::INDEX | wgpu::BufferUsages::COPY_DST,
        });

        /*
         * A uniform is a blob of data available to every invocation of a set of shaders. They are like constants in a shader.
         * Uniforms are useful for communicating values that are common for a piece of geometry (like its position), a full frame of animation (like the current time), or even the entire lifespan of the app (like a user preference).
         * Unlike storage buffers, uniform buffers are read-only by the GPU and are used for smaller amounts of data that have the potential to update frequently (like model, view, and projection matrices in 3D applications).
         * For smaller amounts of data that has to be updated frequently, uniform buffers are typically the safer choice for better performance.
         */
        let uniforms = [Self::GRID_SIZE, Self::GRID_SIZE];

        let uniform_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Uniform Buffer"),
            contents: bytemuck::cast_slice(&uniforms),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let mut cell_state_array = vec![0u32; Self::CELL_STATE_LENGTH as usize];
        let mut seed: u32 = 0x1234_5678;
        // Set each cell to a pseudo-random state, then copy the array into the storage buffer.
        for cell in cell_state_array.iter_mut() {
            seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
            *cell = if seed % 10 < 4 { 1 } else { 0 };
        }

        /*
         * Create two storage buffers to hold the cell state.
         * Storage buffers are general-use buffers that can be read and written to in compute shaders, and read in vertex shaders.
         * They are like general memory. They can be very large and are useful for storing data that needs to be efficiently shared between the CPU and GPU.
         */
        /*
         * We use ping-pong pattern to alternate between two storage buffers.
         * On each step of the simulation, it reads from one copy of the state and writes to the other. Then, on the next step, it flips it and reads from the state it wrote to previously.
         * By using the ping pong pattern, we ensure that the GPU always performs the next step of the simulation using only the results of the last step.
         */
        let cell_state_storage = [
            device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: Some("Cell State A"),
                contents: bytemuck::cast_slice(&cell_state_array),
                usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
            }),
            device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: Some("Cell State B"),
                contents: bytemuck::cast_slice(&cell_state_array),
                usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
            }),
        ];

        /*
         * When having multiple pipelines (for example, render and compute) that want to share resources, we need to create the layout explicitly, and then provide it to both the bind group and pipelines.
         * Layout describes all of the resources that are present in the bind group, not just the ones used by a specific pipeline.
         */
        let cell_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("Cell Bind Group Layout"),
                entries: &[
                    wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        count: None,
                        // Uniform buffer that contains the grid size
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Uniform,
                            // Indicates that the location of the data in the buffer may change.
                            // This will be the case if you store multiple data sets that vary in size in a single buffer.
                            has_dynamic_offset: false,
                            // Specifies the smallest size the buffer can be. We don't have to specify this, so we leave it None.
                            min_binding_size: None,
                        },
                        // Expose the data for vertex, fragment and compute shaders
                        visibility: wgpu::ShaderStages::VERTEX
                            | wgpu::ShaderStages::FRAGMENT
                            | wgpu::ShaderStages::COMPUTE,
                    },
                    wgpu::BindGroupLayoutEntry {
                        binding: 1,
                        count: None,
                        // Storage buffer that we read from the current state of the grid
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Storage { read_only: true },
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        visibility: wgpu::ShaderStages::VERTEX | wgpu::ShaderStages::COMPUTE,
                    },
                    wgpu::BindGroupLayoutEntry {
                        binding: 2,
                        count: None,
                        // Storage buffer that we write out the new state of the grid to
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Storage { read_only: false },
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        visibility: wgpu::ShaderStages::COMPUTE,
                    },
                ],
            });

        /*
         * A bind group is a collection of resources that are accessible to our vertex shader. There may be multiple bind groups in a pipeline.
         * Each bind group can contain buffers, textures, samplers and other resources.
         */
        let cell_bind_groups = [
            device.create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("Cell renderer bind group A"),
                layout: &cell_bind_group_layout, // Layout describes which types of resources this bind group contains
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: uniform_buffer.as_entire_binding(),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: cell_state_storage[0].as_entire_binding(),
                    },
                    wgpu::BindGroupEntry {
                        binding: 2,
                        resource: cell_state_storage[1].as_entire_binding(),
                    },
                ],
            }),
            device.create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("Cell renderer bind group B"),
                layout: &cell_bind_group_layout,
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: uniform_buffer.as_entire_binding(),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: cell_state_storage[1].as_entire_binding(),
                    },
                    wgpu::BindGroupEntry {
                        binding: 2,
                        resource: cell_state_storage[0].as_entire_binding(),
                    },
                ],
            }),
        ];

        /*
         * Create shader modules for the vertex, fragment and compute shaders.
         * Shader modules are the compiled shaders that are loaded into the GPU.
         */
        let vertex_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Vertex Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shaders/vertex.wgsl").into()),
        });
        let fragment_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Fragment Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shaders/fragment.wgsl").into()),
        });
        let compute_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Compute Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shaders/compute.wgsl").into()),
        });

        /*
         * A pipeline layout is a list of bind group layouts that one or more pipelines use.
         * The order of the bind group layouts in the array needs to correspond with the @group attributes in the shaders.
         */
        let render_pipeline_layout =
            device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some("Render Pipeline Layout"),
                bind_group_layouts: &[&cell_bind_group_layout],
                immediate_size: 0,
            });

        /*
         * Create a render pipeline.
         * The render pipeline controls how geometry is drawn, including things like which shaders are used, how to interpret data in vertex buffers, which kind of geometry should be rendered (lines, points, triangles...)
         */
        let render_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Render Pipeline"),
            layout: Some(&render_pipeline_layout),
            vertex: wgpu::VertexState {
                module: &vertex_shader,
                entry_point: Some("main"),
                buffers: &[Vertex::desc()], // Tells wgpu what type of vertices we want to pass to the vertex shader
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &fragment_shader,
                entry_point: Some("main"),
                // Tells wgpu what color outputs it should set up
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

        /*
         * Create a compute pipeline.
         * The compute pipeline controls how the compute shader is executed.
         */
        let compute_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Compute Pipeline"),
            module: &compute_shader,
            entry_point: Some("main"),
            layout: Some(&render_pipeline_layout),
            cache: None,
            compilation_options: wgpu::PipelineCompilationOptions::default(),
        });

        Ok(Self {
            surface,
            device,
            queue,
            config,
            window,
            render_pipeline,
            compute_pipeline,
            vertex_buffer,
            index_buffer,
            num_indices: INDICES.len() as u32,
            cell_bind_groups,
            clear_color: wgpu::Color::BLACK,
            is_surface_configured: false,
            step: 0,
        })
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        if width > 0 && height > 0 {
            // If we are on WebGL, we have to clamp dimensions to maximum supported texture size
            // let max_dimension = self.device.limits().max_texture_dimension_2d;
            // self.config.width = width.min(max_dimension);
            // self.config.height = height.min(max_dimension);

            // If we are on WebGPU, we can use the full width and height.
            self.config.width = width;
            self.config.height = height;
            self.surface.configure(&self.device, &self.config);
            self.is_surface_configured = true;
        }
    }

    pub fn handle_key(&self, event_loop: &ActiveEventLoop, code: KeyCode, is_pressed: bool) {
        match (code, is_pressed) {
            (KeyCode::Escape, true) => event_loop.exit(),
            (KeyCode::Space, true) => {
                self.window.request_redraw();
            }
            _ => {}
        }
    }

    #[allow(dead_code)]
    pub fn handle_mouse_moved(&mut self, position: PhysicalPosition<f64>) {
        self.clear_color.r = position.x / self.config.width as f64;
        self.clear_color.g = position.y / self.config.height as f64;
    }

    pub fn update(&mut self) {}

    pub fn render(&mut self) -> Result<(), wgpu::SurfaceError> {
        // Uncomment this to run an infinite render loop
        // self.window.request_redraw();

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
             * We want to do the compute pass before the render pass because it allows the render pass to immediately use the latest results from the compute pass.
             * This way, the output buffer of the compute pipeline becomes the input buffer for the render pipeline.
             */
            let mut compute_pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Compute Pass"),
                timestamp_writes: None,
            });

            compute_pass.set_pipeline(&self.compute_pipeline);
            /*
             * Set the bind group.
             * The first argument is the index of the bind group to set.
             * The second argument is the bind group to set.
             * The third argument is the dynamic offsets. We don't have any dynamic offsets, so we pass an empty array.
             */
            compute_pass.set_bind_group(0, &self.cell_bind_groups[self.step % 2], &[]);
            /*
             * It's not the number of invocations! Instead, it's the number of workgroups to execute, as defined by the @workgroup_size in your shader.
             * If we want the shader to execute 32x32 times in order to cover the entire grid, and our workgroup size is 8x8, we need to dispatch 4x4 workgroups (4 * 8 = 32).
             * That's why we divide the grid size by the workgroup size and pass that value into dispatch_workgroups().
             */
            compute_pass.dispatch_workgroups(Self::WORKGROUP_COUNT, Self::WORKGROUP_COUNT, 1);
        }

        self.step += 1;

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
                    view: &view,          // Informs wgpu what texture to save the colors to
                    resolve_target: None, // It is the texture that will receive the resolved output. It is used to resolve the multisampled texture to a single sample texture.
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
            render_pass.set_bind_group(0, &self.cell_bind_groups[self.step % 2], &[]);
            /*
             * Set the vertex buffer.
             * The first is what buffer slot to use for this vertex buffer. We can have multiple vertex buffers set at a time.
             * The second is the slice of the buffer to use. We can store as many objects in a buffer as the hardware allows, so slice allows us to specify which portion of the buffer to use. We use .. to specify the entire buffer.
             */
            render_pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
            /*
             * Set the index buffer.
             * It's only possible to have one index buffer set at a time.
             * The first argument is the slice of the buffer to use. We can store as many objects in a buffer as the hardware allows, so slice allows us to specify which portion of the buffer to use. We use .. to specify the entire buffer.
             * The second argument is the format of the indices. We use Uint16 because we are using 16-bit indices.
             */
            render_pass.set_index_buffer(self.index_buffer.slice(..), wgpu::IndexFormat::Uint16);
            /*
             * Draw the vertices.
             * The "draw" method ignores the index buffer, so we use "draw_indexed" instead.
             * Instancing is a way to tell the GPU to draw multiple copies of the same geometry with a single call to draw, which is much faster than calling draw once for every copy.
             */
            render_pass.draw_indexed(0..self.num_indices, 0, 0..Self::CELL_STATE_LENGTH);
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
