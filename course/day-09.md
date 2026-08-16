# 第 9 天 · 会话数据平面（进阶）

**对应阶段：** 6
**时长：** 5 小时
**今天结束时你能：** 说出一次对话在内存、磁盘、模型窗口里分别长什么样；解释 compaction 改的是 surface 不是原始日志。

第 4 天的 session 是内存真源。今天是它周围的一圈：如何落盘、如何压缩、如何给模型额外上下文、如何检索。

## 时间表

| 时段 | 内容 |
|---|---|
| 0:00–1:30 | 持久化 seam |
| 1:30–3:00 | compaction + 对照 snapshot |
| 3:00–4:00 | context / projection / title / query |
| 4:00–5:00 | 过关 + 笔记 |

---

## 一、三份拷贝，一个真源

```
磁盘（JSONL 或 SQLite）     崩溃后还在
        ▲ flush / load
内存 Session.events         真源（仅追加）
        │ surface 投影
deriveMessages()            模型此刻看见的窗口
        │
request/header              某一次请求的冻结快照
```

改「模型看见什么」有两条合法路：

1. 再 `append` 一条 surface 事件（普通对话）
2. 用 `surfaceOp: replace` 盖住一段旧 surface（compaction）

没有第三条：「偷偷改内存里的 messages 数组」。那会打破「模型可见 ⟺ 已记录」。

---

## 二、持久化 seam

对照：[`docs/subsystems/persistence.zh.md`](../../deepseek-harness/docs/subsystems/persistence.zh.md)

`dsh-session` 不管盘。`ctx.sessionPersistence` 才是 seam：

- Definition：`dsh-session-persistence`
- Provider：`session-persistence-jsonl`、`session-persistence-sqlite`
- 没有平行的「持久化事件类型」——后端读写的就是 `SessionEvent`

### flush

`session/event` 是同步通知。持久化插件把事件拷进每会话控制器，**不阻塞** append。攒一个固定时间窗口再写一批。`session/flush` 取消等待并排空，loop 在开下一轮之前用它当检查点。

写入失败：事件留着，自动重试暂停；显式 flush 立即再试，通过 `agent/error` 报告。失败不会写成「轮次已经结束后的会话事件」。

### 崩溃恢复

重新加载时若看到 `turn/start` 没有 `turn/end`：**不截断**。长轮次可能已经写下大量步骤和工具输出。后端追加一条合成的

```
turn/end { reason: { kind: 'interrupted' } }
```

`interrupted` 是唯一不由循环发出的 `TurnEndReason`。

这条修复只用于**冷**会话。活跃 id 的 `load` 若轮次仍开着，直接拒绝，不加合成边界。HMR 接管活跃前缀，不会关掉正在进行的轮次。

`inspect(id)` 造一个不可变逻辑 Session，不发布、不写修复。`prepare(id)` 预留并提交修复，给 resume 用。

JSONL：每会话一个 transcript 路径（`locate` 可能指向尚未落地的文件）。SQLite：多会话共享库，`locate` 返回 `undefined`。

`SESSION_FORMAT_VERSION` 仍是 `0`。结构变了才 bump；加一种普通事件靠 `ignorable: true`，不 bump。

---

## 三、compaction：改窗口，不改考古记录

对照：[`docs/subsystems/compaction.zh.md`](../../deepseek-harness/docs/subsystems/compaction.zh.md)、lifecycle 文档后半。

压缩是 seam（`ctx.compaction`），不是 loop 分支。挂载点：

| 触发 | 事件 | 做什么 |
|---|---|---|
| 窗口有压力 | serial `agent/pre-step` | 在派生请求前先压缩 |
| 上下文溢出 | `agent/request-error` | 标准溢出恢复 |
| 人类 / 模型手动 | 同一套 `ctx.compaction` 服务 | 命令或工具 |

流程（概念）：先可选地剪工具结果，再做摘要。恢复发生在**失败步骤结束之后、失败轮次结束之前**。只有剪枝或摘要真正推进了 surface replacement generation，才会开一个全新重试轮次；否则仍以原始请求错误为准。

关键事实：原始 `session.events` 仍在。被替换的旧 `user/message` / `assistant/message` / `tool/result` 还在日志里，只是 surface 不再投影它们。所以：

- 模型窗口变短
- UI 若要给人类看完整 transcript，应使用 **append-origin** 事件，而不是当前 surface（`isAppendSurfaceEvent`，第 4 天 `surface.ts`）
- 回放某次历史请求，要按当时的 surface generation，不是按现在的窗口

对照 snapshot：[`examples/headless-agent/tests/snapshots/compaction-recovery/`](../../deepseek-harness/examples/headless-agent/tests/snapshots/compaction-recovery/)。用第 4 天的脚本列出类型，找出 `surfaceOp` 不是 `append` 的事件。

---

## 四、周围一圈（按需深，但都要知道存在）

| 主题 | 文档 | 一句话 |
|---|---|---|
| 请求上下文 | [`packages/context/README.md`](../../deepseek-harness/packages/context/README.md) | workspace 指令、时间等动态上下文；经 `systemPrompt.context`，不是 section |
| 投影 | [session-projection.zh.md](../../deepseek-harness/docs/subsystems/session-projection.zh.md) | 从日志折出只读切面（给 UI / 查询），纯函数定义 |
| 标题 | [session-title.zh.md](../../deepseek-harness/docs/subsystems/session-title.zh.md) | 你在 jsonl 里见过的 `session/title`；异步提供方，引用源消息 seq |
| 检索 | [session-query.zh.md](../../deepseek-harness/docs/subsystems/session-query.zh.md) | 有界精确读取、关系、全文；模型侧有 `session_query` 类工具 |
| token 计量 | [token-meter.zh.md](../../deepseek-harness/docs/subsystems/token-meter.zh.md) | 按已消费日志修订号回放度量，不靠「现在窗口有多长」信口估计 |

context 插件写入的 runtime-context 会成为模型历史里带来源的快照。关掉 `includeRuntimeContext` 或 `suppressRuntimeContext()` 会丢掉它们，包括 waterfall 监听器后来加的。策略服务本身还在。

---

## 五、过关测验

1. JSONL 和 SQLite 后端各自承担什么？崩溃恢复靠哪条路径？
2. 新增一种模型可见输入，为什么必须同时扩 `SessionEventMap`？
3. compaction 改的是原始日志，还是 surface？人类 transcript 该读哪一种？
4. `interrupted` 为什么不能由 loop 在活着的时候发出？
5. `session/event` 为什么不能 await 磁盘写入？
6. 手动压缩和自动溢出恢复是否走同一服务？

## 六、作业

写 [`learn/09-会话数据平面.md`](../09-会话数据平面.md)。画「磁盘 / 内存 / surface / 某次 request/header」四层，并标注 compaction 作用在哪一层。

---

### 参考答案

1. JSONL：每会话一个 transcript 文件，`locate` 给路径。SQLite：多会话共享库。崩溃恢复：冷加载时若轮次未闭合，追加合成 `turn/end { interrupted }`，不截断。
2. 否则磁盘上的日志重建不出这次模型请求。
3. 改 surface（`replace`），原始事件还在。人类 transcript 读 append-origin 事件，不读当前（已被替换的）surface。
4. 活着的 loop 要么正常 `turn/end`，要么还在跑。`interrupted` 只描述「进程死了、日志敞着」这种冷事实。
5. append 是同步热路径。等盘会拖住模型流和工具。持久化异步批写，`flush` 才是检查点。
6. 是。同一 `ctx.compaction`。差别只是触发点：`pre-step` / `request-error` / 手动。

## 七、明日预告

四条「让 agent 继续干活」的机制：subagent、goal、Ralph、workflow。名字像，语义完全不是一回事。
