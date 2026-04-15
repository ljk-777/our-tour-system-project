/**
 * Diary Repository — 旅游日记数据访问层
 * 当前：内存 JS 数据；升级时换成 DB 查询即可
 */
const { diaries } = require('../data/diaries');

let _diaries = [...diaries];

const diaryRepository = {
  findAll({ userId, spotId, limit = 20, offset = 0 } = {}) {
    let result = _diaries;
    if (userId) result = result.filter(d => d.userId === Number(userId));
    if (spotId) result = result.filter(d => d.spotId === Number(spotId));
    const total = result.length;
    return { data: result.slice(Number(offset), Number(offset) + Number(limit)), total };
  },

  findById(id) {
    return _diaries.find(d => d.id === Number(id)) || null;
  },

  getAll() {
    return _diaries;
  },

  create(data) {
    const id = Math.max(..._diaries.map(d => d.id), 0) + 1;
    const diary = {
      id,
      ...data,
      likes: 0,
      comments: [],
      createdAt: new Date().toISOString(),
    };
    _diaries.push(diary);
    return diary;
  },

  update(id, data) {
    const idx = _diaries.findIndex(d => d.id === Number(id));
    if (idx === -1) return null;
    _diaries[idx] = { ..._diaries[idx], ...data };
    return _diaries[idx];
  },

  delete(id) {
    const idx = _diaries.findIndex(d => d.id === Number(id));
    if (idx === -1) return false;
    _diaries.splice(idx, 1);
    return true;
  },

  like(id) {
    const diary = _diaries.find(d => d.id === Number(id));
    if (!diary) return null;
    diary.likes = (diary.likes || 0) + 1;
    return diary;
  },

  addComment(id, comment) {
    const diary = _diaries.find(d => d.id === Number(id));
    if (!diary) return null;
    if (!diary.comments) diary.comments = [];
    diary.comments.push({ id: diary.comments.length + 1, ...comment, createdAt: new Date().toISOString() });
    return diary;
  },
};

module.exports = diaryRepository;
