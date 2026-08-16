# 第 3 天 · 架构地图

**对应阶段：** 2
**时长：** 4–5 小时
**今天结束时你能：** 默画 turn 流程、分清三类事件、用官方术语说出「想加 X 挂哪」。几乎不写代码。

## 时间表

| 时段 | 内容 |
|---|---|
| 0:00–1:30 | 精读 architecture.zh.md |
| 1:30–2:30 | 精读 glossary.zh.md，建立词汇 |
| 2:30–3:30 | lifecycle 时序图 + tool pipeline |
| 3:30–4:30 | 扫 graph-atlas / seams / packages 表 |
| 4:30–5:00 | 自己重画两张图 + 过关 |

**按这个顺序读，不要并行扫。** 读完一篇再打开下一篇。

---

## 一、一句话架构

dsh 是一棵由 Cordis 挂起来的插件树。没有特权内核。新产品行为 = 在已有扩展点上再挂一个插件。

六件事（学习路径开头那张表）今天要能用自己的话讲出来：

1. 一切皆插件
2. 运行中的 dsh 是 profile 叠出来的插件树
3. 会话日志是真源；模型可见 ⟺ 已记录
4. 能力按 seam 替换（Definition + Provider + Consumer）
5. 步骤 ⊂ 轮次 ⊂ Round
6. 新行为挂扩展点，不改 `agent-loop`

对照：[`docs/architecture.zh.md`](../../deepseek-harness/docs/architecture.zh.md) **整篇**。读的时候在纸上（或笔记里）抄文末那张「新行为归属位置」表，不要只看。

---

## 二、循环三层，不要混

glossary 把这三个词钉死了。后面文档默认你会用。

```
Round          策略层的一次迭代（Goal Round / Ralph Round）
  └─ 轮次      会话里一次对已接纳输入的排空
       └─ 步骤  一次模型请求 + 它引发的工具执行
```

例子：

- 用户打一句「帮我修测试」→ 一个**轮次**。轮次里模型先读文件、再改文件、再跑测试 → 三个**步骤**。
- `/goal` 驱动同一个会话继续干活 → 每个被接纳的续行是一个 **Goal Round**，它会具体化成一个轮次。同会话里你随口问一句「现在几点」不消耗 Goal Round。
- Ralph 每次开一个**全新**子会话，那是 **Ralph Round**。子会话不接收父对话种子。

「一轮」这种口语今天起禁止出现在笔记里。写轮次、步骤或 Round。

---

## 三、必须能默画的 turn 流程

```
用户 followup(content)
        │
        ▼
  inbox: next-turn 追加，唤醒驱动器
        │
        ▼
  turn/start
        │
        ├─ 领取：next-step 全部 + next-turn 一条
        ├─ agent/pre-step  waterfall  → reject | enter(messages)
        │
        ├─ 若 reject 或首次 enter 被改成空
        │     关闭一个不含步骤的轮次（日志仍记录这次尝试）
        │
        └─ 否则
              step/start
              把 enter 的消息记为 user/message
              deriveMessages() 得到模型历史
              system-prompt/assemble
              agent/request → llm/stream
                    assistant/chunk* → assistant/message
              若有 tool-call：
                    tool/call
                    tools/pre-execute → execute → post-execute
                    tool/result
              step/end
              工具还欠一次请求，或 next-step 又来了 → 下一 step
              否则 agent/turn-stopping（serial）
  turn/end
  status = idle
```

对照时序图：[`docs/agent-lifecycle.zh.md`](../../deepseek-harness/docs/agent-lifecycle.zh.md)

### 三个入口，两个 inbox

`Agent` 对输入只有一个底层原语 `send()`，三个别名是固定预设：

| 方法 | 进哪个 inbox | 唤醒驱动器？ | 典型来源 |
|---|---|---|---|
| `followup()` | `next-turn` | 是 | 用户下一条、UI 发送 |
| `steer()` | `next-step` | 是 | 中途改道、审批后继续 |
| `inject()` | `next-step` | **否** | 插件塞上下文（AGENTS.md 变更、工具附带说明） |

`inject()` 会一直躺在 inbox 里，直到某条 `followup` / `steer` 把驱动器叫醒。领取发生时，它会和那条唤醒消息一起进入 `pre-step`。

领取是一次纯删除 splice：消息从 inbox 消失，发出 `agent/inbox/claimed`。之后 `pre-step` 才能 reject。所以：**拒绝不会把消息放回 inbox**。日志仍会留下一个空轮次，证明「试过了」。

为什么？模型可见 ⟺ 已记录。一次被策略挡掉的尝试也是历史的一部分。

---

## 四、三类事件，选错域是最常见的设计错误

| 域 | 例子 | 活在哪 | 何时用 |
|---|---|---|---|
| 会话事件 | `turn/*` `step/*` `user/message` `assistant/*` `tool/*` | 仅追加日志，重载后还在 | 事实必须持久 |
| Agent 事件 | `agent/pre-step` `agent/request` `agent/status` `agent/inbox/*` | 进程内实时 | 观察或拦截进行中的工作 |
| 能力事件 | `tools/*` `fs/*` `telemetry/*` | 某个 seam | 给该能力挂策略 / 适配器 |

waterfall（必须 `next()`）：

- `agent/pre-step`
- `agent/request`
- `llm/stream`
- `tools/pre-execute`、`tools/execute`、`tools/post-execute`
- `system-prompt/assemble`

serial（没有 `next()`）：`agent/turn-stopping`

名字陷阱，今天画星号：

- `tools/result` = 注册表实时观察
- `tool/result` = 会话日志里的持久结果
- `tools/pre-execute` = 实时门禁
- `tool/call` = 持久「即将执行」记录

生产方 / 消费方矩阵在需要查「谁听了这个事件」时用：[`event-producer-consumer.zh.md`](../../deepseek-harness/docs/event-producer-consumer.zh.md)。今天当字典，不通读。

---

## 五、工具流水线（循环外面）

对照：[`docs/tool-execution-pipeline.zh.md`](../../deepseek-harness/docs/tool-execution-pipeline.zh.md)

模型在 assistant 消息里给出 tool-call 之后，循环**不**自己执行工具。它把调用交给 `ctx.tools.execute`。策略全部挂在注册表事件上，所以换 loop 不用重写权限。

```
tool/call 已写入日志
    → tools/pre-execute     允许 / 拒绝 / 询问（审批）
    → ctx.tools.guard()     单调最终拒绝，后面不能翻案
    → tools/execute         环绕：超时、重试、指标（只能换 signal）
    → 工具 execute() 主体
    → tools/post-execute    换内容 / 换值 / 阻止 / 附加上下文
    → finalizeContent       工具自己的最后一次只改 content
    → tools/result          冻结结果，只观察
    → tool/result           循环写入会话日志
```

今天记住分工即可：

- 权限、沙箱策略 → `pre-execute` 或 `guard`
- 超时 / 重试 → `execute` 包装层
- 改写给模型看的结果 → `post-execute`
- 指标 / 审计 → `tools/result`（不要在这里改结果）

---

## 六、Capability seam

一个 **seam** 是一项可替换能力，三种角色缺一不可：

```
Service Definition    声明 ctx.<key> 和词汇（抽象类或注册表，不是 TS interface）
Service Provider      实现它
Consumer              使用它（常常是面向模型的工具）
```

规范范例 `packages/shell`：

```
dsh-shell         Definition    ctx.shell
dsh-bash-local    Provider      本地 subprocess
dsh-bash-sandbox  Provider      先套 sandbox 再执行
dsh-tool-bash     Consumer      模型看到的 bash 工具
```

「只加一个工具函数」通常不够：模型怎么调、谁真正执行、执行世界能不能换，是三件独立演进的事。filesystem 和 subprocess 共享执行世界——把它们指到远程沙箱，Bash / PTY / LSP 一起搬走，不必为每个工具写一份 fork。

扫一眼即可：[`capability-seams.zh.md`](../../deepseek-harness/docs/capability-seams.zh.md)、[`packages/README.zh.md`](../../deepseek-harness/packages/README.zh.md)。

扩展插件依赖 Definition，绝不依赖某个 Provider。UI / 钩子 / 工具依赖 `dsh-agent`，不依赖 `dsh-agent-loop`。

---

## 七、想加 X，挂哪

从 architecture 文末那张表改写成自己的话，作业里要交。先记最常用的几行：

| 想做 | 挂哪 |
|---|---|
| 新模型提供方 | `ctx.llm` 注册适配器 |
| 新面向模型的能力 | `ctx.tools.register` |
| 某个会话不同的工具集 | agent preset + `isolate` |
| 新 shell 后端 | 注册 `ctx.shell` |
| 人类斜杠命令 | `ctx.commands`（不经模型） |
| 拦截请求 / 工具 / 轮次 | `agent/*` 或 `tools/*` |
| 给模型塞持久上下文 | `agent.inject()`，且必须能从日志重建 |
| 新的持久事实 | 扩 `SessionEventMap` |
| 按 agent 定制 | 走 `agent.ctx`，不要改全局 |

图目录：[`graph-atlas.zh.md`](../../deepseek-harness/docs/graph-atlas.zh.md)。知道有哪些图，用时再点。

`module-graph.md` 很大。今天只确认一件事：`agent-loop` 依赖恰好 5 个接口服务——`agents`、`sessions`、`llm`、`tools`、`systemPrompt`。

---

## 八、对照阅读清单（严格按序）

1. [`architecture.zh.md`](../../deepseek-harness/docs/architecture.zh.md)
2. [`glossary.zh.md`](../../deepseek-harness/docs/glossary.zh.md)
3. [`agent-lifecycle.zh.md`](../../deepseek-harness/docs/agent-lifecycle.zh.md)
4. [`tool-execution-pipeline.zh.md`](../../deepseek-harness/docs/tool-execution-pipeline.zh.md)
5. [`graph-atlas.zh.md`](../../deepseek-harness/docs/graph-atlas.zh.md)（当目录）
6. [`capability-seams.zh.md`](../../deepseek-harness/docs/capability-seams.zh.md)（扫）
7. [`packages/README.zh.md`](../../deepseek-harness/packages/README.zh.md)

## 九、过关测验

1. `followup` / `steer` / `inject` 分别进哪个 inbox？谁唤醒驱动器？
2. 为什么第一次 `pre-step` 被拒绝，仍然会留下一个不含步骤的持久轮次？
3. seam 的三种角色是什么？为什么「只加一个工具函数」通常不够？
4. `tools/result` 和 `tool/result` 的区别？
5. 给模型看的新输入，为什么必须同时新增一种会话事件？
6. 步骤、轮次、Round 各举一个不是另外两个的例子。

## 十、作业

写 [`learn/03-架构.md`](../03-架构.md)：

1. 自己重画 turn 流程图（不要贴官方 mermaid）。
2. 自己重画工具流水线（5 个阶段就够）。
3. 改写「想加 X 挂哪」表，至少 8 行，用自己的动词。

不会画就不要进第 4 天。主干源码是按这张图组织的。

---

### 参考答案

1. `followup` → next-turn，唤醒。`steer` → next-step，唤醒。`inject` → next-step，不唤醒。
2. 领取已经把消息从 inbox 删掉；拒绝不会放回。空轮次证明「试过了」，满足模型可见 ⟺ 已记录。
3. Definition / Provider / Consumer。工具函数只是 Consumer；谁执行、执行世界能否替换是另两个角色。
4. `tools/result` 是注册表实时观察；`tool/result` 是 loop 写入会话日志的持久结果。
5. 抵达模型的一切必须能从日志重建。没有对应事件，重载、fork、不变式都会丢它。
6. 步骤：一次「读文件」模型请求。轮次：用户一句「修测试」排空到 idle。Round：goal 接纳的下一次续行，或一次全新 Ralph 子会话。

## 十一、明日预告

开始读 `packages/core`。先 `scope` 再 `session`。会碰到 surface、`deriveMessages`、品牌化 id。带上今天的图。
