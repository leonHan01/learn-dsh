# dsh 课程

**课表真源。** 阶段全图见 [00-学习路径.md](../00-学习路径.md)。图集 [architecture.md](./architecture.md) · 跟读 [walkthrough.md](./walkthrough.md) · 速查 [cheatsheet.md](./cheatsheet.md) · 易错 [mistakes.md](./mistakes.md) · 和其他 harness 比 [compare.md](./compare.md) · 例子 [examples.md](./examples.md)。

用浏览器读：仓库根执行 `./site/serve.sh`，打开 http://127.0.0.1:8765/site/

对照上游：[`47f943859b`](https://github.com/deepseek-ai/deepseek-harness/commit/47f943859b)（2026-08-13）。本机检出：仓库根的 `../deepseek-harness/`。讲义里的上游链接一律指向该 commit 的 GitHub 页面，在网页上可点；本机对照同一相对路径即可。

换更新 SHA：全仓库替换 `47f943859b` → 打开一条 snapshot 链接确认还在 → 扫 glossary / architecture 有没有改名。

讲义是中文。每天约 4–6 小时：先读讲解 → 做实验 → 先做测验再展开文末答案 → 在**仓库根**写作业（文件名见各天文末，已有空模板）。厚度对照 [homework-sample.md](./homework-sample.md)，不要抄。官方文档是对照读物，不是讲义本身。

| 天 | 文件 | 主题 | 过关 |
|---|---|---|---|
| 1 | [day-01.md](./day-01.md) | 跑起来 + Cordis 01–04 | Web 起来；能写 `apply` 和 waterfall |
| 2 | [day-02.md](./day-02.md) | Cordis 05–07 + hello 插件 | `--patch` 能挂进 web |
| 3 | [day-03.md](./day-03.md) | 架构图 + 术语 | 能默画 turn 流程和三类事件 |
| 4 | [day-04.md](./day-04.md) | scope + session | 能在短 jsonl 上标出 surface |
| 5 | [day-05.md](./day-05.md) | system-prompt + tools | 能从 `register` 追到 `request/header` |
| 6 | [day-06.md](./day-06.md) | llm + agent 接口 | 能说明 UI 为何只依赖 `ctx.agents` |
| 6 续 | [day-06-loop.md](./day-06-loop.md) | agent-loop | 能走完一步 step |
| 7 | [day-07.md](./day-07.md) | 启动与组合 | 能 diff web / headless |
| 8 | [day-08.md](./day-08.md) | shell seam + 写工具 | 能加工具和 deny 钩子 |
| 9 | [day-09.md](./day-09.md) | 会话数据平面（进阶） | 分清盘 / 内存 / surface |
| 10 | [day-10.md](./day-10.md) | 多智能体（进阶） | 分清 subagent / goal / Ralph / workflow |
| 11 | [day-11.md](./day-11.md) | 人机交互（进阶） | 分清命令、工具、审批 |
| 12 | [day-12.md](./day-12.md) | 表面 + 工程文化（进阶） | 知道打开哪条表面 |

术语跟 [glossary](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/glossary.zh.md)。图跟 [architecture.md](./architecture.md)。不要跳过第 3 天。
