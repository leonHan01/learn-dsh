# 易错

课里反复出现的坑。对照 [walkthrough](./walkthrough.md) 看一次请求就更清楚。

## 把循环当成内核

UI、ACP、你的插件都面向 `ctx.agents`。`ReactLoopAgent` 是默认可替换实现。`import` 它 = 把产品焊死在一个驱动器上。

## 忘了 `next()`

waterfall 观察者必须 `next()`。日志插件忘了，整条链静默消失。只有你拥有最终决定（deny、换结果）时才故意不调用。

## 策略写进 `execute`

权限、沙箱拒绝、审批属于 `tools/pre-execute` 或 `guard`。写进 `tool-bash.execute` 后，换提供方策略就丢了。

## 以为 patch 会 deep-merge

按 `id` 替换是整份 `config`。改一个字段必须重述想保留的字段。漏写 = 丢掉 bundle 默认值。

## 以为子 agent 看得见父工具

scope 不沿 lineage 继承。`parentSession` / `delegationDepth` 只是数据。父 `agent.ctx` 上的注册，子看不见。

## 混用 `tools/result` 和 `tool/result`

`tools/result`：注册表实时、不可改。  
`tool/result`：循环写入日志、进 surface。  
听错域会以为「日志里没有工具结果」或「UI 收不到实时事件」。

## 模型看见了，日志里没有

违反 **模型可见 ⟺ 已记录**。新输入必须能从 `SessionEvent` 重建，通常意味着扩 `SessionEventMap`，而不是在内存里塞一列 messages。

## `inject` 之后干等模型

`inject` 不唤醒。要等下一次 `followup` / `steer`。空闲的 agent 会一直 idle。

## setup 里 `followup`

setup 时 agent 还没发布。只注册。驱动是 `session-start` 之后的事。

## 把 `reasoning-chunks` 当成 surface

jsonl 里的 `assistant/chunk`、`reasoning-chunks`、`text-chunks`、`tool-call-chunks` 是流式或压缩块。模型历史只有 `user/message`、`assistant/message`、`tool/result`。

## 第一份日志就打开 advanced-toolchain

那条 `request/header` 是整份 Code Mode SDK。先 [text-turn](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/examples/jsonrpc-agent/tests/snapshots/text-turn/session.jsonl)，再 [bash-tool](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/examples/jsonrpc-agent/tests/snapshots/bash-tool/session.jsonl)。

## `--patch` 用了相对路径

产品 loader 按 profile 目录解析模块。练习插件的 `name` 必须是绝对路径。用 `python3 -c "import os; print(os.path.abspath(...))"`。

## 非零退出当成异常

shell 的非零退出、超时杀死是 **resolve 出来的值**。reject 只留给「没 shell、工作目录不能用」这类基础设施失败。模型要看见 `[exit code: N]`。

## 步骤、轮次、Round 混着说

「一轮」禁止出现在笔记里。Goal Round 不是用户随口问的那一句。Ralph Round 是全新子会话。

## 从 `packages/client` 学循环

client 只是适配器：外部输入 → `followup`；`session/event` → 卡片。循环在 `agent-loop`。

## 把 dsh 当成「另一个 Pi」或「开源 Codex」

Pi 是最小核心；Codex 是一份 Rust core 多表面。dsh 是 **Cordis 插件树 + 可替换 loop + 日志不变量**。对照 [compare.md](./compare.md)，不要用 `dsh-llm-pi-ai` 去理解 Pi harness。
