/**
 * Lossless Compression Algorithms
 *
 * Three implementations for course design demonstration:
 * 1. Huffman Coding — optimal prefix code
 * 2. LZ77 — sliding window dictionary compression
 * 3. BWT + MTF + Huffman — Burrows-Wheeler transform pipeline (like bzip2 core)
 */

// ═══ Huffman Coding ═══

class HuffmanNode {
  constructor(char, freq, left = null, right = null) {
    this.char = char;
    this.freq = freq;
    this.left = left;
    this.right = right;
  }
}

/**
 * Build Huffman tree from text.
 * Returns { root: HuffmanNode, codeTable: Map<char -> bitstring> }
 */
function buildHuffmanTree(text) {
  // Count character frequencies
  const freq = new Map();
  for (const ch of text) {
    freq.set(ch, (freq.get(ch) || 0) + 1);
  }

  // Build priority queue (simple sorted array for clarity)
  const nodes = [...freq.entries()].map(([ch, f]) => new HuffmanNode(ch, f));
  nodes.sort((a, b) => a.freq - b.freq);

  // Merge until one tree remains
  while (nodes.length > 1) {
    const left = nodes.shift();
    const right = nodes.shift();
    const parent = new HuffmanNode(null, left.freq + right.freq, left, right);
    // Insert in sorted position
    let i = 0;
    while (i < nodes.length && nodes[i].freq < parent.freq) i++;
    nodes.splice(i, 0, parent);
  }

  const root = nodes[0];
  const codeTable = new Map();

  // Generate code table from tree
  function traverse(node, bits) {
    if (node.char !== null && node.char !== undefined) {
      codeTable.set(node.char, bits);
      return;
    }
    if (node.left) traverse(node.left, bits + '0');
    if (node.right) traverse(node.right, bits + '1');
  }
  traverse(root, '');

  return { root, codeTable };
}

/**
 * Huffman encode — returns bit string and stats.
 */
function huffmanEncode(text) {
  const start = process.hrtime.bigint();
  const { root, codeTable } = buildHuffmanTree(text);

  // Encode
  let bits = '';
  for (const ch of text) {
    bits += codeTable.get(ch);
  }

  const duration = Number(process.hrtime.bigint() - start) / 1e6; // ms
  const originalSize = text.length; // characters (simplified: 1 char = 1 byte for ASCII-like)
  const compressedSize = Math.ceil(bits.length / 8);

  return {
    encoded: bits,
    codeTable: Object.fromEntries(codeTable),
    tree: root,
    stats: {
      originalSize,
      compressedSize,
      ratio: originalSize > 0 ? ((1 - compressedSize / originalSize) * 100).toFixed(1) : 0,
      duration: Math.round(duration * 100) / 100,
      charCount: codeTable.size,
    },
  };
}

/**
 * Huffman decode — given bit string and tree, recover original text.
 */
function huffmanDecode(bits, root) {
  let result = '';
  let node = root;
  for (const bit of bits) {
    node = bit === '0' ? node.left : node.right;
    if (node.char !== null && node.char !== undefined) {
      result += node.char;
      node = root;
    }
  }
  return result;
}

// ═══ LZ77 ═══

/**
 * LZ77 encode with sliding window.
 * Returns array of tokens: { offset, length, nextChar } for non-matches,
 * or { offset, length } followed by next char for matches.
 */
function lz77Encode(text, windowSize = 256, lookaheadSize = 64) {
  const start = process.hrtime.bigint();
  const tokens = [];
  let pos = 0;

  while (pos < text.length) {
    let bestOffset = 0;
    let bestLength = 0;

    const searchStart = Math.max(0, pos - windowSize);
    const maxLen = Math.min(lookaheadSize, text.length - pos);

    // Search for longest match in window
    for (let offset = 1; offset <= pos - searchStart; offset++) {
      let len = 0;
      while (
        len < maxLen &&
        text[pos + len] === text[pos - offset + len]
      ) {
        len++;
      }
      if (len > bestLength) {
        bestLength = len;
        bestOffset = offset;
      }
    }

    if (bestLength > 1) {
      tokens.push({
        offset: bestOffset,
        length: bestLength,
        nextChar: text[pos + bestLength] || '',
      });
      pos += bestLength + 1;
    } else {
      tokens.push({ offset: 0, length: 0, nextChar: text[pos] });
      pos++;
    }
  }

  const duration = Number(process.hrtime.bigint() - start) / 1e6;
  const originalSize = text.length;
  // Estimate compressed size: each token ~3 bytes (offset(1) + length(1) + char(1))
  const compressedSize = tokens.length * 3;

  return {
    encoded: tokens,
    stats: {
      originalSize,
      compressedSize,
      ratio: originalSize > 0 ? ((1 - compressedSize / originalSize) * 100).toFixed(1) : 0,
      duration: Math.round(duration * 100) / 100,
      tokenCount: tokens.length,
      matchRate: tokens.filter(t => t.length > 0).length / Math.max(tokens.length, 1),
    },
  };
}

/**
 * LZ77 decode — given tokens, reconstruct original text.
 */
function lz77Decode(tokens) {
  let result = '';
  for (const token of tokens) {
    if (token.length > 0) {
      // Match: copy from earlier in result
      const start = result.length - token.offset;
      for (let i = 0; i < token.length; i++) {
        result += result[start + i];
      }
    }
    if (token.nextChar) {
      result += token.nextChar;
    }
  }
  return result;
}

// ═══ BWT + MTF + Huffman ═══

/**
 * Burrows-Wheeler Transform.
 * Creates all cyclic rotations, sorts them, returns last column + original index.
 */
function bwtEncode(text) {
  // Build suffix array — all cyclic rotations
  const n = text.length;
  const rotations = [];
  for (let i = 0; i < n; i++) {
    rotations.push({ suffix: text.slice(i) + text.slice(0, i), index: i });
  }
  rotations.sort((a, b) => {
    const minLen = Math.min(a.suffix.length, b.suffix.length);
    for (let i = 0; i < minLen; i++) {
      if (a.suffix[i] !== b.suffix[i]) return a.suffix.charCodeAt(i) - b.suffix.charCodeAt(i);
    }
    return a.suffix.length - b.suffix.length;
  });

  const lastColumn = rotations.map(r => r.suffix[n - 1]).join('');
  const originalIndex = rotations.findIndex(r => r.index === 0);

  return { transformed: lastColumn, originalIndex };
}

/**
 * Inverse BWT.
 * Reconstructs original text from the last column and original index
 * using the (char, index) sorting approach.
 */
function bwtDecode(transformed, originalIndex) {
  const n = transformed.length;
  const lastCol = transformed.split('');

  // Create array of (char, index) pairs and sort them
  const indexed = lastCol.map((ch, i) => ({ ch, i }));
  indexed.sort((a, b) => {
    const diff = a.ch.charCodeAt(0) - b.ch.charCodeAt(0);
    if (diff !== 0) return diff;
    return a.i - b.i;
  });

  // next[i] = the row in the sorted order that corresponds to row i in the original
  const next = new Array(n);
  for (let i = 0; i < n; i++) {
    next[i] = indexed[i].i;
  }

  // Reconstruct
  let result = '';
  let idx = originalIndex;
  for (let i = 0; i < n; i++) {
    result += indexed[idx].ch;
    idx = next[idx];
  }

  return result;
}

/**
 * Move-to-Front transform.
 * Maintains a list of symbols. When a symbol appears, output its index
 * and move it to the front. This converts repeated symbols to small numbers.
 */
function mtfEncode(text) {
  const alphabet = [...new Set(text)].sort();
  const list = [...alphabet];
  const result = [];

  for (const ch of text) {
    const idx = list.indexOf(ch);
    result.push(idx);
    // Move to front
    list.splice(idx, 1);
    list.unshift(ch);
  }

  return { encoded: result, alphabet };
}

function mtfDecode(enc, alphabet) {
  const list = [...alphabet];
  let result = '';

  for (const idx of enc) {
    const ch = list[idx];
    result += ch;
    list.splice(idx, 1);
    list.unshift(ch);
  }

  return result;
}

/**
 * BWT + MTF + Huffman pipeline encode.
 * BWT makes repeated characters cluster together → MTF converts to small numbers → Huffman compresses.
 */
function bwtPipelineEncode(text) {
  const start = process.hrtime.bigint();

  // Step 1: BWT
  const { transformed, originalIndex } = bwtEncode(text);

  // Step 2: MTF
  const { encoded: mtfSeq, alphabet } = mtfEncode(transformed);

  // Step 3: Huffman on MTF sequence (converted to string of numbers separated by char)
  const mtfString = mtfSeq.map(n => String.fromCharCode(n + 32)).join('');

  // Huffman encode the MTF output
  const hResult = huffmanEncode(mtfString);

  const duration = Number(process.hrtime.bigint() - start) / 1e6;
  const originalSize = text.length;
  const compressedSize = Math.ceil(hResult.encoded.length / 8);

  return {
    encoded: {
      bits: hResult.encoded,
      tree: hResult.tree,
      originalIndex,
      alphabet,
      mtfString,
    },
    stats: {
      originalSize,
      compressedSize,
      ratio: originalSize > 0 ? ((1 - compressedSize / originalSize) * 100).toFixed(1) : 0,
      duration: Math.round(duration * 100) / 100,
      bwtSize: transformed.length,
      mtfSize: mtfString.length,
    },
  };
}

/**
 * BWT + MTF + Huffman pipeline decode.
 */
function bwtPipelineDecode(encoded) {
  // Step 1: Huffman decode
  const mtfString = huffmanDecode(encoded.bits, encoded.tree);

  // Step 2: MTF decode
  const mtfSeq = [...mtfString].map(ch => ch.charCodeAt(0) - 32);

  // Step 3: BWT decode
  const transformed = mtfDecode(mtfSeq, encoded.alphabet);
  const original = bwtDecode(transformed, encoded.originalIndex);

  return original;
}

// ═══ Benchmark ═══

/**
 * Run all three compression algorithms on the same text and return comparison.
 */
function benchmarkCompression(text) {
  if (!text || text.length === 0) {
    return { error: '文本不能为空' };
  }

  // Run all three
  let hResult, lResult, bResult;
  try { hResult = huffmanEncode(text); } catch (e) { hResult = { error: e.message }; }
  try { lResult = lz77Encode(text); } catch (e) { lResult = { error: e.message }; }
  try { bResult = bwtPipelineEncode(text); } catch (e) { bResult = { error: e.message }; }

  // Verify round-trip correctness
  const verifications = {};
  if (!hResult.error) {
    const decoded = huffmanDecode(hResult.encoded, hResult.tree);
    verifications.huffman = decoded === text ? '✅ 正确' : '❌ 解码不一致';
  }
  if (!lResult.error) {
    const decoded = lz77Decode(lResult.encoded);
    verifications.lz77 = decoded === text ? '✅ 正确' : '❌ 解码不一致';
  }
  if (!bResult.error) {
    const decoded = bwtPipelineDecode(bResult.encoded);
    verifications.bwt = decoded === text ? '✅ 正确' : '❌ 解码不一致';
  }

  return {
    textLength: text.length,
    textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
    huffman: { stats: hResult.stats || {}, error: hResult.error },
    lz77: { stats: lResult.stats || {}, error: lResult.error },
    bwt: { stats: bResult.stats || {}, error: bResult.error },
    verification: verifications,
    summary: generateSummary(hResult, lResult, bResult),
  };
}

function generateSummary(h, l, b) {
  const algorithms = [
    { name: 'Huffman', result: h },
    { name: 'LZ77', result: l },
    { name: 'BWT+MTF+Huffman', result: b },
  ];

  // Find best compression ratio
  const valid = algorithms.filter(a => !a.result.error);
  if (valid.length === 0) return '所有算法执行失败';

  valid.sort((a, b) => parseFloat(a.result.stats.ratio) - parseFloat(b.result.stats.ratio));
  const best = valid[valid.length - 1];

  let summary = `最佳压缩率: ${best.name} (${best.result.stats.ratio}%)。`;

  // Add comparison insights
  if (valid.length >= 2) {
    // LZ77 vs Huffman
    if (!h.error && !l.error) {
      const hRatio = parseFloat(h.stats.ratio);
      const lRatio = parseFloat(l.stats.ratio);
      if (lRatio > hRatio) {
        summary += ` LZ77 压缩效果优于 Huffman（${lRatio}% vs ${hRatio}%），因其能利用文本中的重复模式。`;
      } else {
        summary += ` Huffman 在此文本上优于 LZ77（因文本重复模式较少）。`;
      }
    }

    // BWT vs others
    if (!b.error) {
      const bRatio = parseFloat(b.stats.ratio);
      summary += ` BWT 流水线通过先做 Burrows-Wheeler 变换聚集重复字符，再经 MTF 和 Huffman，在重复文本上表现最优（${bRatio}%）。`;
    }
  }

  return summary;
}

// ═══ Detailed Analysis ═══

/**
 * Full analysis — includes intermediate process data for educational display.
 */
function detailedAnalyze(text) {
  const benchmark = benchmarkCompression(text);
  if (!benchmark || benchmark.error) return benchmark;

  // 1. Character frequency analysis (top 10)
  const freq = {};
  for (const ch of text) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  const freqSorted = Object.entries(freq)
    .filter(([ch]) => /[\u4e00-\u9fa5a-zA-Z0-9]/.test(ch))  // only Chinese + alphanumeric
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([ch, count]) => ({ char: ch, count, pct: ((count / text.length) * 100).toFixed(1) }));

  // 2. Huffman encoding table (top 10 — build fresh for display)
  let huffmanTable = [];
  if (!benchmark.huffman.error) {
    try {
      const { codeTable } = huffmanEncode(text);
      huffmanTable = Object.entries(codeTable)
        .sort((a, b) => a[1].length - b[1].length)
        .slice(0, 10)
        .map(([ch, code]) => ({ char: ch, code, length: code.length }));
    } catch { /* ignore — huffman table is informative only */ }
  }

  // 3. BWT transform preview
  let bwtPreview = '';
  let bwtPreviewOriginal = '';
  if (!benchmark.bwt.error) {
    try {
      const { transformed } = bwtEncode(text);
      bwtPreview = transformed.substring(0, 100);
      bwtPreviewOriginal = text.substring(0, 100);
    } catch { /* ignore — BWT preview is informative only */ }
  }

  // 4. Repetition analysis (Chinese bigrams)
  const topRepeats = [];
  const repeatMap = {};
  for (let i = 0; i < text.length - 2; i++) {
    const bigram = text.substring(i, i + 2);
    if (/[\u4e00-\u9fa5]{2}/.test(bigram)) {
      repeatMap[bigram] = (repeatMap[bigram] || 0) + 1;
    }
  }
  const repeats = Object.entries(repeatMap).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < Math.min(repeats.length, 5); i++) {
    topRepeats.push({ word: repeats[i][0], count: repeats[i][1] });
  }

  // 5. Decision analysis
  let decision = '';
  const sorted = Object.entries({ huffman: benchmark.huffman, lz77: benchmark.lz77, bwt: benchmark.bwt })
    .filter(([, v]) => !v.error)
    .sort((a, b) => parseFloat(b[1].stats.ratio) - parseFloat(a[1].stats.ratio));

  // Determine if compression is meaningful
  const bestAbs = sorted.length > 0 ? Math.abs(parseFloat(sorted[0][1].stats.ratio)) : 0;
  const compressible = bestAbs > 5;

  if (sorted.length > 0) {
    const bestEntry = sorted[0];  // FIX: was sorted[-1] — pick highest ratio
    const bestName = bestEntry[0] === 'bwt' ? 'BWT+MTF+Huffman' : bestEntry[0] === 'huffman' ? 'Huffman' : 'LZ77';
    const bestRatio = bestEntry[1].stats.ratio;
    const bestAbs = Math.abs(parseFloat(bestRatio));

    if (bestAbs > 0) {
      decision = `🏆 ${bestName} 压缩率最高（${bestRatio}%），` +
        `${bestEntry[0] === 'bwt' ? 'BWT 变换将重复字符聚集后压缩效果显著。' :
          bestEntry[0] === 'huffman' ? '基于字符频率的最优前缀编码高效压缩。' :
          '利用滑动窗口匹配重复子串实现压缩。'}`;
    } else {
      decision = '当前文本较短，所有算法均无明显压缩效果。';
    }

    // Explain LZ77 expansion if it happens
    const lzEntry = sorted.find(([k]) => k === 'lz77');
    if (lzEntry && parseFloat(lzEntry[1].stats.ratio) < 0) {
      decision += ` LZ77 在本文本上膨胀 ${-parseFloat(lzEntry[1].stats.ratio).toFixed(0)}%，因短文本的 token 开销大于原文——LZ77 适合长文本或高重复场景。`;
    }

    // Repetition insight
    if (topRepeats.length > 0) {
      decision += ` 文本中存在高频重复"${topRepeats[0].word}"（×${topRepeats[0].count}），`;
      decision += (bestEntry[0] === 'lz77' || bestEntry[0] === 'bwt')
        ? 'LZ77 和 BWT 能有效利用这类重复模式。' : '';
    }

    decision += ' 工程部署选择 LZ77——无需额外编码表，通用性强，对任意文本质效均衡。';
  }

  return {
    ...benchmark,
    analysis: {
      uniqueChars: new Set(text.split('')).size,
      charFrequency: freqSorted,
      huffmanTable,
      bwtPreview,
      bwtPreviewOriginal,
      topRepeats,
      decision,
      compressible,
      reason: compressible ? null : (text.length < 50 ? '文本过短（不足50字符），无法进行有意义的压缩分析' : '所有算法均未达到有效压缩率（<5%）'),
    },
  };
}

// ═══ Exports ═══

module.exports = {
  huffmanEncode,
  huffmanDecode,
  lz77Encode,
  lz77Decode,
  bwtEncode,
  bwtDecode,
  mtfEncode,
  mtfDecode,
  bwtPipelineEncode,
  bwtPipelineDecode,
  benchmarkCompression,
  detailedAnalyze,
};
