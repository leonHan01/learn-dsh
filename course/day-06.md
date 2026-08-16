# 第 6 天 · llm、agent、agent-loop

**对应阶段：** 3 下
**时长：** 6 小时
**今天结束时你能：** 说明为什么 UI 只依赖 `ctx.agents`；对着 `agent.ts` / `tool-calls.ts` 走完一步 step；给一份 jsonl 写伪代码。

这是主干最重的一天。上午读接口，下午读驱动器，不要反过来。

## 时间表

| 时段 | 内容 |
|---|---|
| 0:00–1:30 | `packages/llm/llm`：消息、chunk、适配器 |
| 1:30–3:00 | `dsh-agent`：句柄、inbox、工厂 |
| 3:00–5:30 | `dsh-agent-loop`：`index.ts` → `agent.ts` → `tool-calls.ts` |
| 5:30–6:00 | 伪代码作业 + 过关 |

---

## 一、llm：循环和适配器之间的词汇

对照：

- [`packages/llm/README.zh.md`](../../deepseek-harness/packages/llm/README.zh.md)
- [`docs/subsystems/llm-streaming.zh.md`](../../deepseek-harness/docs/subsystems/llm-streaming.zh.md)
- [`packages/llm/llm/src/types.ts`](../../deepseek-harness/packages/llm/llm/src/types.ts)
- [`packages/llm/llm/src/message.ts`](../../deepseek-harness/packages/llm/llm/src/message.ts)
- [`packages/llm/llm/src/index.ts`](../../deepseek-harness/packages/llm/llm/src/index.ts)

`dsh-llm` 同时是 Service Definition（`ctx.llm` 适配器注册表）和一批被所有人 import 的类型。DeepSeek 适配器在兄弟包 `llm-deepseek`，今天不要深挖它。

盯住三组类型：

### Message / ContentBlock

用户、助手、工具结果最后都是带 `role` 的 `Message`。内容是块列表：`text`、`tool-call`、`tool-result`、图片等。`createUserMessage` 这类工厂保证品牌化 `MessageId` 和冻结。

会话日志的 surface 投影出来的就是这些 `Message`。loop 不会另造一套「给模型的 DTO」——`deriveMessages()` 的返回值直接进请求。

### StreamChunk

适配器往上推的增量：`block-start`、`text-delta` / `tool-call-delta`、`block-end`、`usage`、`finish`。loop 用 `BlockAssembler` 收成完整 assistant 消息，同时把每个 chunk 记成 `assistant/chunk`。

jsonl 里你已经见过这个形状。

### LlmAdapter

提供方实现「给定 messages + tools + config，产出 chunk 流」。注册：`ctx.llm.registerAdapter(names, adapter)`。`agent/request` waterfall 可以在调用前改 config（换模型、补 maxTokens）。`llm/stream` waterfall 包在实际流外面。

今天只要知道：loop 通过 `ctx.llm` 说话，从不 import `llm-deepseek`。换提供方 = 换注册，loop 不动。

---

## 二、dsh-agent：所有人面向的句柄

对照：

- [`packages/core/agent/README.zh.md`](../../deepseek-harness/packages/core/agent/README.zh.md)
- [`docs/subsystems/core.zh.md`](../../deepseek-harness/docs/subsystems/core.zh.md) 的 Agent 部分
- [`src/types.ts`](../../deepseek-harness/packages/core/agent/src/types.ts)
- [`src/inbox.ts`](../../deepseek-harness/packages/core/agent/src/inbox.ts)
- [`src/index.ts`](../../deepseek-harness/packages/core/agent/src/index.ts)

**扩展插件依赖这个包，不依赖 `dsh-agent-loop`。** 循环可替换的原因就在这里：UI、ACP、钩子只看见 `Agent` 接口和 `ctx.agents`。

### Agent 上你真正会用的方法

| 方法 | 作用 |
|---|---|
| `followup(msg)` | 下一条用户输入，唤醒 |
| `steer(msg)` | 本轮下一步输入，唤醒 |
| `inject(msg)` | 下一步输入，不唤醒 |
| `cancel()` | 取消当前工作 |
| `ctx` | 该 agent 的 scope 上下文 |

底层是统一的 `send()`，三个方法是固定别名。inbox 状态机在 `Inbox` 类里，并且**从会话日志的 `agent/inbox/spliced` 重建**。重启之后待处理队列还在，因为 splice 是持久事件。

`claim(target, turn)` 是 loop 的内部操作，不是插件扩展点：纯删除 next-step 全部，若 `target === 'next-turn'` 再取一条 next-turn。每条发出 `claimed`。

### 注册表与工厂

- `ctx.agents.register` / `get` / `list` / `roots`
- `ctx.agents.setFactory(factory)`：循环启动时注册自己
- `ctx.agents.create(...)` / `resume(...)`：消费方走这里，不 new 驱动器

创建是事务：构造私有 session + agent + scope → 等 setup（只注册）→ 进入两个注册表 → 宣告 `session/created`、`agent/created` → `agent/session-start` → 才启动驱动器。失败则回滚。

`AgentHandle = { agent, dispose() }`。只有持有 handle 的消费方能 teardown。`get()` 返回裸 `Agent`，观察者不能 dispose。

`CreateAgentOptions.setup(agentCtx)`：scope 和 agent 对象已在，尚未发布。**setup 里调用 followup 是协议错误。**

### 发起方作用域

`withInitiator(agent, fn)` 用 AsyncLocalStorage 记住「当前这段异步工作是谁发起的」。子驱动器跑完，父 continuation 立刻拿回父 agent。这是进程内事实，出了进程边界必须以显式字段传递。今天知道有这回事，读 loop 源码时碰到 `currentInitiator` 不会慌。

---

## 三、dsh-agent-loop：仓库里唯一的具体循环

对照：

- [`packages/core/agent-loop/README.zh.md`](../../deepseek-harness/packages/core/agent-loop/README.zh.md)
- [`src/index.ts`](../../deepseek-harness/packages/core/agent-loop/src/index.ts)（工厂、配置创建）
- [`src/agent.ts`](../../deepseek-harness/packages/core/agent-loop/src/agent.ts)（`ReactLoopAgent`）
- [`src/tool-calls.ts`](../../deepseek-harness/packages/core/agent-loop/src/tool-calls.ts)

包根不导出驱动器内部。没有 `./src/*` 逃逸路径。外面不能 `new ReactLoopAgent`。

注入恰好 5 个服务：`agents`、`sessions`、`llm`、`tools`、`systemPrompt`。

### 先读 `agent.ts` 的骨架

文件开头的 `Phase` 就是驱动器状态：

```ts
type Phase =
  | { kind: 'idle'; lastTurn: number }
  | { kind: 'maintenance'; abort; lastTurn; wakeRequested }
  | { kind: 'running'; abort; turn; step; wakeRequested }
```

读文件时按这个清单搜函数（名字以源码为准，若重构以「做这件事的函数」为准）：

1. 被 inbox 唤醒之后，如何打开 `turn/start`
2. 如何 `inbox.claim`
3. 如何发 `agent/pre-step`，如何处理 reject
4. 如何 `assemble` + `deriveMessages` + `agent/request` + `llm/stream`
5. 如何把 chunk 写成 `assistant/chunk`，再写成 `assistant/message`
6. 如何把 tool-call 交给 `executeToolCalls`
7. 何时 `step/end`，何时继续下一步，何时 `turn-stopping` / `turn/end`

读的时候对照第 3 天你自己画的图。对不上就停下来，是图错了还是你看漏了分支（reject、request-error、max-tokens）。

`agent/request-error` 是溢出恢复入口：compaction 挂在这里和第 9 天会讲的 `pre-step` 压力检查，不进 loop 本体。这是「新行为不改 loop」的活证据。

### 再读 `tool-calls.ts`

模型一条 assistant 消息里可以有多个 tool-call。文件负责：

- 用 `ctx.tools.executionMode` 分成可并行 / 必须串行
- 滚动池，默认 `maxParallelToolCalls = 10`（可配置）
- 每个调用先写 `tool/call`，再 `ctx.tools.execute`
- **按模型给出的顺序**写 `tool/result`，即使执行完成顺序不同
- 某个工具调用 `concludeTurn()` 后，后续调用仍可能被守卫挡住，本 step 结束后停

并行安全由工具自己的 `isConcurrencySafe` 声明，loop 不猜。

### `index.ts` 里和驱动器无关、但要知道的

配置创建的 agent：`agents: [{ id, provider, model, cwd, resumeSessionId }]`。循环 fiber 拥有它们（丢掉 handle）。`id` 是稳定 label，真正的 session id 通常是 `${label}-session-<uuid>`，除非你给了确切 `sessionId`。

---

## 四、实验：为第一步写伪代码

对着 jsonl 第一个 step（约 seq 1–16）写一份伪代码，贴进作业。模板：

```
wakeup because next-turn has a user message
turn/start turn=1
claim next-step (empty) + 1 next-turn message
pre-step → enter([userMessage])
step/start turn=1 step=1
append user/message
assemble prompt + tool schemas
log request/header
agent/request → llm/stream
  append assistant/chunk (block-start, tool-call-delta, block-end, usage, finish)
append assistant/message (tool-call cordis_define)  surface
append tool/call
tools.execute(cordis_define) → allow → body → result
append tool/result  surface
step/end
tools owe another request → claim next-step (empty) → step 2
```

然后打开 `agent.ts`，在对应行旁边用注释标「这是伪代码第 N 步」。不要改逻辑，标完就丢掉（或只留在你的笔记里）。

辅助阅读：`tests/loop.spec.ts`、`tests/tool-calls.spec.ts`、`tests/inbox` 相关用例。测试描述的是行为，比注释更准。

---

## 五、过关测验

1. 为什么 UI / ACP 面向 `ctx.agents` 编程，而不是 import `ReactLoopAgent`？
2. `deriveMessages()` 的返回值还要不要再翻译成适配器格式？谁负责翻译？
3. 一次并行工具调用如何保证 `tool/result` 顺序？
4. setup 里调用 `followup` 为什么不行？
5. `inject` 之后 agent 仍是 idle。下一次模型什么时候能看见这段上下文？
6. 循环依赖哪 5 个服务？少了 `systemPrompt` 会怎样？

## 六、作业

写 [`learn/06-agent-loop.md`](../06-agent-loop.md)。必须包含：

- 一步 step 的伪代码
- `Agent` vs `ReactLoopAgent` 各三句
- 你在 `agent.ts` 里找到的「打开 turn / 领取 / pre-step / 调模型 / 调工具」大概行号

---

### 参考答案

1. `ReactLoopAgent` 是默认可替换实现。UI / ACP 依赖 `dsh-agent` 的接口和 `ctx.agents` 工厂，换 loop 不用改它们。
2. 不用再译一层消息。适配器消耗的就是这些 `Message`；适配器只负责和具体厂商协议之间的翻译。
3. 执行可以乱序完成，写 `tool/result` 按模型给出的调用顺序。`tool-calls.ts` 保序。
4. setup 时 agent 尚未发布，`session-start` 没发。驱动未启动的 agent 是协议错误，创建事务也会因此变脏。
5. 下一次被 `followup` / `steer` 唤醒并领取 next-step 时，inject 的消息进入 `pre-step`，通过后记为 `user/message`。
6. `agents`、`sessions`、`llm`、`tools`、`systemPrompt`。缺 `systemPrompt` 则 loop 自己 PENDING，产品启动失败。

## 七、明日预告

从 `dsh web` 到这棵树是怎么叠出来的。profile、bundle、patch、`--dump-config`。主干读完后，启动层会突然变得好懂。
