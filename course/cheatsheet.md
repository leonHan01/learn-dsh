# 速查

上课时把这一页钉在旁边。图的完整版在 [architecture.md](./architecture.md)。

## 本机命令

```sh
# 读教程
./site/serve.sh                          # http://127.0.0.1:8765/site/

# 产品（在 ../deepseek-harness）
pnpm dsh web
pnpm dsh --profile web --dump-config
pnpm dsh --profile headless "task"
pnpm dsh web --patch ./scratch-plugin/cordis.yml

# Cordis 教程（harness/tmp/cordis-tutorial）
node --import tsx ../../vendor/cordis/bin.js
```

## 六个 ctx 先认

| 键 | 包 | 干什么 |
|---|---|---|
| `sessions` | `dsh-session` | 仅追加日志 |
| `systemPrompt` | `dsh-system-prompt` | 段 + 工具 schema |
| `tools` | `dsh-tools` | 注册表 + 流水线 |
| `llm` | `dsh-llm` | 适配器注册表 |
| `agents` | `dsh-agent` | 句柄 / 工厂 |
| `agentLoop` | `dsh-agent-loop` | 默认可替换驱动器 |

扩展只依赖前五个里的接口，不要 import `ReactLoopAgent`。

## 三个入口

| 方法 | 队列 | 唤醒 |
|---|---|---|
| `followup` | next-turn | 是 |
| `steer` | next-step | 是 |
| `inject` | next-step | 否 |

## 事件域名

| 域 | 例子 | 活在哪 |
|---|---|---|
| 会话 / 持久 | `turn/*` `user/message` `assistant/*` `tool/*` | 日志 |
| Agent / 实时 | `agent/pre-step` `agent/request` `agent/status` | 进程内 |
| 能力 | `tools/pre-execute` `fs/*` | 某个 seam |

`tools/result` ≠ `tool/result`。前者实时观察，后者写入日志。

## surface

只有三种进 `deriveMessages()`：`user/message`、`assistant/message`、`tool/result`。

## 工具流水线

`pre-execute`（allow / deny / ask）→ `guard` → `execute` 环绕 → 主体 → `post-execute` → `finalizeContent` → `tools/result` → 循环写 `tool/result`。

权限挂 `pre-execute`。超时挂 `execute`。换给模型看的文本挂 `post-execute`。审计听 `tools/result`。

## 想加 X

| X | 挂哪 |
|---|---|
| 模型提供方 | `ctx.llm.registerAdapter` |
| 模型工具 | `ctx.tools.register` |
| 人类命令 | `ctx.commands` |
| 换 bash 后端 | 注册 `ctx.shell` |
| 按 agent 定制 | `agent.ctx` |
| 持久新事实 | 扩 `SessionEventMap` |

## 循环三层

步骤 = 一次模型请求 + 其工具。轮次 = 排空一次已接纳输入。Round = 策略层（Goal / Ralph）。

## 对照日志

短文本：[text-turn/session.jsonl](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/examples/jsonrpc-agent/tests/snapshots/text-turn/session.jsonl)  
带 bash：[bash-tool/session.jsonl](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/examples/jsonrpc-agent/tests/snapshots/bash-tool/session.jsonl)
