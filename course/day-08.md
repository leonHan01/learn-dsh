# 第 8 天 · shell seam，并写一个工具

**对应阶段：** 5
**时长：** 6 小时
**今天结束时你能：** 画出 shell 三角；解释 request / spec 为什么拆开；写出一个带 schema、renderer、卡片意图的工具，并用 hook 拒绝一次调用。

这是核心课最后一天。工具按官方形状写，不要发明 API。

## 时间表

| 时段 | 内容 |
|---|---|
| 0:00–2:30 | 精读 shell 族 + 相邻 seam |
| 2:30–3:30 | 扫 llm-deepseek 适配器（第二份 seam） |
| 3:30–5:30 | 写工具 + 权限门禁 |
| 5:30–6:00 | 过关 + 笔记 |

---

## 一、规范 seam：shell

对照：

- [`packages/shell/README.md`](../../deepseek-harness/packages/shell/README.md)
- [`packages/shell/shell/README.md`](../../deepseek-harness/packages/shell/shell/README.md)
- [`docs/subsystems/shell.zh.md`](../../deepseek-harness/docs/subsystems/shell.zh.md)
- `packages/shell/shell/src/`（先 `types.ts` 再 `index.ts`）
- `packages/shell/tool-bash/src/`
- 相邻：[`subprocess`](../../deepseek-harness/docs/subsystems/subprocess.zh.md)、[`sandbox`](../../deepseek-harness/docs/subsystems/sandbox.zh.md)、[`filesystem`](../../deepseek-harness/docs/subsystems/filesystem.zh.md) 各读开头

```
        ctx.shell  (Definition: ShellExecutor)
           ▲  ▲
           │  └──────────────┐
    dsh-bash-local      dsh-bash-sandbox     Providers
           │
    dsh-tool-bash  ──ctx.tools.register──▶ 模型看到 bash
```

同一时刻一棵树只挂一个 `ctx.shell` 提供方。Consumer 检测 `sandboxMode` 能力位，决定要不要在工具 schema 上暴露升级字段。**Consumer 不 import 提供方包。**

### request / spec：跨包边界的「显式 > 隐式」

```
ShellExecRequest     调用方说「我想干什么」（很多字段可选）
        │
        ▼
   resolve(request): Spec     拥有方补齐默认、校验、冻结
        │
        ▼
ShellExecSpec        执行器看到的完整、已解析描述
```

`run()` 里不准写 `timeoutMs ?? 30_000`。默认是 `resolve` 的工作。这是仓库对所有 seam 的模板。

`run(spec)` 只在基础设施失败时 reject（工作目录不能用、没有 shell、信号已经 abort）。非零退出、超时杀死、abort 杀死都 **resolve** 成带描述的 `ShellRunResult`。领域失败是值，不是异常。

`start(spec)` 立刻返回 `ShellProcess`，没有超时。后台生命周期归通用的 `ctx.jobs`，不归 shell。tool-bash 把 process 适配成 job。

`dshEnv` 是受管键覆盖层（`DSH_*`），和普通 `env` 分开。提供方先清掉继承来的受管键，再合并 `dshEnv`，避免脏环境泄漏。模型工具不暴露这些参数。

### 为什么 fs / subprocess / sandbox 要一起看

它们描述同一个执行世界。把 fs 和 subprocess 指到远程沙箱，Bash、PTY、LSP 跟着走，不必给每个 Consumer 写远程版。sandbox 是进程约束 seam：Consumer 在 spawn 前把 argv 包成 `ConfinedArgv`。

读 tool-bash 时盯：

- 它怎样 `inject: ['shell', 'tools', ...]`
- 怎样从 `ctx.shell.sandboxMode` 决定 schema
- `output.schema` 如何区分前台结果和 `{ kind: 'background', jobId }`
- `presentCall` 如何返回 `{ card: 'terminal', title, cwd }`
- 非零退出为什么仍是成功值，只在 render 里加 `[exit code: N]`

---

## 二、再看一个适配器 seam：llm

对照：

- [`docs/cookbook/adding-an-llm-adapter.zh.md`](../../deepseek-harness/docs/cookbook/adding-an-llm-adapter.zh.md)
- [`packages/llm/llm-deepseek/src/adapter.ts`](../../deepseek-harness/packages/llm/llm-deepseek/src/adapter.ts) 浏览

和 shell 同一形状：`dsh-llm` 定义词汇和注册表，`dsh-llm-deepseek` 是提供方，loop 是 Consumer。今天只确认「注册适配器和注册 shell 后端是同一类动作」，不要顺着 SSE 解析往下走。

---

## 三、动手：写一个正经工具

严格按：

1. [`user/develop/basic/tool.zh.md`](../../deepseek-harness/docs/user/develop/basic/tool.zh.md)（你第 2 天做过最小版）
2. [`cookbook/adding-a-tool.zh.md`](../../deepseek-harness/docs/cookbook/adding-a-tool.zh.md)
3. [`cookbook/extension-cookbook.zh.md`](../../deepseek-harness/docs/cookbook/extension-cookbook.zh.md) 的权限门禁

在 `scratch-plugin/` 里把 greet 升级成一个**有领域语义**的工具，例如 `word_count`：

要求（缺一条都不算完成）：

1. `inject: ['tools']`，`defineTool`
2. `parameters` 至少两个字段，其中一个可选
3. `output.schema` 是对象（例如 `{ lines, words, chars }`），不是散文 string
4. `output.render` 把对象变成一两行文本
5. `presentCall` 返回 `{ card: 'generic', title, kind: 'search' }` 之类
6. `presentResult` 用结果对象生成标题（纯函数，不读文件第二次）
7. `execute` 使用 `exec.signal`
8. 另写一个 `deny-plugin.ts`，对某个参数值 `pre-execute` 返回 deny
9. `--patch` 同时 insert 两个插件，Web 或教程启动器能跑

权限门禁形状：

```ts
export const name = 'deny-word-count-secret'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.on('tools/pre-execute', async (exec, next) => {
    if (exec.name === 'word_count' && exec.arguments.path === '/etc/passwd') {
      return { kind: 'deny', reason: 'Denied by local policy.' }
    }
    return next()
  })
}
```

不要在 `word_count` 的 `execute` 里写这条策略。策略和能力要分开，这就是 seam 课的作业。

有 API key：在 Web 里让模型调用它。没 key：在教程组合里 `ctx.tools.execute` 调两次——一次成功，一次被 deny——打印结果。

选做：给工具加 `Config`（默认路径前缀），YAML 传入。

---

## 四、过关测验

1. `ShellExecRequest` 和 `ShellExecSpec` 为什么拆开？谁负责 `resolve`？
2. 权限拒绝应该走 `pre-execute` 还是改 tool-bash 的 `execute`？
3. 扩展插件为什么绝不能依赖 `dsh-bash-local`？
4. 非零退出为什么 resolve 而不是 reject？
5. `presentCall` 里读磁盘看文件旧内容，错在哪？
6. 后台 bash 的超时归谁？`exec.signal` 在 `run_in_background: true` 之后还杀不杀进程？

## 五、作业

写 [`learn/08-capability-seam.md`](../08-capability-seam.md)：

- shell 三角图
- 另选一个 seam（建议 `fs` 或 `web`）自己填 Definition / Provider / Consumer
- 你写的工具的 schema 和一张卡片草图
- 为什么 deny 不写在 execute 里（五句以内）

---

### 参考答案

1. request 是调用方意图（字段多可选）；spec 是执行器看到的完整描述。拥有方（shell 包）的 `resolve` 负责补齐和校验。
2. `pre-execute`（或 `guard`）。策略属于横切层，不属于 bash 能力实现。
3. 依赖提供方会把本地 subprocess 焊死，远程/沙箱后端无法替换。只依赖 `dsh-shell`。
4. 非零退出是领域结果，模型要看见退出码。reject 只留给基础设施失败。
5. 展示器必须是纯函数，实时和回放都会跑。磁盘内容属于 `execute` 的规范值或 `presentationMeta`，不属于 `presentCall`。
6. 后台没有超时。`ctx.jobs.start` 发布之后，外层 `exec.signal` 只停等待，不杀已发布进程。杀进程走 `job_kill` / owner dispose。

## 六、核心课结束之后

前 8 天走完，你已经能：

- 用 Cordis 写插件
- 顺着日志看完一步 step
- 往树上挂工具和策略
- 看懂产品是怎么叠出来的

第 9–12 天是进阶周，按需上。要改持久化 / 压缩走第 9 天；要搞懂 subagent / Ralph 走第 10 天；要做审批 / 命令走第 11 天；要动 Web 或准备贡献代码走第 12 天。
