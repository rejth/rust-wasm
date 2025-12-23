varying vec2 vUv;
varying vec3 vExternalColors;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  // RGB, last component - alpha = transparency
  // GLSL typically deals with colors in the range [0.0, 1.0]
  // GLSL = RGB value / 255.0
  // Gradient from black to white is basically a mix (interpolation) between 0 and 1

  /*
    step(edge, x) -> if x < edge, return 0.0 (black), else - 1.0 (white)
    smoothstep(edge1, edge2, x) -> return a smooth Hermite interpolation between 0 and 1 if x is in range [edge1, edge2]
  */

  // gl_FragColor = vec4(vExternalColors, 1.0);

  // Pattern 1
  gl_FragColor = vec4(vUv, 1.0, 1.0);

  // Pattern 2
  gl_FragColor = vec4(vUv, 0.0, 1.0);

  // Pattern 3
  gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0), vUv.x);

  // Pattern 4
  gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0), vUv.y);

  // Pattern 5
  gl_FragColor = mix(
    vec4(0.0, 0.0, 0.0, 1.0),
    vec4(1.0, 1.0, 1.0, 1.0),
    1.0 - vUv.y
  );

  // Pattern 6
  // gl_FragColor = mix(
  //     vec4(0.0, 0.0, 0.0, 1.0),
  //     vec4(1.0, 1.0, 1.0, 1.0),
  //     vUv.y * 10.0
  // );

  // Pattern 6
  // float strenght = vUv.y * 10.0;
  // gl_FragColor = vec4(vec3(strenght), 1.0);

  // Pattern 7
  // float strenght = mod(vUv.y * 10.0, 1.0);
  // gl_FragColor = vec4(vec3(strenght), 1.0);

  // Pattern 8
  // step(edge, x) -> if x < edge, return 0.0, else - 1.0
  // float strenght2 = mod(vUv.y * 10.0, 1.0);
  // float step = step(0.5, strenght2);
  // gl_FragColor = vec4(vec3(step), 1.0);

  // Pattern 9
  // float strenght3 = mod(vUv.y * 10.0, 1.0);
  // float step1 = step(0.8, strenght3);
  // gl_FragColor = vec4(vec3(step1), 1.0);

  // Pattern 10
  // float strenght3 = mod(vUv.x * 10.0, 1.0);
  // float step1 = step(0.8, strenght3);
  // gl_FragColor = vec4(vec3(step1), 1.0);

  // Pattern 11
  // float strenghtX = mod(vUv.x * 10.0, 1.0);
  // float strenghtY = mod(vUv.y * 10.0, 1.0);
  // float step = step(0.8, strenghtX) + step(0.8, strenghtY);
  // gl_FragColor = vec4(vec3(step), 1.0);

  // !NOTE: like it
  // float strenghtX = mod(vUv.x * 10.0, 1.0);
  // float strenghtY = mod(vUv.y * 10.0, 1.0);
  // float step = step(0.1, strenghtX) - step(0.9, strenghtY);
  // gl_FragColor = vec4(vec3(step), 1.0);

  // Pattern 12
  // float strenghtX = mod(vUv.x * 10.0, 1.0);
  // float strenghtY = mod(vUv.y * 10.0, 1.0);
  // float step = step(0.8, strenghtX) - step(0.2, strenghtY);
  // gl_FragColor = vec4(vec3(step), 1.0);

  // Pattern 13
  // float strenghtX = mod(vUv.x * 10.0, 1.0);
  // float strenghtY = mod(vUv.y * 10.0, 1.0);
  // float step = step(0.5, strenghtX) - step(0.2, strenghtY);
  // gl_FragColor = vec4(vec3(step), 1.0);

  // Pattern 14
  // float barX = step(0.4, mod(vUv.x * 10.0, 1.0)) * step(0.8, mod(vUv.y * 10.0, 1.0));
  // float barY = step(0.4, mod(vUv.y * 10.0, 1.0)) * step(0.8, mod(vUv.x * 10.0, 1.0));
  // gl_FragColor = vec4(vec3(barX + barY), 1.0);

  // Pattern 15
  // float barX = step(0.4, mod(vUv.x * 10.0 - 0.2, 1.0)) * step(0.8, mod(vUv.y * 10.0, 1.0));
  // float barY = step(0.4, mod(vUv.y * 10.0 - 0.2, 1.0)) * step(0.8, mod(vUv.x * 10.0, 1.0));
  // gl_FragColor = vec4(vec3(barX + barY), 1.0);

  // Pattern 16
  // gl_FragColor = vec4(vec3(abs(vUv.x - 0.5)), 1.0);

  // Pattern 17
  // float gridX = step(0.025, fract(vUv.x * 10.0));
  // float gridY = step(0.025, fract(vUv.y * 10.0));
  // vec3 color = vec3(gridX * gridY);

  // gl_FragColor = vec4(color, 1.0);

  // vec3 color = vec3(1.0);

  /*
    Fractional part is the part after the decimal point.
    fract() creates 10 cycles of 0→1 -> repeating effect.
    */
  // vec2 cell = fract(vUv * 10.0);

  /*
    Subtract 0.5 (shift center to origin). Now all edges have the same value: 0.5

    Without mirroring - messy code:
    bool nearEdge = (cell.x < 0.05) || (cell.x > 0.95) || (cell.y < 0.05) || (cell.y > 0.95);
    Need to check both near 0 AND near 1!
    */
  // cell = abs(cell - 0.5);

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
  // float distanceToEdge = 1.0 - 2.0 * max(cell.x, cell.y);

  /*
    If distanceToEdge <= 0.0 → output 0.0 (black)
    If distanceToEdge ≥ 0.05 → output 1.0 (white)
    If 0.0 < distanceToEdge < 0.05 → smooth transition between 0 and 1

    0.05 = 5% of the cell width
    The 0.05 controls the thickness of the border (the width of the border zone)
    This creates a border zone that is 5% deep into the cell from each edge.
    */
  // float cellBorders = smoothstep(0.0, 0.05, distanceToEdge);

  // color = vec3(cellBorders);

  // gl_FragColor = vec4(color, 1.0);

  // Pattern 18
  // vec3 v = vec3(abs(vUv.x - 0.5));
  // vec3 u = vec3(abs(vUv.y - 0.5));
  // gl_FragColor = vec4(vec3(min(v.x, u.y)), 1.0);

  // Pattern 19
  // vec3 v = vec3(abs(vUv.x - 0.5));
  // vec3 u = vec3(abs(vUv.y - 0.5));
  // gl_FragColor = vec4(vec3(max(v.x, u.y)), 1.0);

  // Pattern 20
  // vec2 centered = abs(vUv - 0.5);
  // float distanceToEdge = 2.0 * max(centered.x, centered.y);
  // vec3 color = vec3(step(0.4, distanceToEdge));

  // gl_FragColor = vec4(color, 1.0);

  // Pattern 21
  // vec2 centered = abs(vUv - 0.5);
  // float distanceToEdge = 2.0 * max(centered.x, centered.y);
  // vec3 color = vec3(step(0.8, distanceToEdge));

  // gl_FragColor = vec4(color, 1.0);

  // Pattern 22
  // float strenght = floor(vUv.x * 10.0) / 10.0;
  // gl_FragColor = vec4(vec3(strenght), 1.0);

  // Pattern 23
  // float strenghtX = floor(vUv.x * 10.0) / 10.0;
  // float strenghtY = floor(vUv.y * 10.0) / 10.0;
  // gl_FragColor = vec4(vec3(strenghtX * strenghtY), 1.0);

  // Pattern 24
  // float strength = random(vUv);
  // gl_FragColor = vec4(vec3(strength), 1.0);

  // Pattern 25
  // float strengthX = floor(vUv.x * 10.0) / 10.0;
  // float strengthY = floor(vUv.y * 10.0) / 10.0;
  // vec2 gridUv = vec2(strengthX, strengthY);

  // gl_FragColor = vec4(vec3(random(gridUv)), 1.0);

  // Pattern 25
  // float strengthX = floor(vUv.x * 10.0) / 10.0;
  // float strengthY = floor((vUv.y + vUv.x * 0.5) * 10.0) / 10.0;
  // vec2 gridUv = vec2(strengthX, strengthY);

  // gl_FragColor = vec4(vec3(random(gridUv)), 1.0);

  // Pattern 26
  // float strength = length(vUv);
  // gl_FragColor = vec4(vec3(strength), 1.0);

  // Pattern 27
  // float strength = length(vUv - 0.5);
  // gl_FragColor = vec4(vec3(strength), 1.0);

  // Pattern 28
  // float strength = 1.0 - length(vUv - 0.5);
  // gl_FragColor = vec4(vec3(strength), 1.0);

  // Pattern 29
  float strength = 0.015 / length(vUv - 0.5);
  gl_FragColor = vec4(vec3(strength), 1.0);
}
