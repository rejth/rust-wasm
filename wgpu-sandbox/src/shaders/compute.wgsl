/*
  Compute shader is responsible for updating the game state.
  Compute shaders are designed to run with extreme parallelism on the GPU.
  This means that instead of executing once for each vertex, or pixel, we have to tell it how many invocations of the shader function we want to run.
  Because compute shaders don't have a required output, like a vertex position or fragment color, writing values to a storage buffer or texture is the only way to get results out of a compute shader.
*/

struct ComputeInput {
  /*
    We pass in the "global_invocation_id" builtin, which is a three-dimensional vector of unsigned integers that tells where in the grid of shader invocations we are. 
    We run this compute shader once for each cell in our grid. We get numbers vectors (0, 0, 0), (1, 0, 0), (1, 1, 0)... all the way to (31, 31, 0), which means that we can treat it as the cell index we're going to operate on.
   */
  @builtin(global_invocation_id) cell: vec3u
};

@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> cell_state_in: array<u32>; // Read-only storage buffer that feeds in the current state of the grid
@group(0) @binding(2) var<storage, read_write> cell_state_out: array<u32>; // Read-write storage buffer that we write out the new state of the grid to

fn get_cell_index(cell: vec2u) -> u32 {
  /*
    Calculates the index of the cell in the grid.
    For example, if cell is (1, 1), and grid is (4, 4), the index is 5.
  */
  return (cell.y % u32(grid.y)) * u32(grid.x) + (cell.x % u32(grid.x));
}

fn is_cell_active(x: u32, y: u32) -> u32 {
  /*
    Checks if the cell is active.
    For example, if cell is (1, 1), and grid is (4, 4), the index is 5.
    Then, cell_state_in[5] is the state of the cell at (1, 1).
    If cell_state_in[5] is 1, the cell is active, otherwise it is inactive and returns 0.
  */
  return cell_state_in[get_cell_index(vec2(x, y))];
}

/*
  Compute shader is called once for each workgroup of the grid.
  A workgroup has an X, Y, and Z size, and although the sizes can be 1 each, there are often performance benefits to making your workgroups a bit bigger.

  Compute shader invocations within a single workgroup are allowed to share faster memory and use certain types of synchronization primitives. 
  We don't need any of that now, since our compute shader executions are fully independent.

  We could make the workgroup size (1 x 1 x 1), and it would still work correctly, but that also restricts how well the GPU can run the shader in parallel. 
  Picking something bigger helps the GPU divide the work better.

  There is a theoretical ideal workgroup size for every GPU, but it's dependent on architectural details that WebGPU doesn't expose, so usually you want to pick a number driven by the requirements of the shader. 
  Lacking that, given the wide range of hardware that WebGPU content may run on, 64 is a good number that's unlikely to exceed any hardware limits but still handles large enough batches to be reasonably efficient. 
  (8 x 8 == 64, so our workgroup size follows this advice.)
 */
const WORKGROUP_SIZE: u32 = 8;

@compute
@workgroup_size(WORKGROUP_SIZE, WORKGROUP_SIZE)
fn main(input: ComputeInput) {
  /*
    Determine how many active neighbors this cell has
  */
  let active_neighbors = is_cell_active(input.cell.x + 1, input.cell.y + 1) +
    is_cell_active(input.cell.x + 1, input.cell.y) +
    is_cell_active(input.cell.x + 1, input.cell.y - 1) +
    is_cell_active(input.cell.x, input.cell.y - 1) +
    is_cell_active(input.cell.x - 1, input.cell.y - 1) +
    is_cell_active(input.cell.x - 1, input.cell.y) +
    is_cell_active(input.cell.x - 1, input.cell.y + 1) +
    is_cell_active(input.cell.x, input.cell.y + 1);

  let i = get_cell_index(input.cell.xy);

  // Conway's game of life rules:
  switch (active_neighbors) {
    case 2: { // Active cells with 2 neighbors stay active
      cell_state_out[i] = cell_state_in[i];
    }
    case 3: { // Cells with 3 neighbors become or stay active
      cell_state_out[i] = 1;
    }
    default: { // Cells with < 2 or > 3 neighbors become inactive
      cell_state_out[i] = 0;
    }
  }
}