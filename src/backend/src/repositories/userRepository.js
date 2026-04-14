/**
 * User Repository — 用户数据访问层
 * 当前：内存 JS 数据；升级时换成 DB 查询即可
 */
const { users } = require('../data/users');

let _users = [...users];

const userRepository = {
  findAll() {
    return _users.map(u => ({ ...u, password: undefined })); // 不返回密码
  },

  findById(id) {
    const u = _users.find(u => u.id === Number(id));
    return u ? { ...u, password: undefined } : null;
  },

  findByUsername(username) {
    return _users.find(u => u.username === username) || null;
  },

  findByEmail(email) {
    return _users.find(u => u.email === email) || null;
  },

  create(data) {
    const id = Math.max(..._users.map(u => u.id)) + 1;
    const user = { id, ...data, createdAt: new Date().toISOString() };
    _users.push(user);
    return { ...user, password: undefined };
  },

  update(id, data) {
    const idx = _users.findIndex(u => u.id === Number(id));
    if (idx === -1) return null;
    _users[idx] = { ..._users[idx], ...data };
    return { ..._users[idx], password: undefined };
  },
};

module.exports = userRepository;
