# learn_dsh

[English](README.md) | 中文

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）的学习材料：一门从插件运行时讲到 agent loop 的 12 天课程，放在上游检出旁边使用。

这不是 fork，也不是 DeepSeek 官方项目。把 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) clone 到本仓库旁边。本仓库是课程和你的笔记。

本机常见布局：

```
learn_dsh/                      # 磁盘上的文件夹，不是本仓库根
  deepseek-harness/             # 上游检出
  learn/                        # 本仓库
    README.md
    00-学习路径.md
    course/
```

## dsh 是什么

DeepSeek Harness 是 DeepSeek AI 的开源 **agent harness**。产品面是能跑 agent 的运行时（Web UI、一次性 headless、ACP、SDK）。实现面是 **一切皆插件**：模型适配器、工具注册表、会话日志、agent loop 本身都是插件。插件运行时是 vendored 的 [Cordis](https://github.com/cordiverse/cordis)。

dsh 处于 **开发者预览**，API 会破。以当前包 README 和 `docs/` 为准，不要把 `.agents/notes/archived/` 当现行设计。

## 这个仓库补什么

上游树很大——五十多组包、上百个包——但主干很窄。官方文档质量高，而且中英对照。它不提供的是：

- 阅读顺序
- 「现在先别打开」清单
- 能把一行 `session.jsonl` 连回 `agent-loop` 的每日讲义
- 告诉你何时停、何时往下走的测验

本仓库补的是这一层。它不替代官方文档。讲义指向官方页。官方页是对照读物，不能代替讲义。

## 写给谁

如果你想 **搞清 dsh 是怎么拼起来的**——足以在不改 loop 的前提下往树上挂工具、策略钩子或提供方——这门课有用。

如果只想把 dsh **当产品跑**，不要从这里进。去看上游 README 和那棵树里的 Web UI 指南。

不需要先成为 TypeScript 专家。官方 Cordis 教程会解释示例用到的那几处语法。你需要按讲义点名的顺序读源码，并用自己的话写笔记。

## 语言

| 表面 | 语言 |
|---|---|
| 本 README | 中文（英文：[README.md](README.md)） |
| `course/` 每日讲义 | 中文 |
| 全图 [`00-学习路径.md`](00-学习路径.md) | 中文 |
| 官方 dsh 文档 | 中英对照（`*.md` / `*.zh.md`） |

术语跟官方 glossary 走：说 scope、轮次、步骤、Round、seam。不要自造「命名空间」「沙箱上下文」。

## 目录

```
.
  README.md                 英文入口
  README.zh.md              本文件
  .gitignore                密钥、编辑器垃圾
  00-学习路径.md            全图：阶段、过关标准、先跳过什么
  course/
    README.md               课程目录
    day-01.md … day-12.md   讲义（目标、讲解、实验、测验、答案）
  01-….md                   你自己写的作业
```

旁边检出里课程真正会用到的部分：

```
../deepseek-harness/
  vendor/          Cordis 源码（先读 primer，不要先读这里）
  packages/        @deepseek-ai/dsh-* 工作区
    core/          主干：session、scope、system-prompt、tools、agent、agent-loop
    llm/           消息词汇 + DeepSeek 适配器
    boot/          profile / bundle / dump-config 粘合层
    bundle/        发行层：base → web-app / headless
    shell/ fs/ …   能力 seam 族
    host/ client/  Web GUI 两侧（后期再读，不能当入口）
  apps/cli/        产品启动器 `dsh`
  examples/        可运行叶子：headless、acp、jsonrpc
  docs/            架构、教程、子系统页、cookbook
```

学习笔记写在本仓库。不要把作业留在 harness 检出里。

## 前置

- **Node.js** `^22.19 || >=24`
- **[pnpm](https://pnpm.io)**
- 旁边一份 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 检出
- 可选：**`DEEPSEEK_API_KEY`**，用来跑一次真模型

第 1–8 天按设计可以无密钥完成。Cordis 教程、`--dump-config`、snapshot 里的 `session.jsonl`、`ctx.tools.execute` 都不调模型。有 key 只是多一次真的 Web 或 headless 对话。

把 key 放在 **harness 仓库根** 一份被 gitignore 的 `.env`（`../deepseek-harness/.env`），不要放进本仓库：

```
DEEPSEEK_API_KEY=sk-...
```

Harness home（profile、用户 patch）是 `$DSH_HOME`，否则 `~/.dsh`。第 1 天不必改这个目录。

## 开始

```sh
cd ../deepseek-harness
pnpm install
pnpm run build
pnpm dsh web                          # http://127.0.0.1:3080
pnpm dsh --profile web --dump-config  # 实际启动的插件树
```

`dsh web` 是 `dsh --profile web` 的别名。有 key 时还可以：

```sh
pnpm dsh --profile headless "用一句话介绍你自己"
```

然后打开 **[第 1 天](course/day-01.md)**。不要从 `packages/` 读起。

第一个小时只回答三件事：它能跑、它是一棵插件树、树可以从配置看到。

## 怎么用一篇讲义

每份 `course/day-NN.md` 是教案，不是链接清单。一天大约 4–6 小时。

1. 先读 **今日目标** 和时间表。
2. 先读讲义里的 **核心讲解**。
3. 按给定顺序做 **对照阅读**（官方文档或点名的源码）。
4. 做 **实验**。命令和预期信号写在讲义里。
5. 先自己做 **测验**，再看文末参考答案。
6. 按当天文末的文件名，把作业写在本目录。

建议的笔记四节（与[学习路径](00-学习路径.md)一致）：

```md
# <主题>

## 它是什么
## 关键对象与事件
## 源码入口（path:symbol）
## 我仍然不清楚的问题
```

用自己的话写。抄 primer 不算完成。

课程草稿（`tmp/`、`scratch-plugin/`）属于 harness 检出，那边已经 gitignore。也不要提交到这里。

## 先记住的 6 件事

1. **一切皆插件。** 模型适配器、工具注册表、会话日志、agent loop 本身都是 Cordis 插件。没有需要打补丁的特权内核。卸载插件时，它的注册会撤销。
2. **运行中的 `dsh` 是一棵插件树。** profile（`web` / `headless`）叠加组合包，再叠 profile 的 `cordis.patch.yml`、`~/.dsh/cordis.patch.yml`、`--patch`。看真实树：`dsh --profile web --dump-config`。一条 patch 按 `id` **整份替换**该条目的 config，不是 deep-merge。
3. **会话日志是真源。** 模型历史由 `session.deriveMessages()` 从仅追加的 `SessionEvent` 投影而来。**模型可见 ⟺ 已记录。** 新增一种模型能看见的输入，就必须新增一种会话事件。
4. **能力按 seam 替换**，不按实现硬编码。seam = Service Definition（`ctx.<key>`）+ Provider + Consumer。范例是 `packages/shell`：`dsh-shell` / `dsh-bash-local` / `dsh-tool-bash`。扩展插件依赖 Definition，绝不依赖某一个 Provider。
5. **循环三层。** **步骤**（一次模型请求 + 其工具调用）⊂ **轮次**（排空一次已接纳输入）⊂ **Round**（Goal Round / Ralph Round 这类策略迭代）。不要混用这三个词。
6. **新行为挂扩展点。** `dsh-agent` 是接口，`dsh-agent-loop` 是默认可替换驱动器。UI、ACP、钩子面向 `ctx.agents` 编程。改循环必须在同一改动里更新 `docs/architecture.md`。

一写插件就会撞上的配套规矩：

- 注册走 `ctx.effect()` / `ctx.on()`。`register()` 返回 disposer。
- waterfall 监听器必须调用 `next()`，除非你在故意短路。
- `followup()` 进 `next-turn` 并唤醒；`steer()` 进 `next-step` 并唤醒；`inject()` 进 `next-step`，**不**唤醒。

## 课程

主干约 8 个专注工作日，另有 4 天进阶。第 8 天结束时，你应能挂一个工具和一个策略钩子。第 9–12 天分别是持久化、多智能体、人类通道、以及如何给上游做贡献。

讲义：[`course/`](course/README.md)。阶段全图：[`00-学习路径.md`](00-学习路径.md)。

| 天 | 讲义 | 过关 |
|---|---|---|
| 1 | [跑起来 + Cordis 01–04](course/day-01.md) | 能启动 Web；能写 `apply(ctx)` 和 waterfall |
| 2 | [配置、HMR、第一个真工具](course/day-02.md) | 本地插件能经 `dsh web --patch` 加载 |
| 3 | [架构地图](course/day-03.md) | 能画出 turn 流程，分清三类事件 |
| 4 | [scope + session](course/day-04.md) | 能在真实 `session.jsonl` 上标出 surface 事件 |
| 5 | [system-prompt + tools](course/day-05.md) | 能从 `register` 追到 `request/header` |
| 6 | [llm + agent + agent-loop](course/day-06.md) | 能在 `agent.ts` 里走完一步 step |
| 7 | [启动与组合](course/day-07.md) | 能 diff `web` 与 `headless` 两棵树 |
| 8 | [shell seam + 写工具](course/day-08.md) | 能加工具和 deny 钩子，且不改 loop |
| 9 | [会话数据平面](course/day-09.md) | 分清持久化、surface、compaction |
| 10 | [多智能体](course/day-10.md) | 分清 subagent / goal / Ralph / workflow / jobs |
| 11 | [人机交互](course/day-11.md) | 分清命令、工具、审批 |
| 12 | [产品表面 + 工程文化](course/day-12.md) | 知道该打开哪条表面，以及 CI 会跑哪些门禁 |

不要跳过第 3 天。主干源码是按那张图组织的。不会自己重画 turn 流程，就不要进第 4 天。

## 怎么读上游代码

固定节奏：

> 架构 / 术语 → 子系统页 → 包 README → `src/index.ts` → 热路径 → 测试或 snapshot

包 README 通常已经写清角色、`ctx` 键、公开 API、已知限制。子系统页上的类型声明与源码等价（有门禁）。

`agent-loop` 是仓库里 **唯一** 包含具体循环逻辑的包。其它一切要么是抽象服务，要么是挂在扩展点上的插件。所以课程用三天读 `packages/core` 和 `packages/llm/llm`，再谈启动或 Web UI。

### 先不要读

这些东西不是不重要，而是作为入口会把主干淹没。

| 推迟 | 原因 |
|---|---|
| `packages/client/**` | 浏览器半侧，1000+ 文件，依赖你还没见过的事件流 |
| 生成目录通读 | `config-catalog`、`tool-catalog` —— 当字典查，不要通读 |
| `docs/i18n/`、`*.i18n.yaml` | 文档工艺，与运行时无关 |
| `vendor/cordis` 源码 | 先吃 primer + tutorial；源码是第三遍 |
| `native/landlock-run` | 只在做 Linux 沙箱后端时需要 |
| `packages/typert` 生成器 | 先会用网关 |
| `.agents/notes/archived/` | 已冻结历史，不是现行权威 |
| `scripts/` 门禁实现 | 改仓库工艺时再看 |

现行设计笔记在 `.agents/notes/implemented/`。第 3 天以后，从包 README 的链接进去。不要浏览整个 notes 树。

## 官方文档

下表路径相对于旁边的 `deepseek-harness/` 检出。GitHub 上在 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)。

| 文档 | 角色 |
|---|---|
| [架构](../deepseek-harness/docs/architecture.zh.md) | 跨子系统行为（必读） |
| [术语表](../deepseek-harness/docs/glossary.zh.md) | 领域语言（必读） |
| [Cordis 入门](../deepseek-harness/docs/cordis-primer.zh.md) | 一页插件模型 |
| [Cordis 教程](../deepseek-harness/docs/cordis-tutorial/index.zh.md) | 动手，无需 API key |
| [Agent 生命周期](../deepseek-harness/docs/agent-lifecycle.zh.md) | 轮次 / 步骤时序图 |
| [工具执行流水线](../deepseek-harness/docs/tool-execution-pipeline.zh.md) | 策略在 loop 外何处运行 |
| [子系统](../deepseek-harness/docs/subsystems/README.zh.md) | 单服务词汇（查阅） |
| [文档图索引](../deepseek-harness/docs/graph-atlas.zh.md) | 生成图与人工图的目录 |
| [Cookbook](../deepseek-harness/docs/cookbook/extension-cookbook.zh.md) | 如何扩展 |
| [测试](../deepseek-harness/docs/testing.zh.md) | 每条测试命令被允许证明什么 |
| 上游 [README](../deepseek-harness/README.zh.md) | 把 dsh 当产品跑 |

## 许可证

`deepseek-harness/` 保留自己的 MIT 与第三方声明。本仓库是学习材料。
