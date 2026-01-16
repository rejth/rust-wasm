#version 300 es

// Fragment shaders don't have a default precision so we need to pick one. 
// "highp" is a good default. It means "high precision"
precision highp float;

// Texture coordinates
in vec2 v_uv;

// Output for the fragment shader
out vec4 outColor;

void main() {
  vec3 color = vec3(1.0);

  /*
    Fractional part is the part after the decimal point.
    fract() creates 10 cycles of 0→1 -> repeating effect.
  */
  vec2 cell = fract(v_uv * 10.0);

  /*
    Subtract 0.5 (shift center to origin). Now all edges have the same value: 0.5

    Without mirroring - messy code:
    bool nearEdge = (cell.x < 0.05) || (cell.x > 0.95) || (cell.y < 0.05) || (cell.y > 0.95);
    Need to check both near 0 AND near 1!
  */
  cell = abs(cell - 0.5);

  /*
    Step 1.
    For now, the maximum distance from center to edge is 0.5 (because we subtracted 0.5 from the cell coordinates at the previous step).
    Distance to any edge = 0.5 - max(cell.x, cell.y). Max is used to check "how close to ANY edge?" and choose the maximum distance.
    So: Distance TO edge = Maximum possible distance - Current distance from center

    Step 2.
    2 x ... - This scales the 0→0.5 range to 0→1 because without it, the maximum brightness is only 0.5 (50% gray), never reaches 1.0 (white)

    Step 3.
    1 - ... - This is about what color we want where. 
    This inverts it (flips it upside down). Without the 1.0 - ... inversion, edges would be white and center black - the opposite of what we want.
  */
  float distanceToEdge = 1.0 - 2.0 * max(cell.x, cell.y);

  /*
    If distanceToEdge <= 0.0 → output 0.0 (black)
    If distanceToEdge ≥ 0.05 → output 1.0 (white)
    If 0.0 < distanceToEdge < 0.05 → smooth transition between 0 and 1

    0.05 = 5% of the cell width
    The 0.05 controls the thickness of the border (the width of the border zone)
    This creates a border zone that is 5% deep into the cell from each edge.
  */
  float cellBorders = smoothstep(0.0, 0.05, distanceToEdge);

  color = vec3(cellBorders);

  outColor = vec4(color, 1.0);

  // float strenghtX = floor(v_uv.x * 10.0) / 10.0;
  // float strenghtY = floor(v_uv.y * 10.0) / 10.0;
  // outColor = vec4(vec3(strenghtX * strenghtY), 1.0);

  // float strenght = floor(v_uv.x * 10.0) / 10.0;
  // outColor = vec4(vec3(strenght), 1.0);

  // vec2 centered = abs(v_uv - 0.5);
  // float distanceToEdge = 2.0 * max(centered.x, centered.y);
  // outColor = vec4(vec3(step(0.8, distanceToEdge)), 1.0);

  // float gridX = step(0.025, fract(v_uv.x * 10.0));
  // float gridY = step(0.025, fract(v_uv.y * 10.0));
  // vec3 color = vec3(gridX * gridY);
  // outColor = vec4(color, 1.0);
}