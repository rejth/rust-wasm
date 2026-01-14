/*
  Vertex shader transforms the geometry from object space to clip space.
  It is called once for each vertex of the geometry.
*/

struct VertexInput {
  @builtin(vertex_index) vertex_index: u32, // Vertex index is the index of the vertex in the geometry. If we draw 6 vertices, vertex indices will be 0, 1, 2, 3, 4, 5.
  @builtin(instance_index) instance_index: u32, // Instance is the index of the geometry we draw. If we draw 6 rectangles, instances will be 0, 1, 2, 3, 4, 5.
  @location(0) position: vec2f, // Position of the vertex in the geometry.
  @location(1) color: vec3f, // Color of the vertex.
};

struct VertexOutput {
  @builtin(position) clip_position: vec4f, // Position of the vertex in the clip space after all transformations are applied.
  @location(0) cell: vec2f, // Cell is the index of the cell in the grid.
  @location(1) color: vec3f, // Color of the vertex.
};

@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> cell_state: array<u32>;

@vertex
fn main(input: VertexInput) -> VertexOutput {
  // Gets the state of the cell from the storage buffer.
  let state = f32(cell_state[input.instance_index]);

  // Instance is the index of the geometry we draw. If we draw 6 objects, instances will be 0, 1, 2, 3, 4, 5.
  let i = f32(input.instance_index);

  /*
    Calculates which cell the instance is in based on the given grid size.
    For example, if instance index is 5, what are its (column, row) coordinates in the grid? This will be (1, 1) for a 4x4 grid.
  */
  let cell = vec2f(i % grid.x, floor(i / grid.x));

  /*
    Calculates how many clip-space units to the right and up from the bottom-left corner (-1, -1) does this cell start.
    It's converting cell index (0, 1, 2, 3...) into actual distance measurements in the coordinate system WebGPU uses (clip space).
    It is multiplied by 2.0 because the grid is 2 units wide and 2 units tall in clip space (from -1 to 1).
    For example, to reach the (3, 3) cell, you apply (1.5, 1.5) offset vector to the bottom-left corner (-1, -1) which gives you (0.5, 0.5) result vector in clip space which is bottom-left corner of the (3, 3) cell.
  */
  let cell_offset = (cell / grid) * 2.0;
  
  /*
    By this point we know which cell the instance is in and how to reach that cell in the grid.
    Now we need to convert the position of the instance to the position of the cell in the grid.
    1. Adding 1 shifts the coordinates system from (-1, -1) to (0, 0). It's easier to do math when things start at 0 instead of -1.
    2. Dividing by grid scales the square to the size of the grid cell.
    3. Adding cell_offset positions the square in the correct cell.
    4. Subtracting 1 converts back to clip space coordinates that WebGPU understands.
  */
  let grid_position  = ((input.position * state + 1.0) / grid) + cell_offset - 1.0;

  return VertexOutput(vec4f(grid_position, 0, 1), cell, input.color);
}
