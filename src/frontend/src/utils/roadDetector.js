/**
 * Road network detection using morphological opening residual.
 *
 * Core insight: roads are THIN lines, buildings are SOLID blocks.
 * After isolating low-saturation pixels (roads + gray buildings),
 * morphological opening (erode → dilate) removes thin structures.
 * The residual (original − opened) IS the road network — no component
 * classification needed.
 *
 * Pipeline:
 *   1. Saturation computation (0-255)
 *   2. Low-saturation threshold (sat ≤ 40)
 *   3. Morphological opening residual (erode 3× → dilate 3× → subtract)
 *   4. Filter small noise components
 *   5. Morphological close (dilate → erode)
 *   6. Zhang-Suen thinning
 *   7. Junction/endpoint detection
 *   8. Grid-based downsampling
 *   9. Graph extraction (nodes + edges)
 *
 * Output: { nodes: [...], edges: [...], stats: {...} }
 */

// ── Step 1: Compute saturation ──

function computeSaturation(imageData) {
  const { width, height, data } = imageData;
  const sat = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    sat[i] = max === 0 ? 0 : Math.round((1 - min / max) * 255);
  }
  return { sat, width, height };
}

// ── Step 2: Low-saturation threshold ──

function thresholdSaturation(sat, w, h, maxSat) {
  const binary = new Uint8Array(sat.length);
  for (let i = 0; i < sat.length; i++) {
    binary[i] = sat[i] <= maxSat ? 1 : 0;
  }
  return binary;
}

// ── Step 3: Cross-kernel erosion ──

function erodeCross(binary, w, h) {
  const result = new Uint8Array(binary.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      result[i] = (
        binary[i] && binary[(y - 1) * w + x] &&
        binary[(y + 1) * w + x] &&
        binary[y * w + x - 1] &&
        binary[y * w + x + 1]
      ) ? 1 : 0;
    }
  }
  return result;
}

// ── Step 3.5: Cross-kernel dilation ──

function dilateCross(binary, w, h) {
  const result = new Uint8Array(binary.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      result[i] = (
        binary[i] || binary[(y - 1) * w + x] ||
        binary[(y + 1) * w + x] ||
        binary[y * w + x - 1] ||
        binary[y * w + x + 1]
      ) ? 1 : 0;
    }
  }
  return result;
}

// ── Step 4: Extract thin structures via opening residual ──

/**
 * Use morphological opening (erode → dilate) to separate thin from solid.
 * Opening removes thin structures (< 2*numIters pixels wide) while preserving solid blocks.
 * The residual (original - opened) = thin structures = roads.
 */
function extractThinStructures(binary, w, h, numIters) {
  // Opening: erode N times, then dilate N times
  let opened = binary;
  for (let i = 0; i < numIters; i++) opened = erodeCross(opened, w, h);
  for (let i = 0; i < numIters; i++) opened = dilateCross(opened, w, h);

  // Residual: pixels in original but NOT in opened = thin = roads
  const residual = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    residual[i] = binary[i] === 1 && opened[i] === 0 ? 1 : 0;
  }
  return residual;
}

// ── Step 4.5: Morphological close N (fill holes) ──

function morphCloseN(binary, w, h, iterations) {
  let result = new Uint8Array(binary);
  for (let i = 0; i < iterations; i++) result = dilateCross(result, w, h);
  for (let i = 0; i < iterations; i++) result = erodeCross(result, w, h);
  return result;
}

// ── Step 5: Morphological close (dilate → erode) ──

function morphClose(binary, w, h) {
  const dilated = new Uint8Array(binary.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      dilated[i] = (
        binary[i] || binary[(y - 1) * w + x] ||
        binary[(y + 1) * w + x] ||
        binary[y * w + x - 1] ||
        binary[y * w + x + 1]
      ) ? 1 : 0;
    }
  }

  const closed = new Uint8Array(dilated.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      closed[i] = (
        dilated[i] && dilated[(y - 1) * w + x] &&
        dilated[(y + 1) * w + x] &&
        dilated[y * w + x - 1] &&
        dilated[y * w + x + 1]
      ) ? 1 : 0;
    }
  }

  return closed;
}

// ── Step 4.5: Filter small noise components ──

function filterSmallComponents(binary, w, h, minSize) {
  const visited = new Uint8Array(binary.length);
  const result = new Uint8Array(binary.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (binary[i] === 0 || visited[i]) continue;

      const pixels = [];
      const queue = [i];
      visited[i] = 1;

      while (queue.length) {
        const cur = queue.shift();
        pixels.push(cur);
        const cx = cur % w;
        const cy = (cur / w) | 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const ni = ny * w + nx;
            if (binary[ni] && !visited[ni]) {
              visited[ni] = 1;
              queue.push(ni);
            }
          }
        }
      }

      if (pixels.length >= minSize) {
        for (const p of pixels) result[p] = 1;
      }
    }
  }

  return result;
}

// ── Step 6: Zhang-Suen thinning ──

function zhangSuen(binary, w, h) {
  const skel = new Uint8Array(binary);
  const idx = (x, y) => y * w + x;
  let changed = true;
  let safety = 2000;

  while (changed && safety-- > 0) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      const toRemove = [];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const p = idx(x, y);
          if (skel[p] === 0) continue;

          const n  = skel[idx(x,     y - 1)];
          const ne = skel[idx(x + 1, y - 1)];
          const e  = skel[idx(x + 1, y)];
          const se = skel[idx(x + 1, y + 1)];
          const s  = skel[idx(x,     y + 1)];
          const sw = skel[idx(x - 1, y + 1)];
          const w8 = skel[idx(x - 1, y)];
          const nw = skel[idx(x - 1, y - 1)];

          const neighbors = [n, ne, e, se, s, sw, w8, nw];
          const neighborCount = neighbors.reduce((a, b) => a + b, 0);
          if (neighborCount < 2 || neighborCount > 6) continue;

          let transitions = 0;
          for (let i = 0; i < 8; i++) {
            if (neighbors[i] === 0 && neighbors[(i + 1) % 8] === 1) transitions++;
          }
          if (transitions !== 1) continue;

          const nProduct  = n * s * (pass === 0 ? e : w8);
          const sProduct = e * w8 * (pass === 0 ? s : n);
          if (nProduct === 0 && sProduct === 0) {
            toRemove.push(p);
          }
        }
      }
      for (const p of toRemove) { skel[p] = 0; changed = true; }
    }
  }
  return skel;
}

// ── Step 7: Detect junctions and endpoints ──

function detectJunctions(skel, w, h) {
  const idx = (x, y) => y * w + x;
  const junctions = new Set();
  const endpoints = new Set();

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = idx(x, y);
      if (skel[p] === 0) continue;
      const n = [
        skel[idx(x, y - 1)], skel[idx(x + 1, y - 1)],
        skel[idx(x + 1, y)], skel[idx(x + 1, y + 1)],
        skel[idx(x, y + 1)], skel[idx(x - 1, y + 1)],
        skel[idx(x - 1, y)], skel[idx(x - 1, y - 1)],
      ];
      const count = n.reduce((a, b) => a + b, 0);
      if (count === 1) endpoints.add(p);
      else if (count > 2) junctions.add(p);
    }
  }
  return { junctions, endpoints };
}

// ── Step 7.5: Grid-based downsampling ──

function gridDownsample(points, cellSize, w, h) {
  if (points.size === 0) return new Set();
  const grid = new Map();
  for (const p of points) {
    const x = p % w;
    const y = (p / w) | 0;
    const cx = (x / cellSize) | 0;
    const cy = (y / cellSize) | 0;
    const key = `${cx},${cy}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push({ x, y });
  }
  const result = new Set();
  for (const pts of grid.values()) {
    if (pts.length === 0) continue;
    const cx = Math.round(pts.reduce((s, pt) => s + pt.x, 0) / pts.length);
    const cy = Math.round(pts.reduce((s, pt) => s + pt.y, 0) / pts.length);
    result.add(cy * w + cx);
  }
  return result;
}

// ── Step 8: Trace a single skeleton path ──

function traceSkeletonPath(skel, w, h, start, junctions, endpoints) {
  const allPoints = new Set([...junctions, ...endpoints]);
  const visited = new Set([start]);
  const path = [start];
  const queue = [start];

  while (queue.length > 0) {
    const cur = queue.shift();
    const cx = cur % w;
    const cy = (cur / w) | 0;
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const ni = ny * w + nx;
      if (visited.has(ni) || skel[ni] === 0) continue;
      visited.add(ni);
      path.push(ni);
      if (allPoints.has(ni)) continue;
      queue.push(ni);
    }
  }
  return path;
}

// ── Step 9: Extract graph ──

function extractGraph(skel, w, h, junctions, endpoints) {
  const allPoints = new Set([...junctions, ...endpoints]);
  const pixelToId = new Map();
  const edgesOut = [];
  const visitedEdge = new Set();

  const getNodeId = (pixel) => {
    if (!pixelToId.has(pixel)) pixelToId.set(pixel, `n_auto_${pixelToId.size + 1}`);
    return pixelToId.get(pixel);
  };

  for (const start of allPoints) {
    const sx = start % w;
    const sy = (start / w) | 0;
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dy] of dirs) {
      const nx = sx + dx;
      const ny = sy + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const ni = ny * w + nx;
      if (skel[ni] === 0) continue;
      const path = traceSkeletonPath(skel, w, h, ni, junctions, endpoints);
      const last = path[path.length - 1];
      if (allPoints.has(last)) {
        const key = Math.min(start, last) + ':' + Math.max(start, last);
        if (!visitedEdge.has(key)) {
          visitedEdge.add(key);
          getNodeId(start);
          getNodeId(last);
          edgesOut.push({ from: start, to: last });
        }
      }
    }
  }

  const nodes = [];
  let counter = 0;
  for (const [pixel, id] of pixelToId) {
    counter++;
    const x = pixel % w;
    const y = (pixel / w) | 0;
    const isEndpoint = endpoints.has(pixel);
    const isJunction = junctions.has(pixel);
    nodes.push({
      id, name: `节点 ${counter}`,
      type: isEndpoint ? 'entrance' : 'road',
      x, y, routingOnly: !(isEndpoint || isJunction),
    });
  }

  const edges = edgesOut.map((e) => ({
    from: pixelToId.get(e.from), to: pixelToId.get(e.to),
    type: 'walkway', bidirectional: true,
  }));

  return { nodes, edges };
}

// ── Debug: binary to data URL ──

function binaryToDataUrl(binary, w, h) {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(w, h);
  for (let i = 0; i < binary.length; i++) {
    const v = binary[i] * 255;
    const offset = i * 4;
    imageData.data[offset] = v;
    imageData.data[offset + 1] = v;
    imageData.data[offset + 2] = v;
    imageData.data[offset + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

// ── Public API ──

/**
 * Detect road network by sampling a seed color from user click.
 * Finds all pixels within colorTolerance of the seed color, then
 * runs the standard pipeline (component filter → morphClose → Zhang-Suen → graph).
 *
 * @param {ImageData} imageData
 * @param {Object} seedColor - { r, g, b } from user click
 * @param {Object} [options]
 * @param {number} [options.colorTolerance=40] - Per-channel color match tolerance (0-255)
 * @param {number} [options.minComponentSize=60] - Min noise component size (px, higher to filter text)
 * @param {number} [options.fillSize=7] - Morphological close iterations to fill text holes
 * @param {number} [options.gridSize=36] - Grid downsample cell size
 * @param {number} [options.endpointGrid=44] - Endpoint grid cell size
 * @param {boolean} [options.debug=false] - Include binary debug images
 * @returns {{ nodes: Array, edges: Array, stats: Object, error?: string }}
 */
export function detectRoadsByColor(imageData, seedColor, options = {}) {
  if (!imageData || !imageData.width || !imageData.height || !imageData.data) {
    return { nodes: [], edges: [], stats: { duration: 0 }, error: '无效的图片数据' };
  }
  if (!seedColor || seedColor.r === undefined || seedColor.g === undefined || seedColor.b === undefined) {
    return { nodes: [], edges: [], stats: { duration: 0 }, error: '请先点击道路选取颜色' };
  }

  const {
    colorTolerance = 40,
    minComponentSize = 60,
    fillSize = 7,
    gridSize = 36,
    endpointGrid = 44,
    debug = false,
  } = options;

  const startTime = performance.now();
  const { width, height, data } = imageData;

  // Step 1: Color distance mask
  const { r: sr, g: sg, b: sb } = seedColor;
  const binary = new Uint8Array(width * height);
  let rawPixels = 0;

  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    const dr = Math.abs(data[offset] - sr);
    const dg = Math.abs(data[offset + 1] - sg);
    const db = Math.abs(data[offset + 2] - sb);
    if (dr <= colorTolerance && dg <= colorTolerance && db <= colorTolerance) {
      binary[i] = 1;
      rawPixels++;
    }
  }

  const binaryBeforeUrl = debug ? binaryToDataUrl(binary, width, height) : '';

  if (rawPixels < 100) {
    return {
      nodes: [], edges: [],
      stats: { duration: 0, seedColor, colorTolerance },
      error: '未找到与所选颜色匹配的像素，请尝试增大容忍度',
    };
  }

  // Step 2: Fill text-sized holes via morphological close
  let roadMask = morphCloseN(binary, width, height, fillSize);

  // Step 3: Filter small noise components
  roadMask = filterSmallComponents(roadMask, width, height, minComponentSize);
  const filteredPixels = roadMask.reduce((a, b) => a + b, 0);
  const binaryAfterUrl = debug ? binaryToDataUrl(roadMask, width, height) : '';

  if (filteredPixels < 30) {
    return {
      nodes: [], edges: [],
      stats: { duration: 0, seedColor, rawPixels, filteredPixels },
      error: '过滤噪声后道路像素太少',
    };
  }

  // Step 4: Morphological close
  roadMask = morphClose(roadMask, width, height);

  // Step 5: Zhang-Suen thinning
  const skeleton = zhangSuen(roadMask, width, height);
  const skeletonUrl = debug ? binaryToDataUrl(skeleton, width, height) : '';

  // Step 6: Detect junctions and endpoints
  const { junctions, endpoints } = detectJunctions(skeleton, width, height);

  if (junctions.size + endpoints.size < 2) {
    return {
      nodes: [], edges: [],
      stats: { duration: 0, rawPixels, filteredPixels },
      error: '检测到的道路节点太少',
    };
  }

  // Step 6.5: Grid-based downsampling
  const downsampledJunctions = gridDownsample(junctions, gridSize, width, height);
  const downsampledEndpoints = gridDownsample(endpoints, endpointGrid, width, height);

  // Step 7: Extract graph
  const { nodes, edges } = extractGraph(skeleton, width, height, downsampledJunctions, downsampledEndpoints);

  const duration = Math.round(performance.now() - startTime);

  return {
    nodes, edges,
    binaryBeforeUrl,
    binaryAfterUrl,
    skeletonUrl,
    stats: {
      duration,
      colorTolerance,
      fillSize,
      seedColor,
      nodesCount: nodes.length,
      edgesCount: edges.length,
      rawPixels,
      filteredPixels,
    },
  };
}

/**
 * Detect road network using morphological opening residual.
 *
 * @param {ImageData} imageData
 * @param {Object} [options]
 * @param {number} [options.satThreshold=40] - Max saturation for candidate pixels
 * @param {number} [options.numErosions=3] - Times to erode/dilate for opening residual
 * @param {number} [options.minComponentSize=30] - Min noise component size (px)
 * @param {number} [options.gridSize=36] - Grid downsample cell size
 * @param {number} [options.endpointGrid=44] - Endpoint grid cell size
 * @param {boolean} [options.debug=false] - Include binary debug images
 * @param {Object} [options.seedColor] - If provided, route to color-based detection
 * @returns {{ nodes: Array, edges: Array, stats: Object, error?: string }}
 */
export function detectRoads(imageData, options = {}) {
  if (!imageData || !imageData.width || !imageData.height || !imageData.data) {
    return { nodes: [], edges: [], stats: { duration: 0 }, error: '无效的图片数据' };
  }
  if (imageData.width < 50 || imageData.height < 50) {
    return { nodes: [], edges: [], stats: { duration: 0 }, error: '图片尺寸太小，无法识别' };
  }

  // Route to color-based detection if seed color is provided
  if (options.seedColor) {
    return detectRoadsByColor(imageData, options.seedColor, options);
  }

  const {
    satThreshold = 40,
    numErosions = 3,
    minComponentSize = 30,
    gridSize = 36,
    endpointGrid = 44,
    debug = false,
  } = options;

  const startTime = performance.now();
  const { width, height } = imageData;

  // Step 1: Compute saturation
  const { sat } = computeSaturation(imageData);

  // Step 2: Low-saturation threshold
  const rawBinary = thresholdSaturation(sat, width, height, satThreshold);
  const rawPixels = rawBinary.reduce((a, b) => a + b, 0);
  const binaryBeforeUrl = debug ? binaryToDataUrl(rawBinary, width, height) : '';

  if (rawPixels < 100) {
    return {
      nodes: [], edges: [],
      stats: { duration: 0, satThreshold },
      error: '未检测到低饱和度区域（道路），请检查图片',
    };
  }

  // Step 3: Extract thin structures (roads) via opening residual
  let binary = extractThinStructures(rawBinary, width, height, numErosions);

  const thinPixels = binary.reduce((a, b) => a + b, 0);

  if (thinPixels < 50) {
    return {
      nodes: [], edges: [],
      stats: { duration: 0, satThreshold, thinPixels },
      error: '未检测到细长的道路结构，请尝试减小饱和度阈值',
    };
  }

  // Step 4: Filter small noise components
  binary = filterSmallComponents(binary, width, height, minComponentSize);

  const filteredPixels = binary.reduce((a, b) => a + b, 0);
  const binaryAfterUrl = debug ? binaryToDataUrl(binary, width, height) : '';

  if (filteredPixels < 50) {
    return {
      nodes: [], edges: [],
      stats: { duration: 0, thinPixels, filteredPixels },
      error: '过滤噪声后道路像素太少',
    };
  }

  // Step 5: Morphological close (connect nearby road segments)
  binary = morphClose(binary, width, height);

  // Step 6: Zhang-Suen thinning
  const skeleton = zhangSuen(binary, width, height);
  const skeletonUrl = debug ? binaryToDataUrl(skeleton, width, height) : '';

  // Step 7: Detect junctions and endpoints
  const { junctions, endpoints } = detectJunctions(skeleton, width, height);

  if (junctions.size + endpoints.size < 2) {
    return {
      nodes: [], edges: [],
      stats: { duration: 0, thinPixels, filteredPixels },
      error: '检测到的道路节点太少',
    };
  }

  // Step 7.5: Grid-based downsampling
  const downsampledJunctions = gridDownsample(junctions, gridSize, width, height);
  const downsampledEndpoints = gridDownsample(endpoints, endpointGrid, width, height);

  // Step 8-9: Extract graph
  const { nodes, edges } = extractGraph(skeleton, width, height, downsampledJunctions, downsampledEndpoints);

  const duration = Math.round(performance.now() - startTime);

  return {
    nodes, edges,
    binaryBeforeUrl,
    binaryAfterUrl,
    skeletonUrl,
    stats: {
      duration,
      satThreshold,
      nodesCount: nodes.length,
      edgesCount: edges.length,
      rawPixels,
      thinPixels,
      filteredPixels,
    },
  };
}
