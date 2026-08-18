# 第 3 天 · 架构地图

**对应阶段：** 2  
**时长：** 3–4 小时  
**今天结束时你能：** 默画 turn 流程、分清三类事件、用官方术语说出「想加 X 挂哪」。几乎不写代码。

课用图在 **[architecture.md](./architecture.md)**。先把图画进脑子，再读官方长文。

## 时间表

| 时段 | 内容 |
|---|---|
| 0:00–1:00 | 精读 [architecture.md](./architecture.md) 全页 |
| 1:00–2:00 | [architecture.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/architecture.zh.md) 对照图 |
| 2:00–2:40 | 生命周期 + 工具流水线官方图 |
| 2:40–3:20 | 必记术语（不要通读 glossary） |
| 3:20–4:00 | 自己重画两张图 + 过关 |

---

## 一、先读图

按这个顺序过 [architecture.md](./architecture.md)：

1. 插件树怎么叠（§2）
2. 五个 `ctx` + `agent-loop`（§3）
3. turn / step 时序（§4）
4. 三类事件和名字陷阱（§5）
5. 日志 vs surface（§6）
6. 工具流水线（§7）
7. seam 三角（§8）
8. 「想加 X 挂哪」（§9）

六件事今天要能用自己的话讲（与 [00-学习路径](../00-学习路径.md) 同一张表）。

然后读官方 [architecture.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/architecture.zh.md) **整篇**，边读边在图上找对应框。再打开：

- [agent-lifecycle.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/agent-lifecycle.zh.md)
- [tool-execution-pipeline.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/tool-execution-pipeline.zh.md)

[graph-atlas](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/graph-atlas.zh.md)、[capability-seams](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/capability-seams.zh.md)、[packages/README](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/packages/README.zh.md) 当目录扫一眼即可。

`module-graph.md` 很大。今天只确认：`agent-loop` 依赖恰好 5 个接口服务。

---

## 二、今天必记的词

不要通读 glossary。先把这些钉死，其余当字典查：[glossary.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/glossary.zh.md)。

| 词 | 意思 |
|---|---|
| 步骤 | 一次模型请求 + 它引发的工具执行 |
| 轮次 | 对已接纳输入的一次排空 |
| Round | 策略层迭代（Goal / Ralph），不是会话里每一轮 |
| scope | 全局 vs 按 agent；**不是**权限 |
| lineage | `parentSession` / `delegationDepth`；不影响可见性 |
| seam | Definition + Provider + Consumer |
| surface | 只有 `user/message`、`assistant/message`、`tool/result` |
| waterfall | 中间件；观察者必须 `next()` |
| `followup` / `steer` / `inject` | 见 architecture §4 表格 |

preset 的 scope 父链是后话（第 7 / 10 天）。今天先当扁平两层：全局 vs 这一个 agent。

禁止在笔记里写「一轮」这种口语。写轮次、步骤或 Round。

---

## 三、过关测验

1. `followup` / `steer` / `inject` 分别进哪个 inbox？谁唤醒驱动器？
2. 为什么第一次 `pre-step` 被拒绝，仍然会留下一个不含步骤的持久轮次？
3. seam 的三种角色是什么？为什么「只加一个工具函数」通常不够？
4. `tools/result` 和 `tool/result` 的区别？
5. 给模型看的新输入，为什么必须同时新增一种会话事件？
6. 步骤、轮次、Round 各举一个不是另外两个的例子。

## 四、作业

写 [03-架构.md](../03-架构.md)：

1. 自己重画 turn 流程图（不要贴官方 mermaid）。
2. 自己重画工具流水线（5 个阶段就够）。
3. 改写「想加 X 挂哪」至少 8 行，用自己的动词。

不会画就不要进第 4 天。

## 五、明日预告

`scope` 与 `session`。会读一份**短** jsonl，标出 surface。

<details>
<summary>参考答案</summary>

1. `followup` → next-turn，唤醒。`steer` → next-step，唤醒。`inject` → next-step，不唤醒。
2. 领取已经把消息从 inbox 删掉；拒绝不会放回。空轮次证明试过了。
3. Definition / Provider / Consumer。工具函数只是 Consumer。
4. `tools/result` 实时观察；`tool/result` 持久日志。
5. 抵达模型的一切必须能从日志重建。
6. 步骤：一次「读文件」请求。轮次：用户一句「修测试」排空到 idle。Round：goal 接纳的下一次续行。

</details>
