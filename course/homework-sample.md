# 作业范例（第 3 天的厚度）

这不是你的作业文件。仓库根的 `03-架构.md` 仍是空模板，请用自己的话填。  
对照这一页看「写多厚算过关」：四节都有内容，术语用官方词，入口写成 `path:symbol`。

---

## 它是什么

运行中的 dsh 是一棵 Cordis 插件树，不是「内核 + 插件」。循环、日志、工具、模型适配器都是插件，卸载就撤销注册。

产品表面（Web / ACP / SDK）只拿 `Agent` 句柄：输入变成 `followup` / `steer` / `cancel`，输出听 `session/event`。

## 关键对象与事件

- **步骤**：一次模型请求 + 它引发的工具执行。
- **轮次**：对已接纳输入的一次排空。
- **Round**：goal / Ralph 的策略层迭代，不是用户随口问的那一句。
- **surface**：只有 `user/message`、`assistant/message`、`tool/result` 进 `deriveMessages()`。
- **inbox**：`followup` → next-turn 并唤醒；`steer` → next-step 并唤醒；`inject` → next-step，不唤醒。
- **seam**：Definition + Provider + Consumer。加一个函数通常不够。

## 源码入口（path:symbol）

- `packages/core/agent/src/index.ts`：`ctx.agents`（create / resume / get）
- `packages/core/agent-loop/src/agent.ts`：`ReactLoopAgent`（默认可替换驱动器）
- `packages/core/session`：`deriveMessages`、`SessionEvent`
- `packages/core/tools`：`execute` 流水线（`pre-execute` → … → `tools/result`）

## 我仍然不清楚的问题

preset 的 `isolate` realm 第 3 天先记下，第 7 / 10 天再看。scope 先当扁平两层：全局 vs 这一个 agent。
