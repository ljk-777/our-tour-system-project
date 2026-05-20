/**
 * Building detection from campus map images using edge-based structural analysis.
 *
 * Auto mode (detectBuildings):
 *   1. Luminance → gradient (|dx| + |dy|) → edge threshold
 *   2. Morphological dilation (3×3 square) to close gaps
 *   3. Multi-source border flood-fill → foreground = buildings
 *   4. Connected-component labeling
 *   5. Filter by area, aspect ratio; remove courtyard holes
 *   6. Assign IDs, connect each centroid to nearest road node
 *
 * Color-seeded mode (detectBuildingsByColor):
 *   1. Per-channel color distance mask
 *   2. Connected-component labeling on color mask
 *   3. Same filtering + road connection (no courtyard removal)
 */

// ──────────────────────────────────────────
//  Step helpers
// ──────────────────────────────────────────

/**
 * Compute luminance (0–255) for every pixel.
 * Uses Rec. 601 luma: Y = 0.299R + 0.587G + 0.114B
 */
function computeLuminance(data, w, h) {
  const lum = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    lum[i] = (0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]) | 0;
  }
  return lum;
}

/**
 * Simple gradient: |dx| + |dy| using central differences.
 * Pixels on image borders stay 0.
 */
function computeGradient(lum, w, h) {
  const grad = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const dx = Math.abs(lum[i + 1] - lum[i - 1]);
      const dy = Math.abs(lum[(y + 1) * w + x] - lum[(y - 1) * w + x]);
      grad[i] = Math.min(255, dx + dy);
    }
  }
  return grad;
}

/**
 * Threshold gradient image → binary edge map.
 * 1 = edge, 0 = flat.
 */
function thresholdEdges(grad, w, h, threshold) {
  const edges = new Uint8Array(grad.length);
  for (let i = 0; i < grad.length; i++) {
    edges[i] = grad[i] > threshold ? 1 : 0;
  }
  return edges;
}

/**
 * Morphological dilation with a 3×3 square kernel.
 */
function dilateSquare(binary, w, h) {
  const r = new Uint8Array(binary.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      r[i] = (
        binary[i] ||
        binary[(y - 1) * w + x - 1] || binary[(y - 1) * w + x] || binary[(y - 1) * w + x + 1] ||
        binary[y * w + x - 1] ||                          binary[y * w + x + 1] ||
        binary[(y + 1) * w + x - 1] || binary[(y + 1) * w + x] || binary[(y + 1) * w + x + 1]
      ) ? 1 : 0;
    }
  }
  return r;
}

/**
 * Morphological erosion with a 3×3 square kernel.
 */
function erodeSquare(binary, w, h) {
  const result = new Uint8Array(binary.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (binary[i] === 0) continue;
      let keep = 1;
      for (let dy = -1; dy <= 1 && keep; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) { keep = 0; break; }
          if (binary[ny * w + nx] === 0) { keep = 0; break; }
        }
      }
      if (keep) result[i] = 1;
    }
  }
  return result;
}

/**
 * Multi-source BFS flood-fill from all 4 image borders.
 *
 * terrain encoding (IN-PLACE mutation):
 *   0 = passable (candidate foreground)
 *   1 = wall (edge pixel)
 *   2 = background (visited from border)
 *
 * Returns `foreground` – a fresh Uint8Array where 1 = building, 0 = non-building.
 */
function floodFillBackground(terrain, w, h) {
  const total = w * h;
  const maxQ = total * 2;
  const queue = new Uint32Array(maxQ);
  let head = 0;
  let tail = 0;

  // Enqueue top and bottom borders
  for (let x = 0; x < w && tail < maxQ; x++) {
    for (const y of [0, h - 1]) {
      const i = y * w + x;
      if (terrain[i] === 0) {
        terrain[i] = 2;
        queue[tail++] = i;
      }
    }
  }
  // Enqueue left and right borders (skip corners already done)
  for (let y = 1; y < h - 1 && tail < maxQ; y++) {
    for (const x of [0, w - 1]) {
      const i = y * w + x;
      if (terrain[i] === 0) {
        terrain[i] = 2;
        queue[tail++] = i;
      }
    }
  }

  // 4-directional BFS
  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % w;
    const cy = (cur / w) | 0;

    // West
    if (cx > 0) {
      const ni = cy * w + cx - 1;
      if (terrain[ni] === 0) { terrain[ni] = 2; queue[tail++] = ni; }
    }
    // East
    if (cx < w - 1) {
      const ni = cy * w + cx + 1;
      if (terrain[ni] === 0) { terrain[ni] = 2; queue[tail++] = ni; }
    }
    // North
    if (cy > 0) {
      const ni = (cy - 1) * w + cx;
      if (terrain[ni] === 0) { terrain[ni] = 2; queue[tail++] = ni; }
    }
    // South
    if (cy < h - 1) {
      const ni = (cy + 1) * w + cx;
      if (terrain[ni] === 0) { terrain[ni] = 2; queue[tail++] = ni; }
    }
  }

  // Foreground = unvisited passable pixels (still 0)
  const fg = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    fg[i] = terrain[i] === 0 ? 1 : 0;
  }
  return fg;
}

/**
 * Connected-component labeling via BFS on a binary mask.
 * Returns array of { area, centroidX, centroidY, minX, maxX, minY, maxY }
 * Only includes components with area >= minArea.
 */
function labelComponents(binary, w, h, minArea) {
  const total = w * h;
  const visited = new Uint8Array(total);
  const components = [];
  const queue = new Uint32Array(total);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (binary[i] === 0 || visited[i]) continue;

      // Start BFS for this component
      let head = 0;
      let tail = 0;
      queue[tail++] = i;
      visited[i] = 1;

      let sumX = 0;
      let sumY = 0;
      let area = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      while (head < tail) {
        const cur = queue[head++];
        const cx = cur % w;
        const cy = (cur / w) | 0;

        sumX += cx;
        sumY += cy;
        area++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // West
        if (cx > 0) {
          const ni = cy * w + cx - 1;
          if (binary[ni] && !visited[ni]) { visited[ni] = 1; queue[tail++] = ni; }
        }
        // East
        if (cx < w - 1) {
          const ni = cy * w + cx + 1;
          if (binary[ni] && !visited[ni]) { visited[ni] = 1; queue[tail++] = ni; }
        }
        // North
        if (cy > 0) {
          const ni = (cy - 1) * w + cx;
          if (binary[ni] && !visited[ni]) { visited[ni] = 1; queue[tail++] = ni; }
        }
        // South
        if (cy < h - 1) {
          const ni = (cy + 1) * w + cx;
          if (binary[ni] && !visited[ni]) { visited[ni] = 1; queue[tail++] = ni; }
        }
      }

      if (area >= minArea) {
        components.push({
          area,
          centroidX: sumX / area,
          centroidY: sumY / area,
          minX, maxX, minY, maxY,
        });
      }
    }
  }

  return components;
}

// ──────────────────────────────────────────
//  Debug helper
// ──────────────────────────────────────────

function binaryToDataUrl(binary, w, h) {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(w, h);
  const d = imageData.data;
  for (let i = 0; i < binary.length; i++) {
    const v = binary[i] * 255;
    const o = i * 4;
    d[o] = v;
    d[o + 1] = v;
    d[o + 2] = v;
    d[o + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

// ──────────────────────────────────────────
//  Public API
// ──────────────────────────────────────────

/**
 * Detect buildings using edge-based structural analysis.
 *
 * Pipeline: luminance → gradient → threshold → dilate →
 *           border flood-fill → component labeling → filter → connect roads
 *
 * @param {ImageData} imageData
 * @param {Array<{id:string, x:number, y:number}>} roadNodes
 * @param {Object} [options]
 * @param {number}  [options.edgeThreshold=30]      - Gradient magnitude threshold for edge detection
 * @param {number}  [options.dilateIterations=2]     - How many times to dilate edges
 * @param {number}  [options.minBuildingArea=200]    - Minimum pixels for a building component
 * @param {number}  [options.maxBuildingAreaRatio=0.05] - Max building as fraction of total pixels
 * @param {number}  [options.maxAspectRatio=10]      - Max width/height or height/width ratio
 * @param {number}  [options.maxConnectDist=300]     - Max Euclidean pixels to nearest road node
 * @param {boolean} [options.debug=false]            - Include binary debug image URLs
 * @returns {{ buildingNodes:Array, connectionEdges:Array, stats:Object, error?:string }}
 */
export function detectBuildings(imageData, roadNodes, options = {}) {
  // ── Guard clauses ──
  if (!imageData || !imageData.width || !imageData.height || !imageData.data) {
    return {
      buildingNodes: [],
      connectionEdges: [],
      stats: { duration: 0 },
      error: '无效的图片数据',
    };
  }
  if (imageData.width < 100 || imageData.height < 100) {
    return {
      buildingNodes: [],
      connectionEdges: [],
      stats: { duration: 0 },
      error: '图片尺寸过小',
    };
  }

  const {
    edgeThreshold = 30,
    dilateIterations = 2,
    fillSize = 7,
    minBuildingArea = 200,
    maxBuildingAreaRatio = 0.05,
    maxAspectRatio = 10,
    maxConnectDist = 300,
    debug = false,
  } = options;

  const startTime = performance.now();
  const { width: w, height: h, data } = imageData;
  const totalPx = w * h;
  const maxBuildingArea = Math.floor(totalPx * maxBuildingAreaRatio);

  // Step 1 — Luminance
  const lum = computeLuminance(data, w, h);

  // Step 2 — Gradient
  const grad = computeGradient(lum, w, h);

  // Step 3 — Edge threshold
  const edges = thresholdEdges(grad, w, h, edgeThreshold);
  const edgeBeforeUrl = debug ? binaryToDataUrl(edges, w, h) : '';

  // Step 4 — Dilate edges to close small gaps
  let mask = edges;
  for (let i = 0; i < dilateIterations; i++) {
    mask = dilateSquare(mask, w, h);
  }

  // Step 4.5 — Morphological close to fill text-sized gaps
  if (fillSize > 0) {
    for (let i = 0; i < fillSize; i++) mask = dilateSquare(mask, w, h);
    for (let i = 0; i < fillSize; i++) mask = erodeSquare(mask, w, h);
  }

  const edgeAfterUrl = debug ? binaryToDataUrl(mask, w, h) : '';

  // Step 5 — Multi-source BFS flood-fill from borders
  //   terrain: 0 = passable, 1 = wall (edge), 2 = background
  const terrain = new Uint8Array(mask);
  const foreground = floodFillBackground(terrain, w, h);
  const fgUrl = debug ? binaryToDataUrl(foreground, w, h) : '';

  const fgPixels = foreground.reduce((a, b) => a + b, 0);
  if (fgPixels === 0) {
    return {
      buildingNodes: [],
      connectionEdges: [],
      stats: { duration: Math.round(performance.now() - startTime), edgeThreshold, fillSize },
      error: '边缘检测后未找到前景区域，请尝试降低 edgeThreshold',
    };
  }

  // Step 6 — Connected-component labeling
  let components = labelComponents(foreground, w, h, minBuildingArea);

  if (components.length === 0) {
    return {
      buildingNodes: [],
      connectionEdges: [],
      stats: {
        duration: Math.round(performance.now() - startTime),
        edgeThreshold, fillSize, minBuildingArea, fgPixels,
      },
      error: '未找到符合最小面积要求的建筑区域',
    };
  }

  // Step 7 — Filter by area & aspect ratio
  components = components.filter((comp) => {
    if (comp.area < minBuildingArea || comp.area > maxBuildingArea) return false;
    const cw = comp.maxX - comp.minX + 1;
    const ch = comp.maxY - comp.minY + 1;
    const ratio = Math.max(cw, ch) / Math.min(cw, ch);
    return ratio <= maxAspectRatio;
  });

  // Courtyard removal: if component A is fully inside component B's bbox
  // (≥10 px margin on all 4 sides, AND area < B/3), skip A.
  const keep = new Array(components.length).fill(true);
  for (let i = 0; i < components.length; i++) {
    if (!keep[i]) continue;
    const a = components[i];
    for (let j = 0; j < components.length; j++) {
      if (i === j || !keep[j]) continue;
      const b = components[j];
      if (
        a.minX >= b.minX + 10 &&
        a.maxX <= b.maxX - 10 &&
        a.minY >= b.minY + 10 &&
        a.maxY <= b.maxY - 10 &&
        a.area < b.area / 3
      ) {
        keep[i] = false;
        break;
      }
    }
  }
  components = components.filter((_, i) => keep[i]);

  if (components.length === 0) {
    return {
      buildingNodes: [],
      connectionEdges: [],
      stats: {
        duration: Math.round(performance.now() - startTime),
        edgeThreshold, fillSize, minBuildingArea,
      },
      error: '过滤后未找到有效建筑区域',
    };
  }

  // Step 8 — Sort by area descending, assign IDs
  components.sort((a, b) => b.area - a.area);

  const buildingNodes = components.map((comp, idx) => ({
    id: `b-${idx}`,
    name: null,
    type: 'building',
    x: Math.round(comp.centroidX),
    y: Math.round(comp.centroidY),
    routingOnly: false,
    bbox: {
      x: comp.minX,
      y: comp.minY,
      w: comp.maxX - comp.minX + 1,
      h: comp.maxY - comp.minY + 1,
    },
  }));

  // Step 9 — Connect each building to nearest road node
  const roadList = Array.isArray(roadNodes) ? roadNodes : [];
  const maxDistSq = maxConnectDist * maxConnectDist;
  const connectionEdges = [];

  for (const bNode of buildingNodes) {
    let bestDistSq = maxDistSq;
    let bestNodeId = null;

    for (const rNode of roadList) {
      const dx = bNode.x - (rNode.x || 0);
      const dy = bNode.y - (rNode.y || 0);
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestNodeId = rNode.id;
      }
    }

    if (bestNodeId) {
      connectionEdges.push({
        from: bNode.id,
        to: bestNodeId,
        type: 'walkway',
        bidirectional: true,
      });
    }
  }

  const duration = Math.round(performance.now() - startTime);

  return {
    buildingNodes,
    connectionEdges,
    ...(debug ? { debugUrls: { edgeBeforeUrl, edgeAfterUrl, fgUrl } } : {}),
    stats: {
      duration,
      buildingCount: buildingNodes.length,
      connectedCount: connectionEdges.length,
      edgeThreshold,
      fillSize,
      dilateIterations,
      minBuildingArea,
      maxBuildingArea,
      maxAspectRatio,
      componentsFound: components.length,
    },
  };
}

/**
 * Detect buildings by color matching (seeded from a user click).
 *
 * Pipeline: color distance mask → component labeling → filter → connect roads
 *
 * @param {ImageData} imageData
 * @param {Array<{id:string, x:number, y:number}>} roadNodes
 * @param {{ r:number, g:number, b:number }} seedColor
 * @param {Object} [options]
 * @param {number}  [options.colorTolerance=40]         - Per-channel color match tolerance
 * @param {number}  [options.minBuildingArea=200]        - Minimum pixels for a building component
 * @param {number}  [options.maxBuildingAreaRatio=0.05]  - Max building as fraction of total pixels
 * @param {number}  [options.maxAspectRatio=10]          - Max width/height or height/width ratio
 * @param {number}  [options.maxConnectDist=300]         - Max distance to nearest road node
 * @param {boolean} [options.debug=false]
 * @returns {{ buildingNodes:Array, connectionEdges:Array, stats:Object, error?:string }}
 */
export function detectBuildingsByColor(imageData, roadNodes, seedColor, options = {}) {
  // ── Guard clauses ──
  if (!imageData || !imageData.width || !imageData.height || !imageData.data) {
    return {
      buildingNodes: [],
      connectionEdges: [],
      stats: { duration: 0 },
      error: '无效的图片数据',
    };
  }
  if (imageData.width < 100 || imageData.height < 100) {
    return {
      buildingNodes: [],
      connectionEdges: [],
      stats: { duration: 0 },
      error: '图片尺寸过小',
    };
  }
  if (!seedColor || seedColor.r === undefined || seedColor.g === undefined || seedColor.b === undefined) {
    return {
      buildingNodes: [],
      connectionEdges: [],
      stats: { duration: 0 },
      error: '请先点击建筑区域选取颜色',
    };
  }

  const {
    colorTolerance = 40,
    minBuildingArea = 200,
    maxBuildingAreaRatio = 0.05,
    maxAspectRatio = 10,
    maxConnectDist = 300,
    debug = false,
  } = options;

  const startTime = performance.now();
  const { width: w, height: h, data } = imageData;
  const totalPx = w * h;
  const maxBuildingArea = Math.floor(totalPx * maxBuildingAreaRatio);
  const { r: sr, g: sg, b: sb } = seedColor;

  // Step 1 — Color distance mask (per-channel absolute diff)
  const binary = new Uint8Array(totalPx);
  for (let i = 0; i < totalPx; i++) {
    const o = i * 4;
    const dr = Math.abs(data[o] - sr);
    const dg = Math.abs(data[o + 1] - sg);
    const db = Math.abs(data[o + 2] - sb);
    binary[i] = (dr <= colorTolerance && dg <= colorTolerance && db <= colorTolerance) ? 1 : 0;
  }

  const maskUrl = debug ? binaryToDataUrl(binary, w, h) : '';
  const maskPixels = binary.reduce((a, b) => a + b, 0);

  if (maskPixels === 0) {
    return {
      buildingNodes: [],
      connectionEdges: [],
      stats: { duration: Math.round(performance.now() - startTime), colorTolerance, seedColor },
      error: '未找到与所选颜色匹配的像素',
    };
  }

  // Step 2 — Connected-component labeling on color mask
  let components = labelComponents(binary, w, h, minBuildingArea);

  if (components.length === 0) {
    return {
      buildingNodes: [],
      connectionEdges: [],
      stats: {
        duration: Math.round(performance.now() - startTime),
        colorTolerance, minBuildingArea, maskPixels,
      },
      error: '未找到符合最小面积要求的色块区域',
    };
  }

  // Step 3 — Filter by area & aspect ratio
  //     (no courtyard removal for color-seeded mode)
  components = components.filter((comp) => {
    if (comp.area < minBuildingArea || comp.area > maxBuildingArea) return false;
    const cw = comp.maxX - comp.minX + 1;
    const ch = comp.maxY - comp.minY + 1;
    const ratio = Math.max(cw, ch) / Math.min(cw, ch);
    return ratio <= maxAspectRatio;
  });

  if (components.length === 0) {
    return {
      buildingNodes: [],
      connectionEdges: [],
      stats: {
        duration: Math.round(performance.now() - startTime),
        colorTolerance, minBuildingArea,
      },
      error: '过滤后未找到有效建筑区域',
    };
  }

  // Step 4 — Sort by area descending, assign IDs
  components.sort((a, b) => b.area - a.area);

  const buildingNodes = components.map((comp, idx) => ({
    id: `b-${idx}`,
    name: null,
    type: 'building',
    x: Math.round(comp.centroidX),
    y: Math.round(comp.centroidY),
    routingOnly: false,
    bbox: {
      x: comp.minX,
      y: comp.minY,
      w: comp.maxX - comp.minX + 1,
      h: comp.maxY - comp.minY + 1,
    },
  }));

  // Step 5 — Connect each building to nearest road node
  const roadList = Array.isArray(roadNodes) ? roadNodes : [];
  const maxDistSq = maxConnectDist * maxConnectDist;
  const connectionEdges = [];

  for (const bNode of buildingNodes) {
    let bestDistSq = maxDistSq;
    let bestNodeId = null;

    for (const rNode of roadList) {
      const dx = bNode.x - (rNode.x || 0);
      const dy = bNode.y - (rNode.y || 0);
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestNodeId = rNode.id;
      }
    }

    if (bestNodeId) {
      connectionEdges.push({
        from: bNode.id,
        to: bestNodeId,
        type: 'walkway',
        bidirectional: true,
      });
    }
  }

  const duration = Math.round(performance.now() - startTime);

  return {
    buildingNodes,
    connectionEdges,
    ...(debug ? { debugUrls: { maskUrl } } : {}),
    stats: {
      duration,
      buildingCount: buildingNodes.length,
      connectedCount: connectionEdges.length,
      colorTolerance,
      seedColor,
      minBuildingArea,
      maxBuildingArea,
      maxAspectRatio,
      componentsFound: components.length,
    },
  };
}
