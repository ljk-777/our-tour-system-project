// 为已下载图片但没有 imageUrl 的景点补上本地路径
const fs = require('fs');
const path = require('path');

const SPOTS_FILE = path.join(__dirname, '../src/backend/src/data/spots.js');
const IMAGES_DIR = path.join(__dirname, '../src/frontend/public/images/spots');

// 读取磁盘上已有的图片ID
const onDisk = new Set(
  fs.readdirSync(IMAGES_DIR)
    .filter(f => f.endsWith('.jpg'))
    .map(f => Number(f.replace('.jpg', '')))
);

let src = fs.readFileSync(SPOTS_FILE, 'utf-8');
let added = 0;
let skipped = 0;

// 匹配每个 spot 对象块
const spotRegex = /(\s*\{[^}]*?id:\s*(\d+)\b[^}]*?)openHours:\s*'[^']*'\s*(\})/gs;
let match;
while ((match = spotRegex.exec(src)) !== null) {
  const fullMatch = match[0];
  const id = Number(match[2]);
  const prefix = match[0]; // 整块

  // 跳过已有 imageUrl 的
  if (fullMatch.includes('imageUrl:')) {
    skipped++;
    continue;
  }

  // 跳过没有对应图片的
  if (!onDisk.has(id)) continue;

  // 在闭合 } 前插入 imageUrl
  const fixed = fullMatch.replace(/(openHours:\s*'[^']*'\s*)(\})/, `$1, imageUrl:'/images/spots/${id}.jpg' $2`);
  src = src.replace(fullMatch, fixed);
  added++;
}

fs.writeFileSync(SPOTS_FILE, src, 'utf-8');
console.log(`✅ 已添加 ${added} 个本地路径 (跳过 ${skipped} 个已有或无需添加的)`);
