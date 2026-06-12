const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

const OUTPUT_DIR = path.join(__dirname, '../../public/memory-videos');
const WIDTH = 640;
const HEIGHT = 360;
const FPS = 25;
const SLIDE_SECONDS = 3;
const MAX_SLIDES = 5;

// 按平台探测一个支持中文的字体文件，找不到则跳过字幕叠加
const FONT_CANDIDATES = [
  'C:/Windows/Fonts/msyh.ttc',
  '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
  '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
  '/System/Library/Fonts/PingFang.ttc',
];

const SLIDE_COLORS = ['0xf97316', '0x06b6d4', '0x8b5cf6', '0x10b981', '0xf43f5e', '0x84cc16'];

function findFont() {
  return FONT_CANDIDATES.find((p) => fs.existsSync(p)) || null;
}

// drawtext 滤镜中冒号是特殊字符，Windows 路径里的盘符冒号需要转义
function escapeFilterPath(p) {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:');
}

function decodeDataUrl(dataUrl) {
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  const ext = match[1].split('/')[1].replace('jpeg', 'jpg');
  return { ext, buffer: Buffer.from(match[2], 'base64') };
}

/**
 * 基于日记封面图与标题，生成一段 Ken Burns 风格的旅行回忆 MP4。
 * 时间复杂度近似 O(n)（n = 幻灯片数），由 ffmpeg 完成图像缩放/缓动/拼接。
 * @param {Array<{title?: string, coverImage?: string}>} diaries
 * @returns {Promise<{ url: string, slideCount: number }>}
 */
async function generateMemoryVideo(diaries) {
  if (!Array.isArray(diaries) || diaries.length === 0) {
    const error = new Error('没有可用于生成视频的日记');
    error.statusCode = 400;
    throw error;
  }

  const slides = diaries.slice(0, MAX_SLIDES);
  const font = findFont();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-video-'));

  try {
    const command = ffmpeg();
    const filterParts = [];

    slides.forEach((diary, i) => {
      const image = decodeDataUrl(diary.coverImage);
      const titleText = (diary.title || '旅行回忆').slice(0, 18);
      const titleFile = path.join(workDir, `title-${i}.txt`);
      fs.writeFileSync(titleFile, titleText, 'utf8');

      if (image) {
        const imgPath = path.join(workDir, `slide-${i}.${image.ext}`);
        fs.writeFileSync(imgPath, image.buffer);
        command.input(imgPath).inputOptions(['-loop', '1', '-t', String(SLIDE_SECONDS)]);
      } else {
        const color = SLIDE_COLORS[i % SLIDE_COLORS.length];
        command
          .input(`color=c=${color}:s=${WIDTH}x${HEIGHT}:d=${SLIDE_SECONDS}:r=${FPS}`)
          .inputFormat('lavfi');
      }

      const frames = SLIDE_SECONDS * FPS;
      let chain = `[${i}:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,`
        + `crop=${WIDTH}:${HEIGHT},`
        + `zoompan=z='min(zoom+0.0012,1.15)':d=${frames}:s=${WIDTH}x${HEIGHT}:fps=${FPS},setsar=1`;

      if (font) {
        chain += `,drawtext=fontfile='${escapeFilterPath(font)}':textfile='${escapeFilterPath(titleFile)}':`
          + `fontcolor=white:fontsize=26:x=(w-text_w)/2:y=h-70:box=1:boxcolor=black@0.45:boxborderw=12`;
      }

      chain += `[v${i}]`;
      filterParts.push(chain);
    });

    const concatInputs = slides.map((_, i) => `[v${i}]`).join('');
    filterParts.push(`${concatInputs}concat=n=${slides.length}:v=1:a=0[outv]`);

    const fileName = `memory-${crypto.randomBytes(8).toString('hex')}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, fileName);

    await new Promise((resolve, reject) => {
      command
        .complexFilter(filterParts, 'outv')
        .outputOptions(['-an', '-r', String(FPS), '-pix_fmt', 'yuv420p', '-preset', 'veryfast'])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    return { url: `/api/memory-videos/${fileName}`, slideCount: slides.length };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

module.exports = { generateMemoryVideo };
