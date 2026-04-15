# /adversarial-run — 执行全套对抗测试

运行所有对抗式测试用例，输出汇总报告，暴露算法与 API 的边界缺陷。

## 执行顺序

### Step 1：算法红队测试
```bash
node adversarial/red-team/route-attack-cases.js
node adversarial/red-team/search-attack-cases.js
```
验证 Dijkstra、KMP、Trie、Heap 在极端输入下不崩溃、不死循环。

### Step 2：API 模糊测试（需后端运行中）
```bash
node adversarial/fuzzing/api-fuzzer.js
```
向所有 API 端点发送随机/畸形请求，统计 500 错误率。

### Step 3：混沌场景测试
```bash
node adversarial/chaos/chaos-scenarios.js
```
模拟道路图节点删除、边权突变、并发请求，验证系统稳定性。

## 报告解读
- **RED**：严重缺陷（崩溃/无限循环/SQL注入面）— 必须修复
- **YELLOW**：性能退化（超时/内存泄漏）— 建议修复
- **GREEN**：通过所有用例

每次运行结果保存到 `adversarial/reports/report-<timestamp>.json`。
