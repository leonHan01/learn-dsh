# 第 12 天 · 产品表面与工程文化（进阶）

**对应阶段：** 9 + 10
**时长：** 4–5 小时
**今天结束时你能：** 按要做的事选对表面入口；在改代码前知道会撞上哪些门禁。

不要把 `packages/client` 当阅读材料从头翻。

## 时间表

| 时段 | 内容 |
|---|---|
| 0:00–2:00 | 五条产品表面，只读你选的一条的入口文档 |
| 2:00–4:00 | AGENTS 约定、测试、防御模式、一篇 postmortem |
| 4:00–5:00 | 给自己列「如果我要改 X」清单 |

---

## 一、表面是适配器，不是第二套循环

所有表面都做同一件事：

```
把外部输入变成 agent.followup / steer / cancel
从 session/event 和 agent/* 渲染出去
```

循环、日志、工具流水线是共用的。选表面 = 选协议和 UI，不选另一套 agent 实现。

| 表面 | 何时读 | 入口 |
|---|---|---|
| Web GUI | 改 Chat、Host、卡片 | `packages/host`、`packages/client` 的组 README；[web-server](../../deepseek-harness/docs/subsystems/web-server.zh.md)、[client-modules](../../deepseek-harness/docs/subsystems/client-modules.zh.md)、[adding-a-conversation-node](../../deepseek-harness/docs/cookbook/adding-a-conversation-node.zh.md) |
| TypeScript SDK | 进程外驱动 | `packages/sdk` + `examples/jsonrpc-agent` |
| ACP | 编辑器 / 自动化客户端 | `packages/acp` + `examples/acp-agent` |
| Python SDK | 非 TS 宿主 | `python/README.zh.md`、[python-sdk 指南](../../deepseek-harness/docs/user/guide/python-sdk.zh.md) |
| Typert / API 网关 | 远程 RPC / BFF | [api-gateway](../../deepseek-harness/docs/api-gateway.zh.md)、[typert](../../deepseek-harness/docs/subsystems/typert.zh.md) |

### 今天只选一条，读它的 README + 一份 example

- 想看最薄的协议：`examples/jsonrpc-agent/README.zh.md` + `minimal.cordis.yml`
- 想看自动化：`examples/acp-agent/README.zh.md` 前半 + `cordis.yml`
- 想看浏览器：`packages/client/README.md` 和 `packages/host/README.md` 到「怎么注册一个节点」为止，**停**
- 想看 agent 改自己的树：`examples/web-cordis/`，`pnpm run demo:cordis`（要 key）

Web 插件往 Chat 塞业务行：注册 `ConversationNodeDefinition` + keyed renderer。不要在 Host 里解析 `assistant/chunk` 自己画一套，除非你在写新的节点类型。

ACP 是「协议驱动」范例：stdio 拥有 stdout，工厂创建/恢复 agent，协议请求映射为 `followup()` / `cancel()`。提示词请求返回入队回执，不等 `turn/end`。状态另发通知。teardown 走 `AgentHandle.dispose()`。

---

## 二、工程文化：改之前读

按这个顺序：

1. 根 [`AGENTS.md`](../../deepseek-harness/AGENTS.md) 的 Conventions
2. [`docs/defensive-patterns.zh.md`](../../deepseek-harness/docs/defensive-patterns.zh.md)（做生命周期 / 并发 / 子进程 / teardown 时必读）
3. [`docs/testing.zh.md`](../../deepseek-harness/docs/testing.zh.md)
4. [`docs/development.zh.md`](../../deepseek-harness/docs/development.zh.md) 里和你有关的小节
5. 任选一篇 [`docs/postmortem/`](../../deepseek-harness/docs/postmortem/README.zh.md)，建议 [0001](../../deepseek-harness/docs/postmortem/0001-acp-default-export-drops-inject.zh.md) 或 [0002](../../deepseek-harness/docs/postmortem/0002-js-expression-disabled-filesystem-tools.zh.md)

### 会反复撞上的规矩

- 注册走 `ctx.effect()` / `ctx.on()`；`register()` 返回 disposer
- waterfall 必须 `next()`，除非你在短路
- 跨边界 id 用 `Branded<B>`，不用裸 `string`
- 包边界上 defaulting 是显式 `resolve(request): Spec`，不是 `run()` 里的 `??`
- 可部署旋钮是 `Config` 字段。源码常量不是配置
- 配置错误响亮失败。缺提供方不要静默跳过（产品启动会 assert）
- 模型可见 ⟺ 已记录。新输入 = 新会话事件
- 新行为挂扩展点。改 `agent-loop` 必须改 `docs/architecture.md`
- 非平凡改动同一 PR 写 Agent Note；产品可见行为加 keyless snapshot
- 测试描述行为，不描述「正确性」。行为变了就改测试，在 PR 里解释为什么

### 测试分层（改代码时选最小集合）

| 命令 | 证明什么 |
|---|---|
| `pnpm run test`（收窄到你的包） | 单元行为、HMR dispose、竞态 |
| `pnpm run test:coverage` | CI 门禁：`packages/*/*/src` **逐文件 100%**。没盖到的行常常是该死代码 |
| `pnpm run test:snapshot` | 无密钥、真实组装的对外 transcript。产品可见行为靠它，不靠 mock |
| `pnpm run test:e2e` | 真 API；没 key 自动 skip |
| `pnpm run doc-sync` | 文档门禁 |
| `pnpm run hygiene` | knip / publint / 工作区约束 |

优先用真实实现。只 mock 贵或不稳的边界（LLM、网络、时钟）。e2e 断言外部世界（重新读文件、重跑命令），不要对 agent 自己的散文做关键词探测。

`test:coverage` 不是 `test`。说「覆盖率过了」却只跑了 `test`，是错的。

### Agent Note

非平凡改动写在 `.agents/notes/`。现行权威是 `implemented/`。`archived/` 冻结，不是现行文档。不要浏览整个 notes 树；从包 README 的链接进去。

---

## 三、一篇 postmortem 怎么读

读 0001 或 0002 时只抓四个问题：

1. 用户看见了什么？
2. 哪条「看起来合理」的捷径导致的？（例如 default export 丢掉 `inject`）
3. 单元测试为什么是绿的？
4. 之后哪道门禁让这类失败变红？

这比再读 50 页约定更能让你知道仓库在怕什么。

---

## 四、给自己的「下一步」清单

作业里选一条真实意图，写下入口文件和你**不会**打开的目录。例如：

```
意图：加一个只在某个 preset 里出现的工具
入口：docs/cookbook/adding-a-tool.zh.md
      packages/preset/README.md
      第 8 天的 scratch-plugin
不打开：packages/client、vendor/cordis、native/
```

```
意图：改 Web 上 bash 卡片的样子
入口：tool-bash 的 presentResult
      cookbook/adding-a-conversation-node（仅当要新节点类型）
不打开：agent-loop、llm-deepseek
```

```
意图：给仓库提 PR
入口：AGENTS.md、testing.md、dsh-pre-push-checks skill
先跑：改动包的 test + 若触及模型/用户可见行为则 snapshot
```

---

## 五、过关测验

1. 为什么 ACP 的 prompt 方法只返回入队回执、不等 `turn/end`？
2. 改工具的 UI 卡片，应该改 `presentResult` 还是改 client 组件？
3. 为什么「单元全绿、产品却坏」在这个仓库特别危险？哪类测试专门打这个洞？
4. 覆盖率 100% 证明了什么，没证明什么？
5. 改了 `agent-loop` 的 step 编排，除了测试还要改什么文档？
6. `archived/` 里的 Agent Note 还能当设计依据吗？

## 六、作业

写 [`learn/12-工程与表面.md`](../12-工程与表面.md)。包含「下一步」清单，以及你读的那篇 postmortem 的四问答案。

## 七、课程序列到此结束

回头看 [`00-学习路径.md`](../00-学习路径.md) 里「先不要读什么」。那些推迟项现在可以按需解禁，但仍然不要线性翻 `packages/client`。

常用复习入口：

- 忘了 turn 流程 → 第 3 天讲义 + 你自己画的图
- 忘了事件域名 → glossary + 第 3 天三类表
- 要挂东西 → architecture 文末表 + 第 8 天 cookbook
- 要读包 → README → 子系统页 → `src/index.ts`
