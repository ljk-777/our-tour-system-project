/**
 * Spot Repository — 景点数据访问层
 *
 * 当前实现：从内存 JS 数据文件读取
 * 升级路径：只需替换此文件中的实现，改为 SQLite/PostgreSQL 查询即可
 * 路由层、业务逻辑层、前端接口 无需任何改动
 */
const { spots } = require('../data/spots');

// 内部可变副本（支持运行时增删改）
let _spots = [...spots];

const spotRepository = {
  // ---- 查询 ----

  /** 获取全部，支持过滤 */
  findAll({ type, city, province, limit = 20, offset = 0 } = {}) {
    let result = _spots;
    if (type)     result = result.filter(s => s.type === type);
    if (city)     result = result.filter(s => s.city === city);
    if (province) result = result.filter(s => s.province === province);
    const total = result.length;
    return { data: result.slice(Number(offset), Number(offset) + Number(limit)), total };
  },

  /** 按 ID 查单条 */
  findById(id) {
    return _spots.find(s => s.id === Number(id)) || null;
  },

  /** 按 IDs 批量查 */
  findByIds(ids) {
    const set = new Set(ids.map(Number));
    return _spots.filter(s => set.has(s.id));
  },

  /** 返回全部（算法层使用） */
  getAll() {
    return _spots;
  },

  /** 按类型过滤 */
  findByType(type) {
    return _spots.filter(s => s.type === type);
  },

  // ---- 写入（Phase 2 接 DB 时完善） ----

  create(data) {
    const id = Math.max(..._spots.map(s => s.id)) + 1;
    const spot = { id, ...data, createdAt: new Date().toISOString() };
    _spots.push(spot);
    return spot;
  },

  update(id, data) {
    const idx = _spots.findIndex(s => s.id === Number(id));
    if (idx === -1) return null;
    _spots[idx] = { ..._spots[idx], ...data };
    return _spots[idx];
  },

  delete(id) {
    const idx = _spots.findIndex(s => s.id === Number(id));
    if (idx === -1) return false;
    _spots.splice(idx, 1);
    return true;
  },
};

module.exports = spotRepository;
