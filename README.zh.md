# learn_dsh

[English](README.md) | 中文

一门关于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）的 12 天课：从插件运行时讲到 agent loop。不是 fork，也不是官方项目。把本仓库放在上游检出旁边。

**讲义是中文。** 用 HTML 站点读（Mermaid 会画出来）。

## 浏览

```sh
./site/serve.sh
```

打开 **http://127.0.0.1:8765/site/**

| 页 | 内容 |
|---|---|
| [课表](course/README.md) | 每天过关标准 |
| [架构图](course/architecture.md) | 23 张图 |
| [一次请求跟读](course/walkthrough.md) | 一条 `followup` 怎么穿过整栈 |
| [速查](course/cheatsheet.md) | `ctx` 键、事件、命令 |
| [易错](course/mistakes.md) | 课里反复强调的坑 |
| [学习路径](00-学习路径.md) | 阶段 ↔ 天、先不要打开什么 |

对照上游 [`47f943859b`](https://github.com/deepseek-ai/deepseek-harness/commit/47f943859b)（2026-08-13）。

## 目录

```
learn_dsh/                    磁盘文件夹，不是本仓库根
  deepseek-harness/           上游检出（独立仓库）
  learn/                      本仓库
    site/                     localhost 阅读器
    course/                   讲义 + 图集
    01-跑起来.md …            作业模板
```

```
.
  README.md / README.zh.md
  00-学习路径.md
  site/                       index.html · serve.sh
  course/
    README.md                 课表真源
    architecture.md
    walkthrough.md
    cheatsheet.md
    mistakes.md
    day-01.md … day-12.md · day-06-loop.md
  01-跑起来.md … 12-工程与表面.md
```

## 前置

- Node.js `^22.19 || >=24`，[pnpm](https://pnpm.io)
- 旁边一份 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- 可选 `DEEPSEEK_API_KEY`，放在 **`../deepseek-harness/.env`**，不要放进本仓库

第 1–8 天无密钥也能完成。Home 是 `$DSH_HOME` 或 `~/.dsh`。

## 第 1 天产品命令

```sh
cd ../deepseek-harness
pnpm install && pnpm run build
pnpm dsh web                          # http://127.0.0.1:3080 — 先选工作区
pnpm dsh --profile web --dump-config  # 实际启动的树
```

然后 [第 1 天](course/day-01.md)。不要从 `packages/` 读起。

## 一篇讲义怎么上

读目标 → 读讲解 → 按序对照官方文档 → 做实验 → 先测验再展开答案 → 填本目录里的作业模板。4–6 小时。用自己的话写。

## 六件事

1. **一切皆插件。** 循环、日志、工具、适配器都是 Cordis。卸载即撤销注册。
2. **运行中的 dsh 是叠出来的插件树。** bundle → profile patch → `~/.dsh/cordis.patch.yml` → `--patch`。patch 按 `id` 整份替换 config。
3. **会话日志是真源。** 模型历史是 `deriveMessages()`。**模型可见 ⟺ 已记录。**
4. **能力按 seam 换。** Definition + Provider + Consumer。依赖 `dsh-shell`，不要依赖 `dsh-bash-local`。
5. **步骤 ⊂ 轮次 ⊂ Round。** 不要混用。
6. **新行为挂扩展点。** `dsh-agent` 是接口，`dsh-agent-loop` 可替换。

`followup` → `next-turn` 并唤醒。`steer` → `next-step` 并唤醒。`inject` → `next-step`，不唤醒。waterfall 观察者必须 `next()`。

## 课程

主干约 8 天 + 第 6 天续。第 9–12 天可选。

| 天 | 讲义 | 过关 |
|---|---|---|
| 1 | [跑起来 + Cordis 01–04](course/day-01.md) | Web 起来；能写 `apply` 和 waterfall |
| 2 | [配置、HMR、第一个工具](course/day-02.md) | `--patch` 能挂上 |
| 3 | [架构地图](course/day-03.md) | 能画出 turn 流程 |
| 4 | [scope + session](course/day-04.md) | 能在 `text-turn` 上标 surface |
| 5 | [system-prompt + tools](course/day-05.md) | `register` 能追到 `request/header` |
| 6 | [llm + agent](course/day-06.md) | UI 只依赖 `ctx.agents` |
| 6 续 | [agent-loop](course/day-06-loop.md) | 能在 `agent.ts` 走完一步 |
| 7 | [启动](course/day-07.md) | 能 diff `web` / `headless` |
| 8 | [shell seam + 写工具](course/day-08.md) | 工具 + deny，不改 loop |
| 9 | [数据平面](course/day-09.md) | 盘 / 内存 / surface |
| 10 | [多智能体](course/day-10.md) | subagent / goal / Ralph / workflow / jobs |
| 11 | [人机通道](course/day-11.md) | 命令 vs 工具 vs 审批 |
| 12 | [表面 + 工程](course/day-12.md) | 知道打开哪条表面 |

不要跳过第 3 天。

读代码：架构 → 子系统页 → 包 README → `src/index.ts` → 热路径 → 测试或 snapshot。

不要当入口：`packages/client`、生成目录通读、`vendor/cordis` 源码、`archived/` notes。

## 官方文档

钉在 [`47f943859b`](https://github.com/deepseek-ai/deepseek-harness/commit/47f943859b)。本机在 `../deepseek-harness/`。

| 文档 | 角色 |
|---|---|
| [架构](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/architecture.zh.md) | 跨子系统行为 |
| [术语表](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/glossary.zh.md) | 领域语言 |
| [Cordis 教程](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/cordis-tutorial/index.zh.md) | 动手 |
| [Cookbook](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/cookbook/extension-cookbook.zh.md) | 如何扩展 |
| 上游 [README](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/README.zh.md) | 当产品跑 |

## 许可证

`deepseek-harness/` 是 MIT。本仓库是学习材料。
