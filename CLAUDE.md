# Our Tour System — Claude Code 配置

## 项目简介
旅游系统课程设计。核心功能：景点推荐、路线规划（Dijkstra/A*）、日记管理（KMP/倒排索引）、美食推荐（TopK堆）。

## 目录结构
```
src/backend/     后端 Node.js/Express 服务，含自研算法
src/frontend/    前端 React/Vite 应用
agents/          AI Agent 定义（旅游规划、路线优化、冲突协调、日记助手）
skills/          Claude Code Skill 定义
mcp/             MCP 服务器（暴露景点数据与算法能力）
adversarial/     对抗式测试（红队用例、模糊测试、混沌场景）
tests/           单元/集成/E2E 测试套件
```

## 启动命令
```bash
# 后端
cd src/backend && npm install && npm run dev

# 前端
cd src/frontend && npm install && npm run dev

# MCP 服务器
cd mcp/servers/tour-data-server && npm install && node index.js

# 运行测试
npm test --prefix tests

# 对抗测试
node adversarial/red-team/route-attack-cases.js
node adversarial/fuzzing/api-fuzzer.js
```

## 自定义命令
- `/seed`          — 生成/验证种子数据（≥200景点, ≥200边, ≥10用户）
- `/algo-bench`    — 运行算法性能对比（TopK vs 全排序, Dijkstra vs A*）
- `/adversarial-run` — 执行全套对抗测试并输出报告

## 核心算法位置
| 算法 | 文件 |
|------|------|
| Dijkstra / 多点路径 | `src/backend/src/algorithms/dijkstra.js` |
| MinHeap / TopK | `src/backend/src/algorithms/heap.js` |
| KMP 全文检索 | `src/backend/src/algorithms/kmp.js` |
| Trie 前缀查询 | `src/backend/src/algorithms/trie.js` |

## 开发规范
- 算法函数必须有 JSDoc 注释说明时间复杂度
- 新增算法须同步在 `tests/unit/algorithms/` 补充对抗测试用例
- MCP 工具变更需更新 `mcp/config/mcp_config.json`
- Agent 提示词变更需在 `agents/*/definition.md` 中记录版本

## MCP 配置（本地开发）
将以下内容加入 `~/.claude/claude_desktop_config.json`：
```json
{
  "mcpServers": {
    "tour-data": {
      "command": "node",
      "args": ["mcp/servers/tour-data-server/index.js"],
      "cwd": "/path/to/our-tour-system-project"
    }
  }
}
```
