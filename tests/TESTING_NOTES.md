# 健壮性与并发测试补充说明

## 新增脚本

- `tests/concurrency/http_read_load.js`
  - 面向只读高频接口的并发读压测
  - 覆盖景点推荐、美食推荐、日记搜索、最短路接口
- `tests/concurrency/http_write_race.js`
  - 面向写操作竞态的一致性测试
  - 覆盖日记点赞/取消点赞、群组投票
- `tests/robustness/http_resilience_checks.js`
  - 面向业务异常输入的回归检查
  - 重点验证接口在错误参数下返回 4xx/合理 200，而不是 500

## 运行前提

- 后端已启动，默认地址为 `http://127.0.0.1:3001`
- 数据库已初始化并有基础种子数据
- 如后端地址不同，可通过环境变量覆盖：
  - `API_BASE=http://127.0.0.1:3001`

## 运行命令

```bash
node tests/concurrency/http_read_load.js
node tests/concurrency/http_write_race.js
node tests/robustness/http_resilience_checks.js
```

## 建议在答辩中强调的测试点

1. 推荐/搜索/最短路接口在 20~40 并发下仍能稳定返回。
2. 同一用户重复并发点赞不会导致重复计数。
3. 多用户同时点赞同一篇日记后，最终点赞数与唯一用户数一致。
4. 群组投票在并发下遵守“每人一票，可覆盖更新”的一致性规则。
5. 错误参数、空参数、超长关键词等输入不会触发 500 级崩溃。
