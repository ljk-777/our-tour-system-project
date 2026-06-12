import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getDiaries, searchDiaries, createDiary, generateDiaryDraft, generateDiaryVideoScript, likeDiary, unlikeDiary, commentDiary } from '../api/index.js';
import { PERMISSIONS, useAuth } from '../context/AuthContext.jsx';
import { useRequireAuth } from '../components/AuthGuard.jsx';

const WEATHER_ICON = { '晴':'☀️','多云':'⛅','阴':'🌥️','雨':'🌧️','雪':'❄️','多云转晴':'🌤️' };
const MOOD_ICON    = { '愉悦':'😊','激动':'🤩','满足':'😌','宁静':'😶','震撼':'😲','感动':'🥹','自由':'🤸','虔诚':'🙏' };

function formatLocalDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${`${date.getMonth()+1}`.padStart(2,'0')}-${`${date.getDate()}`.padStart(2,'0')}`;
}
function formatDiaryDate(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return formatLocalDate(value);
}

function compressImage(file, size = 600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(size / img.width, size / img.height, 1);
      const w = Math.round(img.width * ratio), h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(); };
    img.src = url;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const ANIMATION_STYLES = {
  campus: { label: '晴日校园', tint: 'rgba(255, 184, 77, 0.13)', particles: 'rgba(255, 255, 255, 0.75)', transition: 'flash' },
  landscape: { label: '湖光山色', tint: 'rgba(65, 190, 170, 0.13)', particles: 'rgba(188, 236, 255, 0.7)', transition: 'ripple' },
  architecture: { label: '古建漫游', tint: 'rgba(210, 122, 60, 0.12)', particles: 'rgba(255, 226, 184, 0.66)', transition: 'warmWipe' },
  night: { label: '夜景流光', tint: 'rgba(76, 88, 210, 0.18)', particles: 'rgba(255, 230, 140, 0.78)', transition: 'darkGlow' },
};

const ANIMATION_QUALITY = {
  fast: { label: '快速', width: 480, height: 270, fps: 15, bitrate: 750000 },
  high: { label: '高清', width: 640, height: 360, fps: 24, bitrate: 1500000 },
};

const ANIMATION_PACE = {
  slow: { label: '舒缓', secondsPerImage: 2.2, maxDuration: 8.5 },
  normal: { label: '标准', secondsPerImage: 1.8, maxDuration: 7 },
  brisk: { label: '轻快', secondsPerImage: 1.35, maxDuration: 6 },
};

const ANIMATION_ASPECTS = {
  landscape: { label: '横屏 16:9', fast: { width: 480, height: 270 }, high: { width: 640, height: 360 } },
  portrait: { label: '竖屏 9:16', fast: { width: 360, height: 640 }, high: { width: 405, height: 720 } },
  square: { label: '方形 1:1', fast: { width: 420, height: 420 }, high: { width: 540, height: 540 } },
};

function drawCoverImage(ctx, img, canvas, scale, panX, panY) {
  const sourceRatio = img.width / img.height;
  const targetRatio = canvas.width / canvas.height;
  let drawW = canvas.width * scale;
  let drawH = drawW / sourceRatio;
  if (drawH < canvas.height * scale) {
    drawH = canvas.height * scale;
    drawW = drawH * sourceRatio;
  }
  const x = (canvas.width - drawW) / 2 + panX;
  const y = (canvas.height - drawH) / 2 + panY;
  ctx.drawImage(img, x, y, drawW, drawH);
}

function cleanStoryText(value, fallback = '') {
  return String(value || '').replace(/\s+/g, ' ').trim() || fallback;
}

function splitStorySentences(content) {
  return cleanStoryText(content)
    .split(/[。！？!?；;，,]/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 9);
}

/**
 * Build local travel-video captions from diary metadata.
 * Time complexity: O(c + n), where c is content length and n is image count.
 */
function createStoryBoard(story = {}, imageCount = 1, script = null) {
  const scriptShots = Array.isArray(script?.shots) ? script.shots : [];
  const title = cleanStoryText(script?.title, cleanStoryText(story.title, cleanStoryText(story.spotName, '旅行日记')));
  const spotName = cleanStoryText(story.spotName, '这段旅程');
  const weather = cleanStoryText(story.weather);
  const mood = cleanStoryText(story.mood);
  const sentences = splitStorySentences(story.content);
  const defaults = [
    `${spotName}的第一眼，值得被认真收藏`,
    `把风景、天气和心情都放进这一帧`,
    `走过这里之后，回忆有了新的坐标`,
    `这一天的光线，刚好适合慢慢记住`,
  ];
  const captions = Array.from({ length: imageCount }, (_, index) => (
    cleanStoryText(scriptShots[index]?.caption)
    || sentences[index % Math.max(sentences.length, 1)]
    || defaults[index % defaults.length]
  ));
  const meta = [spotName, weather, mood].filter(Boolean).join(' · ');

  return {
    title,
    meta,
    intro: cleanStoryText(script?.intro, meta || 'WAYLOG TRAVEL STORY'),
    captions,
    outro: cleanStoryText(script?.outro, mood ? `带着${mood}，继续出发` : '把下一站，也写进日记'),
  };
}

function wrapCanvasText(ctx, text, maxWidth) {
  const chars = Array.from(cleanStoryText(text));
  const lines = [];
  let current = '';
  chars.forEach(char => {
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function drawTextLines(ctx, lines, x, y, lineHeight, maxLines) {
  lines.slice(0, maxLines).forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

function drawStoryBackdrop(ctx, canvas, style, alpha = 0.62) {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, 'rgba(0,0,0,0.6)');
  gradient.addColorStop(0.45, style.tint);
  gradient.addColorStop(1, `rgba(0,0,0,${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTitleCard(ctx, canvas, style, storyBoard, progress) {
  const safeX = Math.max(24, canvas.width * 0.08);
  const maxWidth = canvas.width - safeX * 2;
  const titleSize = Math.max(25, Math.min(44, canvas.width * 0.075));
  const metaSize = Math.max(12, Math.min(17, canvas.width * 0.03));
  const y = canvas.height * (0.46 + (1 - progress) * 0.04);

  drawStoryBackdrop(ctx, canvas, style, 0.7);
  ctx.globalAlpha = Math.min(1, progress * 1.4);
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.font = `700 ${titleSize}px Inter, sans-serif`;
  drawTextLines(ctx, wrapCanvasText(ctx, storyBoard.title, maxWidth), safeX, y, titleSize * 1.15, 2);
  ctx.font = `600 ${metaSize}px Inter, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.fillText(storyBoard.intro, safeX, y + titleSize * 2.65);
  ctx.globalAlpha = 1;
}

function drawCaptionBand(ctx, canvas, text) {
  const safeX = Math.max(22, canvas.width * 0.06);
  const maxWidth = canvas.width - safeX * 2;
  const fontSize = Math.max(14, Math.min(20, canvas.width * 0.037));
  const lineHeight = fontSize * 1.45;
  const lines = wrapCanvasText(ctx, text, maxWidth);
  const bandHeight = Math.min(canvas.height * 0.3, 34 + Math.min(lines.length, 2) * lineHeight);
  const y = canvas.height - bandHeight;

  const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.35, 'rgba(0,0,0,0.46)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.68)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y - 18, canvas.width, bandHeight + 18);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `600 ${fontSize}px Inter, sans-serif`;
  drawTextLines(ctx, lines, safeX, y + 20, lineHeight, 2);
}

function drawOutroCard(ctx, canvas, style, storyBoard, progress) {
  const safeX = Math.max(24, canvas.width * 0.08);
  const maxWidth = canvas.width - safeX * 2;
  const titleSize = Math.max(20, Math.min(34, canvas.width * 0.06));
  drawStoryBackdrop(ctx, canvas, style, 0.78);
  ctx.globalAlpha = Math.min(1, progress * 1.5);
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.font = `700 ${titleSize}px Inter, sans-serif`;
  drawTextLines(ctx, wrapCanvasText(ctx, storyBoard.outro, maxWidth), safeX, canvas.height * 0.48, titleSize * 1.2, 2);
  ctx.font = `600 ${Math.max(11, titleSize * 0.42)}px Inter, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.fillText('WAYLOG · AI TRAVEL FILM', safeX, canvas.height * 0.48 + titleSize * 2.5);
  ctx.globalAlpha = 1;
}

/**
 * Analyze a downscaled image for brightness, color, edges, and visual focus.
 * Time complexity: O(s^2), where s is the fixed sample side length.
 */
function analyzeImage(img) {
  const sample = document.createElement('canvas');
  const size = 48;
  sample.width = size;
  sample.height = size;
  const sampleCtx = sample.getContext('2d');
  sampleCtx.drawImage(img, 0, 0, size, size);
  const { data } = sampleCtx.getImageData(0, 0, size, size);

  let brightness = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  let edgeScore = 0;
  let weightX = 0;
  let weightY = 0;
  let weight = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      brightness += luma;
      red += r;
      green += g;
      blue += b;
      if (x > 0 && y > 0) {
        const left = ((y * size + x - 1) * 4);
        const top = (((y - 1) * size + x) * 4);
        const leftLuma = 0.299 * data[left] + 0.587 * data[left + 1] + 0.114 * data[left + 2];
        const topLuma = 0.299 * data[top] + 0.587 * data[top + 1] + 0.114 * data[top + 2];
        edgeScore += Math.abs(luma - leftLuma) + Math.abs(luma - topLuma);
      }
      const localWeight = Math.max(8, Math.abs(luma - 128));
      weightX += x * localWeight;
      weightY += y * localWeight;
      weight += localWeight;
    }
  }

  const count = size * size;
  return {
    brightness: brightness / count,
    red: red / count,
    green: green / count,
    blue: blue / count,
    edgeScore: edgeScore / count,
    focusX: weight ? (weightX / weight / size - 0.5) : 0,
    focusY: weight ? (weightY / weight / size - 0.5) : 0,
  };
}

function inferStyleFromAnalysis(analysis) {
  if (analysis.brightness < 78) return 'night';
  if (analysis.green > analysis.red * 1.08 || analysis.blue > analysis.red * 1.1) return 'landscape';
  if (analysis.edgeScore > 42 || analysis.red > analysis.blue * 1.12) return 'architecture';
  return 'campus';
}

/**
 * Pick a motion path for each input image according to visual features.
 * Time complexity: O(n), where n is the number of images.
 */
function createShotPlan(images, analyses, styleKey) {
  const motions = ['push', 'panRight', 'float', 'tiltUp', 'pull', 'panLeft'];
  return images.map((img, index) => {
    const analysis = analyses[index];
    let motion = motions[index % motions.length];
    if (analysis.edgeScore > 45) motion = index % 2 ? 'tiltUp' : 'push';
    if (analysis.blue > analysis.red * 1.12 || analysis.green > analysis.red * 1.1) motion = index % 2 ? 'panLeft' : 'panRight';
    if (styleKey === 'night') motion = index % 2 ? 'float' : 'push';
    return { img, analysis, motion };
  });
}

function getShotMotion(shot, localT, canvas) {
  const ease = 0.5 - Math.cos(localT * Math.PI) / 2;
  const focusX = -shot.analysis.focusX * canvas.width * 0.08;
  const focusY = -shot.analysis.focusY * canvas.height * 0.08;

  if (shot.motion === 'pull') return { scale: 1.17 - ease * 0.1, panX: focusX, panY: focusY };
  if (shot.motion === 'panLeft') return { scale: 1.12, panX: 18 - ease * 36 + focusX, panY: focusY };
  if (shot.motion === 'panRight') return { scale: 1.12, panX: -18 + ease * 36 + focusX, panY: focusY };
  if (shot.motion === 'tiltUp') return { scale: 1.13, panX: focusX, panY: 18 - ease * 36 + focusY };
  if (shot.motion === 'float') {
    return {
      scale: 1.08 + Math.sin(localT * Math.PI) * 0.05,
      panX: Math.sin(localT * Math.PI * 2) * 10 + focusX,
      panY: Math.cos(localT * Math.PI * 2) * 8 + focusY,
    };
  }
  return { scale: 1.04 + ease * 0.13, panX: focusX, panY: -8 + ease * 16 + focusY };
}

function drawStyleOverlay(ctx, canvas, style, t, analysis) {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  const brightnessAlpha = analysis.brightness < 90 ? 0.18 : 0.1;
  gradient.addColorStop(0, `rgba(255,255,255,${brightnessAlpha})`);
  gradient.addColorStop(0.45, style.tint);
  gradient.addColorStop(1, analysis.brightness < 90 ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.12)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sweepX = -canvas.width * 0.35 + t * canvas.width * 1.7;
  const sweep = ctx.createLinearGradient(sweepX - 80, 0, sweepX + 80, canvas.height);
  sweep.addColorStop(0, 'rgba(255,255,255,0)');
  sweep.addColorStop(0.5, analysis.brightness < 80 ? 'rgba(255,210,120,0.2)' : 'rgba(255,255,255,0.22)');
  sweep.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sweep;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.12, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawParticles(ctx, canvas, style, t, frame) {
  ctx.fillStyle = style.particles;
  for (let i = 0; i < 28; i += 1) {
    const seed = i * 47;
    const x = (seed * 13 + t * 120 + Math.sin(t * 5 + i) * 22) % canvas.width;
    const y = (seed * 7 + t * 54 + Math.cos(t * 4 + i) * 18) % canvas.height;
    const r = 1 + ((i + frame) % 4) * 0.42;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTransitionOverlay(ctx, canvas, style, amount) {
  if (amount <= 0) return;
  if (style.transition === 'flash') {
    ctx.fillStyle = `rgba(255,255,255,${Math.sin(amount * Math.PI) * 0.32})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  if (style.transition === 'darkGlow') {
    ctx.fillStyle = `rgba(20,24,70,${Math.sin(amount * Math.PI) * 0.34})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  if (style.transition === 'warmWipe') {
    const x = amount * canvas.width;
    const wipe = ctx.createLinearGradient(x - 80, 0, x + 80, canvas.height);
    wipe.addColorStop(0, 'rgba(255,190,120,0)');
    wipe.addColorStop(0.5, 'rgba(255,190,120,0.42)');
    wipe.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = wipe;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  ctx.strokeStyle = `rgba(170,230,255,${Math.sin(amount * Math.PI) * 0.35})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, canvas.height / 2, amount * canvas.width * (0.18 + i * 0.12), amount * canvas.height * (0.12 + i * 0.08), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * Generate a local WebM travel animation from one or more images.
 * Time complexity: O(n + f), where n is image count and f is rendered frame count.
 */
async function generateTravelAnimation(imageUrls, options = {}) {
  if (!window.MediaRecorder) {
    throw new Error('当前浏览器不支持动画导出，请使用 Chrome 或 Edge');
  }

  const styleKey = typeof options === 'string' ? options : options.styleKey || 'campus';
  const quality = ANIMATION_QUALITY[options.quality || 'fast'] || ANIMATION_QUALITY.fast;
  const pace = ANIMATION_PACE[options.pace || 'normal'] || ANIMATION_PACE.normal;
  const aspectKey = options.aspect || 'landscape';
  const size = ANIMATION_ASPECTS[aspectKey]?.[options.quality || 'fast'] || ANIMATION_ASPECTS.landscape.fast;
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const urls = (Array.isArray(imageUrls) ? imageUrls : [imageUrls]).filter(Boolean).slice(0, 9);
  if (urls.length === 0) throw new Error('请先上传图片');
  onProgress?.({ percent: 6, label: '读取图片' });
  const images = await Promise.all(urls.map(loadImage));
  onProgress?.({ percent: 18, label: '分析画面' });
  const analyses = images.map(analyzeImage);
  const aiScript = options.script && typeof options.script === 'object' ? options.script : null;
  const resolvedStyleKey = styleKey === 'auto' ? (aiScript?.style || inferStyleFromAnalysis(analyses[0])) : styleKey;
  const scriptShots = Array.isArray(aiScript?.shots) ? aiScript.shots : [];
  const shotPlan = createShotPlan(images, analyses, resolvedStyleKey).map((shot, index) => ({
    ...shot,
    motion: scriptShots[index]?.motion || shot.motion,
  }));
  const storyBoard = createStoryBoard(options.story, shotPlan.length, aiScript);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(quality.fps);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: quality.bitrate });
  const chunks = [];
  const style = ANIMATION_STYLES[resolvedStyleKey] || ANIMATION_STYLES.campus;
  const storyExtra = shotPlan.length > 1 ? 1700 : 1400;
  const duration = Math.min((pace.maxDuration * 1000) + storyExtra, Math.max(4200, images.length * pace.secondsPerImage * 1000 + storyExtra));
  const totalFrames = Math.round((duration / 1000) * quality.fps);
  const introFrames = Math.min(Math.round(quality.fps * 1.05), Math.round(totalFrames * 0.22));
  const outroFrames = Math.min(Math.round(quality.fps * 0.85), Math.round(totalFrames * 0.18));
  const contentFrames = Math.max(1, totalFrames - introFrames - outroFrames);

  recorder.ondataavailable = (event) => {
    if (event.data?.size) chunks.push(event.data);
  };

  const done = new Promise((resolve) => {
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      onProgress?.({ percent: 100, label: '完成' });
      resolve(blobToDataUrl(blob));
    };
  });

  recorder.start();
  onProgress?.({ percent: 28, label: '生成短片脚本' });
  let frame = 0;
  const timer = setInterval(() => {
    const t = frame / Math.max(totalFrames - 1, 1);
    const contentFrame = Math.max(0, Math.min(contentFrames - 1, frame - introFrames));
    const contentT = contentFrame / Math.max(contentFrames - 1, 1);
    const slideProgress = contentT * shotPlan.length;
    const activeIndex = Math.min(shotPlan.length - 1, Math.floor(slideProgress));
    const nextIndex = Math.min(shotPlan.length - 1, activeIndex + 1);
    const localT = Math.min(1, slideProgress - activeIndex);
    const transition = Math.max(0, Math.min(1, (localT - 0.72) / 0.28));
    const activeShot = shotPlan[activeIndex];
    const nextShot = shotPlan[nextIndex];
    const motion = getShotMotion(activeShot, localT, canvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    if (frame < introFrames) {
      const introT = frame / Math.max(introFrames - 1, 1);
      drawCoverImage(ctx, shotPlan[0].img, canvas, 1.08 + introT * 0.04, 0, 0);
      drawStyleOverlay(ctx, canvas, style, introT, shotPlan[0].analysis);
      drawTitleCard(ctx, canvas, style, storyBoard, introT);
      drawParticles(ctx, canvas, style, introT, frame);
    } else if (frame >= totalFrames - outroFrames) {
      const outroT = (frame - (totalFrames - outroFrames)) / Math.max(outroFrames - 1, 1);
      const lastShot = shotPlan[shotPlan.length - 1];
      drawCoverImage(ctx, lastShot.img, canvas, 1.1 - outroT * 0.03, 0, 0);
      drawStyleOverlay(ctx, canvas, style, outroT, lastShot.analysis);
      drawOutroCard(ctx, canvas, style, storyBoard, outroT);
      drawParticles(ctx, canvas, style, t, frame);
    } else {
      drawCoverImage(ctx, activeShot.img, canvas, motion.scale, motion.panX, motion.panY);
      if (transition > 0 && nextIndex !== activeIndex) {
        ctx.globalAlpha = transition;
        const nextMotion = getShotMotion(nextShot, transition, canvas);
        drawCoverImage(ctx, nextShot.img, canvas, nextMotion.scale, nextMotion.panX, nextMotion.panY);
        ctx.globalAlpha = 1;
      }

      drawStyleOverlay(ctx, canvas, style, t, activeShot.analysis);
      drawTransitionOverlay(ctx, canvas, style, transition);
      drawParticles(ctx, canvas, style, t, frame);
      drawCaptionBand(ctx, canvas, storyBoard.captions[activeIndex]);

      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.font = `600 ${Math.max(12, Math.min(16, canvas.width * 0.028))}px Inter, sans-serif`;
      ctx.fillText(style.label, Math.max(18, canvas.width * 0.05), Math.max(26, canvas.height * 0.07));
      ctx.font = `500 ${Math.max(9, Math.min(12, canvas.width * 0.022))}px Inter, sans-serif`;
      ctx.fillText(shotPlan.length > 1 ? `AI Travel Film · ${activeIndex + 1}/${shotPlan.length}` : 'AI Travel Film', Math.max(18, canvas.width * 0.05), Math.max(42, canvas.height * 0.07 + 16));
    }

    frame += 1;
    if (frame % 3 === 0) {
      onProgress?.({ percent: Math.min(96, 28 + Math.round((frame / totalFrames) * 68)), label: '合成视频' });
    }
    if (frame >= totalFrames) {
      clearInterval(timer);
      recorder.stop();
      stream.getTracks().forEach(track => track.stop());
    }
  }, 1000 / quality.fps);

  return done;
}

function getDiaryMedia(diary) {
  const media = Array.isArray(diary.media) ? diary.media.filter(item => item?.url) : [];
  if (media.length > 0) return media;

  const fallback = [];
  if (diary.coverImage) fallback.push({ type: 'image', url: diary.coverImage });
  if (diary.videoUrl) fallback.push({ type: 'video', url: diary.videoUrl });
  return fallback;
}

function DiaryMediaPreview({ media, compact = false }) {
  const items = (media || []).filter(item => item?.url).slice(0, compact ? 4 : 12);
  if (items.length === 0) return null;

  return (
    <div style={{
      display:'grid',
      gridTemplateColumns: compact && items.length > 1 ? 'repeat(2, minmax(0, 1fr))' : '1fr',
      gap:8,
      marginBottom:14,
    }}>
      {items.map((item, index) => item.type === 'video' ? (
        <div key={`${item.url}-${index}`} style={{ position:'relative' }}>
          <video src={item.url} controls
            onClick={e => e.stopPropagation()}
            style={{ width:'100%', borderRadius:12, maxHeight:compact ? 180 : 280, background:'#000', objectFit:'cover' }} />
          {item.source === 'aigc' && (
            <span style={{
              position:'absolute', left:10, top:10, padding:'4px 8px', borderRadius:999,
              background:'rgba(249,115,22,0.92)', color:'#fff', fontSize:'0.68rem',
              fontWeight:700, fontFamily:'Inter, sans-serif',
            }}>AI 动画</span>
          )}
        </div>
      ) : (
        <img key={`${item.url}-${index}`} src={item.url} alt={`日记图片 ${index + 1}`}
          style={{ width:'100%', height: compact ? 160 : 'auto', maxHeight:compact ? 180 : 420, objectFit:'cover', borderRadius:12 }} />
      ))}
    </div>
  );
}

/* ── KMP 高亮渲染（将 <mark>xxx</mark> 字符串安全渲染为 JSX）── */
function HL({ html, style }) {
  if (!html || !html.includes('<mark>')) return <span style={style}>{html}</span>;
  return <span style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ── 单条日记行（可点击进入详情页） ──────────────────────────── */
function DiaryRow({ diary, index, currentUser, likedDiaryIdsSet, requireAuth }) {
  const [expanded,     setExpanded]     = useState(false);
  const [liked,        setLiked]        = useState(() => likedDiaryIdsSet?.has(diary.id) || false);
  const [likes,        setLikes]        = useState(diary.likes || 0);
  const [likeAnim,     setLikeAnim]     = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments,     setComments]     = useState(
    Array.isArray(diary.comments) ? diary.comments : []
  );
  const [commentText,  setCommentText]  = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const isLong = (diary.content?.length || 0) > 140;
  const likeTimerRef = useRef(null);
  const media = getDiaryMedia(diary);

  useEffect(() => {
    return () => clearTimeout(likeTimerRef.current);
  }, []);

  useEffect(() => {
    setLiked(likedDiaryIdsSet?.has(diary.id) || false);
  }, [likedDiaryIdsSet, diary.id]);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (liked) {
      setLiked(false); setLikes(l => Math.max(0, l - 1));
      try { await unlikeDiary(diary.id); } catch {}
      return;
    }
    clearTimeout(likeTimerRef.current);
    setLikeAnim(true);
    likeTimerRef.current = setTimeout(() => setLikeAnim(false), 500);
    setLiked(true); setLikes(l => l + 1);
    try { await likeDiary(diary.id); } catch {}
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await commentDiary(diary.id, {
        userId: currentUser?.id,
        userName: currentUser?.nickname || currentUser?.username || '匿名旅行者',
        content: commentText.trim(),
      });
      setComments(prev => [...prev, {
        id: Date.now(),
        userName: currentUser?.nickname || currentUser?.username || '匿名旅行者',
        content: commentText.trim(),
        createdAt: new Date().toISOString(),
      }]);
      setCommentText('');
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <Link to={`/diary/${diary.id}`} style={{
      textDecoration: 'none',
      color: 'inherit',
      display: 'block',
      padding: '32px 0',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      position: 'relative',
    }}>
      {/* 浮动爱心特效 */}
      {likeAnim && (
        <span style={{ position:'absolute', left:0, bottom:52, fontSize:'1.4rem', pointerEvents:'none', zIndex:99, animation:'itemSlideIn 0.5s ease both' }}>❤️</span>
      )}

      {/* 主体行：左内容 + 右序号 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:32, alignItems:'start' }}>
        <div>
          {/* 作者信息 */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <Link to={`/profile/${diary.userId}`} style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10 }}
              onClick={e => e.stopPropagation()}>
              <span style={{ fontSize:'1.2rem' }}>{diary.userAvatar}</span>
              <span style={{ fontSize:'0.82rem', fontWeight:600, color:'#1d1d1f', fontFamily:'Inter, sans-serif' }}>{diary.userName}</span>
            </Link>
            {diary.spotName && (
              <span style={{ fontSize:'0.75rem', color:'#aeaeb2', fontFamily:'Inter, sans-serif' }}>
                · 📍 {diary.spotName}
              </span>
            )}
            {diary.weather && (
              <span style={{ fontSize:'0.75rem', color:'#aeaeb2' }}>{WEATHER_ICON[diary.weather] || '🌤️'} {diary.weather}</span>
            )}
            {diary.mood && (
              <span style={{ fontSize:'0.75rem', color:'#aeaeb2' }}>{MOOD_ICON[diary.mood] || '😊'} {diary.mood}</span>
            )}
          </div>

          <DiaryMediaPreview media={media} compact />

          {/* 标题（KMP搜索时高亮匹配词）*/}
          <h3 style={{
            fontFamily:'Inter, sans-serif', fontSize:'1.15rem', fontWeight:700,
            color:'#1d1d1f', letterSpacing:'-0.02em', lineHeight:1.3, marginBottom:8,
          }}>
            <HL html={diary._highlights?.title || diary.title} />
          </h3>

          {/* 正文摘要（KMP搜索时高亮匹配词）*/}
          <p style={{
            fontSize:'0.875rem', color:'#6e6e73', lineHeight:1.7, wordBreak:'break-word',
            display: !expanded && isLong ? '-webkit-box' : 'block',
            WebkitLineClamp: !expanded && isLong ? 3 : undefined,
            WebkitBoxOrient: 'vertical',
            overflow: !expanded && isLong ? 'hidden' : 'visible',
          }}>
            <HL html={diary._highlights?.content || diary.content} />
          </p>
          {isLong && (
            <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} style={{
              fontSize:'0.75rem', color:'#1a73e8', background:'none', border:'none',
              cursor:'pointer', padding:'4px 0', fontFamily:'Inter, sans-serif', fontWeight:500,
            }}>{expanded ? '收起 ▲' : '展开全文 ▼'}</button>
          )}

          {/* 标签 */}
          {diary.tags?.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
              {diary.tags.map(tag => (
                <span key={tag} style={{
                  fontSize:'0.7rem', color:'#aeaeb2', fontFamily:'Inter, sans-serif',
                }}>#{tag}</span>
              ))}
            </div>
          )}

          {/* 操作栏 */}
          <div style={{ display:'flex', alignItems:'center', gap:20, marginTop:16, paddingTop:14, borderTop:'1px solid rgba(0,0,0,0.06)' }}>
            <button onClick={(e) => requireAuth(PERMISSIONS.LIKE, () => handleLike(e))} style={{
              display:'flex', alignItems:'center', gap:6, fontSize:'0.82rem',
              color: liked ? '#ef4444' : '#aeaeb2', background:'none', border:'none',
              cursor:'pointer', fontFamily:'Inter, sans-serif', fontWeight:500,
              transition:'color 0.2s ease',
            }}>
              <span style={{ fontSize:'1rem', display:'inline-block', transform: likeAnim ? 'scale(1.4)' : 'scale(1)', transition:'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
                {liked ? '❤️' : '🤍'}
              </span>
              {likes}
            </button>

            <button onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }} style={{
              display:'flex', alignItems:'center', gap:6, fontSize:'0.82rem',
              color:'#aeaeb2', background:'none', border:'none', cursor:'pointer',
              fontFamily:'Inter, sans-serif',
            }}>
              <span>💬</span> {comments.length}
            </button>

            <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.82rem', color:'#aeaeb2', fontFamily:'Inter, sans-serif' }}>
              <span>👁️</span> {diary.views || 0}
            </span>

            {diary.rating && (
              <span style={{ marginLeft:'auto', fontSize:'0.72rem', color:'#fbbf24', letterSpacing:'0.02em' }}>
                {'★'.repeat(diary.rating)}{'☆'.repeat(5 - diary.rating)}
              </span>
            )}
            <span style={{ fontSize:'0.72rem', color:'#c7c7cc', fontFamily:'Inter, sans-serif', marginLeft: diary.rating ? 0 : 'auto' }}>
              {formatDiaryDate(diary.visitDate || diary.createdAt)}
            </span>
          </div>

          {/* 评论区 */}
          {showComments && (
            <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid rgba(0,0,0,0.06)' }}
              onClick={e => e.stopPropagation()}>
              {comments.length > 0 && (
                <div style={{ marginBottom:12, display:'flex', flexDirection:'column', gap:8 }}>
                  {comments.map((c, i) => (
                    <div key={c.id || i} style={{ display:'flex', gap:8, fontSize:'0.82rem' }}>
                      <span style={{ fontWeight:600, color:'#1d1d1f', flexShrink:0, fontFamily:'Inter, sans-serif' }}>{c.userName}：</span>
                      <span style={{ color:'#6e6e73' }}>{c.content}</span>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={(e) => requireAuth(PERMISSIONS.COMMENT, () => handleComment(e))} style={{ display:'flex', gap:8 }}>
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="写下你的评论..."
                  style={{
                    flex:1, fontSize:'0.85rem', border:'1px solid rgba(0,0,0,0.12)',
                    borderRadius:10, padding:'8px 14px', outline:'none',
                    fontFamily:'Inter, sans-serif', color:'#1d1d1f', background:'#fff',
                  }}
                  maxLength={200}
                />
                <button type="submit" disabled={submitting || !commentText.trim()} style={{
                  flexShrink:0, padding:'8px 18px',
                  background: 'transparent',
                  color: submitting || !commentText.trim() ? '#c7c7cc' : '#f97316',
                  border: `1px solid ${submitting || !commentText.trim() ? 'rgba(0,0,0,0.08)' : 'rgba(249,115,22,0.4)'}`,
                  borderRadius:10, fontSize:'0.82rem', fontWeight:600,
                  cursor: submitting || !commentText.trim() ? 'not-allowed' : 'pointer',
                  fontFamily:'Inter, sans-serif', transition:'all 0.2s ease',
                }}>
                  {submitting ? '...' : '发送'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* 右侧序号 */}
        <div style={{ paddingTop:4, flexShrink:0 }}>
          <span style={{
            fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em',
            textTransform:'uppercase', color:'#c7c7cc', fontFamily:'Inter, sans-serif',
          }}>No.{String(index + 1).padStart(2, '0')}</span>
        </div>
      </div>
    </Link>
  );
}

/* ── 主页面 ───────────────────────────────────────────── */
export default function Diary() {
  const { user, likedDiaryIds } = useAuth();
  const requireAuth = useRequireAuth();
  const [diaries,    setDiaries]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [searchQ,      setSearchQ]      = useState('');
  const [searchMode,   setSearchMode]   = useState('kmp');
  const [destQ,        setDestQ]        = useState('');
  const [sortBy,       setSortBy]       = useState('likes');
  const [showCreate, setShowCreate] = useState(false);
  const [form,       setForm]       = useState({
    title:'', content:'', spotName:'', tags:'',
    weather:'晴', mood:'愉悦', rating:5, coverImage:'', videoUrl:'',
  });
  const [mediaItems, setMediaItems] = useState([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [animationGeneratingIndex, setAnimationGeneratingIndex] = useState(null);
  const [animationStyle, setAnimationStyle] = useState('auto');
  const [animationQuality, setAnimationQuality] = useState('fast');
  const [animationPace, setAnimationPace] = useState('normal');
  const [animationAspect, setAnimationAspect] = useState('landscape');
  const [animationProgress, setAnimationProgress] = useState(null);
  const [aiDraft,     setAiDraft]     = useState('');
  const fileRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => { loadAll(); }, [sortBy]);

  const loadAll = (overrides = {}) => {
    setLoading(true);
    const keyword = overrides.searchQ ?? searchQ;
    const destination = overrides.destQ ?? destQ;
    const params = { sortBy, order:'desc' };
    if (destination.trim()) params.spotName = destination.trim();
    const request = keyword.trim()
      ? searchDiaries({ q: keyword.trim(), mode: searchMode, ...params })
      : getDiaries(params);

    request
      .then(res => setDiaries(res.data.data || []))
      .catch(() => setDiaries([]))
      .finally(() => setLoading(false));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    loadAll();
  };

  const handleDestSearch = (e) => {
    e.preventDefault();
    loadAll();
  };

  const clearSearch = () => {
    setSearchQ('');
    loadAll({ searchQ: '' });
  };

  const clearDestination = () => {
    setDestQ('');
    loadAll({ destQ: '' });
  };

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.some(file => !file.type.startsWith('image/'))) { alert('请选择图片文件'); return; }
    const currentImages = mediaItems.filter(item => item.type === 'image').length;
    if (currentImages + files.length > 9) { alert('图片最多上传 9 张'); e.target.value = ''; return; }
    try {
      const images = await Promise.all(files.map(async file => ({
        type: 'image',
        url: await compressImage(file),
        name: file.name,
      })));
      setMediaItems(prev => {
        const next = [...prev, ...images];
        const firstImage = next.find(item => item.type === 'image')?.url || '';
        setForm(f => ({ ...f, coverImage: firstImage }));
        return next;
      });
    } catch { alert('图片处理失败'); }
    e.target.value = '';
  };

  const handleVideoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.some(file => !file.type.startsWith('video/'))) { alert('请选择视频文件'); return; }
    const currentVideos = mediaItems.filter(item => item.type === 'video').length;
    if (currentVideos + files.length > 3) { alert('视频最多上传 3 个'); e.target.value = ''; return; }
    if (files.some(file => file.size > 10 * 1024 * 1024)) { alert('单个视频请控制在 10MB 以内'); e.target.value = ''; return; }
    try {
      const videos = await Promise.all(files.map(async file => ({
        type: 'video',
        url: await fileToDataUrl(file),
        name: file.name,
      })));
      setMediaItems(prev => {
        const next = [...prev, ...videos];
        const firstVideo = next.find(item => item.type === 'video')?.url || '';
        setForm(f => ({ ...f, videoUrl: firstVideo }));
        return next;
      });
    } catch {
      alert('视频处理失败');
    } finally {
      e.target.value = '';
    }
  };

  const removeMediaItem = (index) => {
    setMediaItems(prev => {
      const next = prev.filter((_, i) => i !== index);
      setForm(f => ({
        ...f,
        coverImage: next.find(item => item.type === 'image')?.url || '',
        videoUrl: next.find(item => item.type === 'video')?.url || '',
      }));
      return next;
    });
  };

  const requestAigcVideoScript = async (images) => {
    try {
      setAnimationProgress({ percent: 12, label: '请求 AI 导演分镜' });
      const res = await generateDiaryVideoScript({
        ...form,
        images: images.map(item => item.url).slice(0, 6),
        imageCount: images.length,
      });
      const script = res.data?.data;
      if (script?.shots?.length) {
        setAnimationProgress({ percent: 20, label: 'AI 分镜已生成' });
        return script;
      }
    } catch (error) {
      setAnimationProgress({ percent: 20, label: 'AI 分镜失败，使用本地脚本' });
    }
    return null;
  };

  const handleGenerateAnimation = async (item, index) => {
    if (item.type !== 'image') return;
    const currentVideos = mediaItems.filter(media => media.type === 'video').length;
    if (currentVideos >= 3) {
      alert('视频最多上传 3 个，请先删除一个视频再生成动画');
      return;
    }

    setAnimationGeneratingIndex(index);
    setAnimationProgress({ percent: 2, label: '准备生成' });
    try {
      const script = await requestAigcVideoScript([item]);
      const animationUrl = await generateTravelAnimation([item.url], {
        styleKey: animationStyle,
        quality: animationQuality,
        pace: animationPace,
        aspect: animationAspect,
        story: form,
        script,
        onProgress: setAnimationProgress,
      });
      setMediaItems(prev => {
        const insertAt = Math.min(index + 1, prev.length);
        return [
          ...prev.slice(0, insertAt),
          {
            type: 'video',
            url: animationUrl,
            name: `${animationStyle === 'auto' ? '智能识别' : ANIMATION_STYLES[animationStyle]?.label || 'AI'}动画`,
            source: 'aigc',
            style: animationStyle,
            aspect: animationAspect,
            fromImage: item.name || `图片 ${index + 1}`,
          },
          ...prev.slice(insertAt),
        ];
      });
      setForm(f => ({ ...f, videoUrl: f.videoUrl || animationUrl }));
    } catch (error) {
      alert(error?.message || 'AI 旅游动画生成失败，请稍后重试');
    } finally {
      setAnimationGeneratingIndex(null);
      setTimeout(() => setAnimationProgress(null), 900);
    }
  };

  const handleGenerateMultiImageAnimation = async () => {
    const images = mediaItems.filter(item => item.type === 'image');
    if (images.length < 2) {
      alert('请至少上传 2 张图片再生成多图动画');
      return;
    }
    const currentVideos = mediaItems.filter(media => media.type === 'video').length;
    if (currentVideos >= 3) {
      alert('视频最多上传 3 个，请先删除一个视频再生成动画');
      return;
    }

    setAnimationGeneratingIndex('multi');
    setAnimationProgress({ percent: 2, label: '准备生成' });
    try {
      const script = await requestAigcVideoScript(images);
      const animationUrl = await generateTravelAnimation(images.map(item => item.url), {
        styleKey: animationStyle,
        quality: animationQuality,
        pace: animationPace,
        aspect: animationAspect,
        story: form,
        script,
        onProgress: setAnimationProgress,
      });
      setMediaItems(prev => ([
        ...prev,
        {
          type: 'video',
          url: animationUrl,
          name: `${animationStyle === 'auto' ? '智能识别' : ANIMATION_STYLES[animationStyle]?.label || 'AI'}多图动画`,
          source: 'aigc',
          style: animationStyle,
          aspect: animationAspect,
          fromImage: `${images.length} 张图片`,
        },
      ]));
      setForm(f => ({ ...f, videoUrl: f.videoUrl || animationUrl }));
    } catch (error) {
      alert(error?.message || '多图 AI 旅游动画生成失败，请稍后重试');
    } finally {
      setAnimationGeneratingIndex(null);
      setTimeout(() => setAnimationProgress(null), 900);
    }
  };

  const handleGenerateDraft = async () => {
    if (!form.title.trim() && !form.spotName.trim() && !form.content.trim()) {
      alert('请先填写标题、地点或一些旅行素材');
      return;
    }
    setGenerating(true);
    try {
      const res = await generateDiaryDraft({ ...form, notes: form.content });
      const content = res.data?.data?.content;
      if (content) setAiDraft(content);
    } catch (error) {
      alert(error?.response?.data?.message || '日记文案生成失败，请稍后重试');
    } finally { setGenerating(false); }
  };

  const handleUseAiDraft = () => {
    if (!aiDraft) return;
    setForm(f => ({ ...f, content: aiDraft }));
    setAiDraft('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return;
    setSubmitting(true);
    try {
      const tagList = form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
      const res = await createDiary({
        ...form, tags: tagList,
        media: mediaItems.map(({ type, url, source, style }) => ({ type, url, source, style })),
        coverImage: mediaItems.find(item => item.type === 'image')?.url || '',
        videoUrl: mediaItems.find(item => item.type === 'video')?.url || '',
        userId: user?.id,
        userName: user?.nickname || user?.username || '旅行者',
        userAvatar: user?.avatar || '🧭',
        visitDate: formatLocalDate(),
      });
      const createdDiary = res.data?.data;
      if (createdDiary) {
        setDiaries(prev => [createdDiary, ...prev.filter(Boolean)]);
      } else {
        loadAll();
      }
      setShowCreate(false);
      setForm({ title:'', content:'', spotName:'', tags:'', weather:'晴', mood:'愉悦', rating:5, coverImage:'', videoUrl:'' });
      setAiDraft('');
      setMediaItems([]);
    } catch {
      alert('发布失败，请稍后重试');
    } finally { setSubmitting(false); }
  };

  const visibleDiaries = diaries.filter(Boolean);
  const totalLikes = visibleDiaries.reduce((s, d) => s + (d.likes || 0), 0);
  const totalViews = visibleDiaries.reduce((s, d) => s + (d.views || 0), 0);

  /* ── 共用 input 样式 */
  const inputStyle = {
    width:'100%', fontSize:'0.88rem', border:'1px solid rgba(0,0,0,0.12)',
    borderRadius:10, padding:'10px 14px', outline:'none',
    fontFamily:'Inter, sans-serif', color:'#1d1d1f', background:'#fff',
    boxSizing:'border-box',
  };

  return (
    <div className="glass-bg">
      <div style={{ maxWidth:860, margin:'0 auto', padding:'56px 32px', position:'relative', zIndex:1 }}>

        {/* ── 页头 */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:48 }}>
          <div>
            <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#aeaeb2', marginBottom:12, fontFamily:'Inter, sans-serif' }}>
              Travel Stories
            </div>
            <h1 style={{ fontFamily:'Inter, sans-serif', fontSize:'clamp(2rem, 4vw, 2.8rem)', fontWeight:800, color:'#1d1d1f', letterSpacing:'-0.04em', lineHeight:1.05, marginBottom:10 }}>
              旅行日记
            </h1>
            <p style={{ fontSize:'0.82rem', color:'#aeaeb2', fontFamily:'Inter, sans-serif' }}>
              {visibleDiaries.length} 篇 · ❤️ {totalLikes} 获赞 · 👁️ {totalViews} 浏览
            </p>
          </div>
          <button onClick={() => requireAuth(PERMISSIONS.PUBLISH_DIARY, () => setShowCreate(!showCreate))} style={{
            display:'flex', alignItems:'center', gap:8,
            background:'transparent', color:'#1d1d1f',
            border:'1.5px solid rgba(0,0,0,0.18)',
            borderRadius:12, padding:'10px 22px', fontSize:'0.88rem',
            fontWeight:600, cursor:'pointer', fontFamily:'Inter, sans-serif',
            transition:'all 0.2s ease', flexShrink:0,
          }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor='rgba(0,0,0,0.28)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(0,0,0,0.18)'; }}
          >
            ✏️ 写日记
          </button>
        </div>

        {/* ── 算法标注 */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8,
          fontSize:'0.72rem', color:'#aeaeb2',
          fontFamily:'SF Mono, Fira Code, monospace', letterSpacing:'0.03em',
          marginBottom:36,
        }}>
          <span style={{ color:'#c7c7cc' }}>KMP 精确匹配</span>
          <span>·</span>
          <span style={{ color:'#c7c7cc' }}>倒排索引全文检索</span>
        </div>

        {/* ── 发布日记表单（白底，无盒子，用细线分隔）*/}
        {showCreate && (
          <div style={{ borderTop:'1px solid rgba(0,0,0,0.12)', borderBottom:'1px solid rgba(0,0,0,0.08)', padding:'36px 0', marginBottom:48 }}>
            <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#aeaeb2', marginBottom:24, fontFamily:'Inter, sans-serif' }}>
              New Entry
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <input value={form.title} onChange={e => setForm({...form, title:e.target.value})}
                  placeholder="日记标题 *" required style={inputStyle} />
                <input value={form.spotName} onChange={e => setForm({...form, spotName:e.target.value})}
                  placeholder="旅游地点（选填）" style={inputStyle} />
                <div>
                  <textarea value={form.content}
                    onChange={e => { setForm(f=>({...f, content:e.target.value})); if(aiDraft) setAiDraft(''); }}
                    placeholder="写下几个关键词、路线、感受，例如：傍晚去了沙河校园，风很舒服... *"
                    required rows={5}
                    style={{ ...inputStyle, resize:'none', lineHeight:1.7 }} />
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:10 }}>
                    <button type="button" onClick={handleGenerateDraft} disabled={generating} style={{
                      padding:'7px 16px', borderRadius:8, fontSize:'0.78rem', fontWeight:600,
                      border:'1px solid rgba(0,0,0,0.15)', background:'#fff', color:'#1d1d1f',
                      cursor: generating ? 'not-allowed' : 'pointer', fontFamily:'Inter, sans-serif',
                      opacity: generating ? 0.5 : 1, transition:'opacity 0.2s',
                    }}>
                      {generating ? '正在润色...' : 'AI 润色正文'}
                    </button>
                    <span style={{ fontSize:'0.75rem', color:'#c7c7cc', fontFamily:'Inter, sans-serif' }}>根据标题、地点、心情自动润色</span>
                  </div>
                  {aiDraft && (
                    <div style={{ marginTop:14, padding:'18px 20px', borderLeft:'3px solid #f97316', background:'rgba(249,115,22,0.03)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                        <span style={{ fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#f97316', fontFamily:'Inter, sans-serif' }}>润色结果</span>
                        <button type="button" onClick={() => setAiDraft('')} style={{ fontSize:'0.75rem', color:'#aeaeb2', background:'none', border:'none', cursor:'pointer' }}>保留原文</button>
                      </div>
                      <p style={{ fontSize:'0.85rem', color:'#6e6e73', lineHeight:1.75, whiteSpace:'pre-wrap' }}>{aiDraft}</p>
                      <div style={{ display:'flex', gap:10, marginTop:14 }}>
                        <button type="button" onClick={handleUseAiDraft} style={{
                          padding:'7px 16px', borderRadius:8, fontSize:'0.78rem', fontWeight:600,
                          background:'linear-gradient(135deg, #f59e0b, #f97316)', color:'#fff',
                          border:'none', cursor:'pointer', fontFamily:'Inter, sans-serif',
                        }}>使用润色结果</button>
                        <button type="button" onClick={handleGenerateDraft} disabled={generating} style={{
                          padding:'7px 16px', borderRadius:8, fontSize:'0.78rem', fontWeight:600,
                          border:'1px solid rgba(0,0,0,0.15)', background:'#fff', color:'#1d1d1f',
                          cursor: generating ? 'not-allowed' : 'pointer', fontFamily:'Inter, sans-serif',
                        }}>{generating ? '正在润色...' : '重新润色'}</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 媒体上传 */}
                <div>
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleImageSelect} />
                  <input ref={videoRef} type="file" accept="video/*" multiple style={{ display:'none' }} onChange={handleVideoSelect} />
                  <div style={{ display:'grid', gridTemplateColumns:'minmax(150px, 1fr) auto auto auto auto', gap:10, alignItems:'center', marginBottom:10 }}>
                    <span style={{ fontSize:'0.75rem', color:'#86868b', fontFamily:'Inter, sans-serif' }}>
                      上传照片后可生成带字幕的智能旅行短片
                    </span>
                    <select value={animationStyle} onChange={e => setAnimationStyle(e.target.value)} style={{
                      border:'1px solid rgba(0,0,0,0.12)', borderRadius:8, padding:'7px 10px',
                      fontSize:'0.75rem', color:'#1d1d1f', background:'#fff', outline:'none',
                      fontFamily:'Inter, sans-serif',
                    }}>
                      <option value="auto">自动识别</option>
                      {Object.entries(ANIMATION_STYLES).map(([key, style]) => (
                        <option key={key} value={key}>{style.label}</option>
                      ))}
                    </select>
                    <select value={animationQuality} onChange={e => setAnimationQuality(e.target.value)} style={{
                      border:'1px solid rgba(0,0,0,0.12)', borderRadius:8, padding:'7px 10px',
                      fontSize:'0.75rem', color:'#1d1d1f', background:'#fff', outline:'none',
                      fontFamily:'Inter, sans-serif',
                    }}>
                      {Object.entries(ANIMATION_QUALITY).map(([key, item]) => (
                        <option key={key} value={key}>{item.label}</option>
                      ))}
                    </select>
                    <select value={animationPace} onChange={e => setAnimationPace(e.target.value)} style={{
                      border:'1px solid rgba(0,0,0,0.12)', borderRadius:8, padding:'7px 10px',
                      fontSize:'0.75rem', color:'#1d1d1f', background:'#fff', outline:'none',
                      fontFamily:'Inter, sans-serif',
                    }}>
                      {Object.entries(ANIMATION_PACE).map(([key, item]) => (
                        <option key={key} value={key}>{item.label}</option>
                      ))}
                    </select>
                    <select value={animationAspect} onChange={e => setAnimationAspect(e.target.value)} style={{
                      border:'1px solid rgba(0,0,0,0.12)', borderRadius:8, padding:'7px 10px',
                      fontSize:'0.75rem', color:'#1d1d1f', background:'#fff', outline:'none',
                      fontFamily:'Inter, sans-serif',
                    }}>
                      {Object.entries(ANIMATION_ASPECTS).map(([key, item]) => (
                        <option key={key} value={key}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <button type="button" onClick={() => fileRef.current?.click()} style={{
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%',
                      padding:'10px', borderRadius:10, fontSize:'0.82rem', fontFamily:'Inter, sans-serif',
                      border:'1px dashed rgba(0,0,0,0.15)', background:'transparent', color:'#aeaeb2',
                      cursor:'pointer', transition:'all 0.2s ease',
                    }}>📷 添加图片（最多 9 张）</button>
                    <button type="button" onClick={() => videoRef.current?.click()} style={{
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%',
                      padding:'10px', borderRadius:10, fontSize:'0.82rem', fontFamily:'Inter, sans-serif',
                      border:'1px dashed rgba(0,0,0,0.15)', background:'transparent', color:'#aeaeb2',
                      cursor:'pointer', transition:'all 0.2s ease',
                    }}>🎬 添加视频（最多 3 个）</button>
                  </div>
                  <button type="button"
                    onClick={handleGenerateMultiImageAnimation}
                    disabled={mediaItems.filter(item => item.type === 'image').length < 2 || animationGeneratingIndex !== null}
                    style={{
                      width:'100%', marginTop:10, padding:'10px', borderRadius:10,
                      border:'1px solid rgba(249,115,22,0.35)',
                      background: mediaItems.filter(item => item.type === 'image').length >= 2
                        ? 'rgba(249,115,22,0.08)'
                        : 'rgba(0,0,0,0.03)',
                      color: mediaItems.filter(item => item.type === 'image').length >= 2 ? '#f97316' : '#aeaeb2',
                      fontSize:'0.82rem', fontWeight:700, cursor: mediaItems.filter(item => item.type === 'image').length >= 2 && animationGeneratingIndex === null ? 'pointer' : 'not-allowed',
                      fontFamily:'Inter, sans-serif',
                    }}
                  >
                    {animationGeneratingIndex === 'multi'
                      ? '正在合成旅行短片...'
                      : `✨ 多图合成一个 AI 旅行短片（已选 ${mediaItems.filter(item => item.type === 'image').length} 张）`}
                  </button>
                  {mediaItems.length > 0 && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:10, marginTop:10 }}>
                      {mediaItems.map((item, index) => (
                        <div key={`${item.url}-${index}`} style={{ position:'relative', border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, overflow:'hidden', background:'#fafafa' }}>
                          {item.type === 'video' ? (
                            <video src={item.url} controls style={{ width:'100%', height:110, objectFit:'cover', display:'block', background:'#000' }} />
                          ) : (
                            <img src={item.url} alt={item.name || `图片 ${index + 1}`} style={{ width:'100%', height:110, objectFit:'cover', display:'block' }} />
                          )}
                          <button type="button" onClick={() => removeMediaItem(index)} style={{
                            position:'absolute', top:6, right:6, width:22, height:22,
                            background:'rgba(0,0,0,0.55)', color:'#fff', border:'none',
                            borderRadius:'50%', fontSize:'0.7rem', cursor:'pointer',
                            display:'flex', alignItems:'center', justifyContent:'center',
                          }}>✕</button>
                          <div style={{ padding:'6px 8px', fontSize:'0.68rem', color:'#86868b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {item.source === 'aigc' ? 'AI短片' : item.type === 'video' ? '视频' : '图片'} {index + 1}
                          </div>
                          {item.type === 'image' && (
                            <button type="button"
                              onClick={() => handleGenerateAnimation(item, index)}
                              disabled={animationGeneratingIndex !== null}
                              style={{
                                position:'absolute', left:6, bottom:30,
                                padding:'4px 8px', borderRadius:999, border:'none',
                                background:'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(249,115,22,0.95))',
                                color:'#fff', fontSize:'0.66rem', fontWeight:700,
                                cursor: animationGeneratingIndex !== null ? 'not-allowed' : 'pointer',
                                boxShadow:'0 4px 12px rgba(249,115,22,0.28)',
                                opacity: animationGeneratingIndex !== null && animationGeneratingIndex !== index ? 0.55 : 1,
                              }}
                            >
                              {animationGeneratingIndex === index ? '生成中...' : 'AI 短片'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {animationGeneratingIndex !== null && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:12, fontSize:'0.74rem', color:'#f97316', fontFamily:'Inter, sans-serif', marginBottom:5 }}>
                        <span>{animationProgress?.label || '正在合成旅游动画'}</span>
                        <span>{animationProgress?.percent || 0}%</span>
                      </div>
                      <div style={{ height:6, borderRadius:999, background:'rgba(249,115,22,0.12)', overflow:'hidden' }}>
                        <div style={{
                          width:`${animationProgress?.percent || 0}%`,
                          height:'100%',
                          borderRadius:999,
                          background:'linear-gradient(135deg, #f59e0b, #f97316)',
                          transition:'width 0.2s ease',
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* 元数据行 */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
                  <input value={form.tags} onChange={e => setForm({...form,tags:e.target.value})}
                    placeholder="标签（逗号分隔）" style={inputStyle} />
                  <select value={form.weather} onChange={e => setForm({...form,weather:e.target.value})} style={inputStyle}>
                    {['晴','多云','阴','雨','雪'].map(w => <option key={w}>{w}</option>)}
                  </select>
                  <select value={form.mood} onChange={e => setForm({...form,mood:e.target.value})} style={inputStyle}>
                    {['愉悦','激动','满足','宁静','震撼','感动'].map(m => <option key={m}>{m}</option>)}
                  </select>
                  <select value={form.rating} onChange={e => setForm({...form,rating:+e.target.value})} style={inputStyle}>
                    {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} 星</option>)}
                  </select>
                </div>

                <div style={{ display:'flex', gap:10, paddingTop:4 }}>
                  <button type="submit" disabled={submitting} style={{
                    padding:'10px 24px', borderRadius:10, fontSize:'0.88rem', fontWeight:600,
                    background:'linear-gradient(135deg, #f59e0b, #f97316)', color:'#fff', border:'none',
                    cursor: submitting ? 'not-allowed' : 'pointer', fontFamily:'Inter, sans-serif',
                    opacity: submitting ? 0.6 : 1, transition:'opacity 0.2s',
                    boxShadow:'0 2px 12px rgba(249,115,22,0.3)',
                  }}>
                    {submitting ? '发布中...' : '发布日记'}
                  </button>
                  <button type="button" onClick={() => { setShowCreate(false); setMediaItems([]); setAiDraft(''); }} style={{
                    padding:'10px 24px', borderRadius:10, fontSize:'0.88rem', fontWeight:600,
                    background:'transparent', color:'#aeaeb2', border:'1px solid rgba(0,0,0,0.12)',
                    cursor:'pointer', fontFamily:'Inter, sans-serif',
                  }}>取消</button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── 搜索 + 排序 */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:12, alignItems:'center', marginBottom:32 }}>
          <form onSubmit={handleSearch} style={{ display:'flex', gap:8, flex:'1 1 300px' }}>
            <div style={{
              flex:1, display:'flex', alignItems:'center', gap:10,
              border:'1px solid rgba(0,0,0,0.12)', borderRadius:10, padding:'0 14px',
              background:'#fff',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, opacity:0.3 }}>
                <circle cx="11" cy="11" r="7" stroke="#000" strokeWidth="2.2"/>
                <path d="M16.5 16.5L21 21" stroke="#000" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="搜索标题、内容、地点..."
                style={{ flex:1, border:'none', outline:'none', fontSize:'0.88rem', color:'#1d1d1f', padding:'10px 0', background:'transparent', fontFamily:'Inter, sans-serif' }} />
            </div>
            <select value={searchMode} onChange={e => setSearchMode(e.target.value)} style={{
              border:'1px solid rgba(0,0,0,0.12)', borderRadius:10, padding:'0 12px',
              fontSize:'0.78rem', color:'#1d1d1f', background:'#fff', outline:'none',
              fontFamily:'Inter, sans-serif', flexShrink:0,
            }}>
              <option value="kmp">KMP 精确</option>
              <option value="fulltext">全文检索</option>
            </select>
            <button style={{
              padding:'0 18px', background:'linear-gradient(135deg, #f59e0b, #f97316)',
              color:'#fff', border:'none', borderRadius:10, fontSize:'0.82rem',
              fontWeight:600, cursor:'pointer', fontFamily:'Inter, sans-serif', flexShrink:0,
              boxShadow:'0 2px 10px rgba(249,115,22,0.3)',
            }}>搜索</button>
            {searchQ && (
              <button type="button" onClick={clearSearch} style={{
                padding:'0 14px', background:'transparent', color:'#aeaeb2',
                border:'1px solid rgba(0,0,0,0.1)', borderRadius:10, fontSize:'0.82rem',
                cursor:'pointer', fontFamily:'Inter, sans-serif', flexShrink:0,
              transition:'all 0.2s ease',
              }}>清除</button>
            )}
          </form>

          {/* 目的地筛选 */}
          <form onSubmit={handleDestSearch} style={{ display:'flex', gap:8, flex:'1 1 240px' }}>
            <div style={{
              flex:1, display:'flex', alignItems:'center', gap:8,
              border:'1px solid rgba(0,0,0,0.12)', borderRadius:10, padding:'0 12px',
              background:'#f9f9f9',
            }}>
              <span style={{ fontSize:'0.85rem', flexShrink:0 }}>📍</span>
              <input value={destQ} onChange={e => setDestQ(e.target.value)}
                placeholder="输入目的地筛选，如：北京、颐和园..."
                style={{ flex:1, border:'none', outline:'none', fontSize:'0.84rem', color:'#1d1d1f',
                  padding:'9px 0', background:'transparent', fontFamily:'Inter, sans-serif' }} />
              {destQ && (
                <button type="button" onClick={clearDestination} style={{
                  background:'none', border:'none', color:'#aeaeb2', cursor:'pointer', fontSize:'0.8rem', flexShrink:0,
                }}>✕</button>
              )}
            </div>
          </form>

          {/* 排序 tab */}
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ fontSize:'0.72rem', color:'#c7c7cc', fontFamily:'Inter, sans-serif' }}>排序</span>
            {[['likes','最多点赞'],['views','最多浏览'],['rating','评分最高'],['createdAt','最新发布']].map(([k,l]) => (
              <button key={k} onClick={() => setSortBy(k)} style={{
                padding:'5px 12px', borderRadius:8, fontSize:'0.75rem', fontWeight:500,
                cursor:'pointer', fontFamily:'Inter, sans-serif',
                border: sortBy===k ? '1px solid rgba(249,115,22,0.35)' : '1px solid rgba(0,0,0,0.08)',
                background: sortBy===k ? 'rgba(249,115,22,0.08)' : '#fff',
                color: sortBy===k ? '#f97316' : '#86868b',
                transition:'all 0.2s ease',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* ── 日记列表 */}
        {loading ? (
          <div style={{ borderTop:'1px solid rgba(0,0,0,0.08)' }}>
            {[...Array(4)].map((_,i) => (
              <div key={i} style={{ padding:'32px 0', borderBottom:'1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ height:16, background:'rgba(0,0,0,0.06)', borderRadius:6, marginBottom:12, width:'60%', animation:'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ height:12, background:'rgba(0,0,0,0.04)', borderRadius:6, width:'40%', animation:'pulse 1.5s ease-in-out infinite' }} />
              </div>
            ))}
          </div>
        ) : visibleDiaries.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:'#aeaeb2' }}>
            <div style={{ fontSize:'3rem', marginBottom:16 }}>📖</div>
            <p style={{ fontSize:'0.9rem', fontFamily:'Inter, sans-serif' }}>
              {searchQ ? `"${searchQ}" 无匹配结果` : '暂无日记，来写第一篇吧'}
            </p>
            {searchQ && (
              <button onClick={clearSearch} style={{
                marginTop:16, padding:'8px 20px', borderRadius:10, fontSize:'0.82rem',
                border:'1px solid rgba(0,0,0,0.12)', background:'#fff', color:'#6e6e73',
                cursor:'pointer', fontFamily:'Inter, sans-serif',
              }}>查看全部日记</button>
            )}
          </div>
        ) : (
          <div style={{ borderTop:'1px solid rgba(0,0,0,0.08)' }}>
            {visibleDiaries.map((d, i) => (
              <div key={d.id} style={{ animation:`itemSlideIn 0.45s cubic-bezier(0.16,1,0.3,1) ${Math.min(i,6)*60}ms both` }}>
                <DiaryRow diary={d} index={i} currentUser={user} likedDiaryIdsSet={likedDiaryIds} requireAuth={requireAuth} />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
