# 第 2 天 · 组合、HMR，并把插件挂进真实 harness

**对应阶段：** Cordis 教程 05–07 + 第一个 Web 插件
**时长：** 5–6 小时
**今天结束时你能：** 给插件加 schema、解释 PENDING、在无密钥环境下跑通 `ctx.tools.execute`、用 `--patch` 把插件挂进 `dsh web`。

## 时间表

| 时段 | 内容 |
|---|---|
| 0:00–1:30 | 教程 05 配置 + 06 组合 / HMR |
| 1:30–3:00 | 教程 07：向真实 `ctx.tools` 注册工具 |
| 3:00–5:00 | 把 hello / greet 挂进 Web UI |
| 5:00–6:00 | 过关 + 笔记 |

继续在昨天的 `tmp/cordis-tutorial` 里做 05–07。Web 插件另开 `scratch-plugin/`。

---

## 一、配置：错误必须响亮失败

从仓库根：`cd ../deepseek-harness`，继续昨天的 `tmp/cordis-tutorial`。

对照：[`05-config.zh.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/cordis-tutorial/05-config.zh.md)

插件同时导出 TypeScript 接口 `Config` 和同名运行时 schema。Cordis 在调用 `apply` **之前**用 schema 校验 YAML 里的 `config`。`apply` 永远收到完整且合法的配置。

```ts
export interface Config {
  greeting: string
  targets: string[]
}

export const Config: Schema<Config> = Schema.object({
  greeting: Schema.string().default('Hello'),
  targets: Schema.array(String).default(['world']),
})

export function apply(ctx: Context, config: Config) { /* ... */ }
```

两件必须亲手做的事：

1. 只给 `targets`，不给 `greeting`，确认默认值生效。
2. 把 `targets` 写成字符串，确认看到 `ValidationError`，fiber 进 FAILED，进程非零退出。

### `!!js` 只活在两个位置

```yaml
- name: './config-demo.ts'
  config:
    greeting: !!js process.env.DEMO_GREETING ?? 'Hello'
  # disabled: !!js process.platform === 'win32'   # 也合法
```

`!!js` 只允许出现在条目的 `config` 和 `disabled`。`name`、`id`、`inject` 必须是字面值。按环境选插件用 overlay / `disabled` 表达式，不要在 `name` 里写表达式。

仓库规矩（后面改 dsh 包会反复撞上）：**可部署旋钮必须是 Config 字段**。插件源码里的 `DEFAULT_*` 常量不是配置。

产品路径的同一套手法见 [`user/develop/basic/config.zh.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/user/develop/basic/config.zh.md)。

---

## 二、组合：`cordis.yml` 就是应用

对照：[`06-composition-and-hmr.zh.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/cordis-tutorial/06-composition-and-hmr.zh.md)

到现在为止你写的每个能力都是插件；YAML 选择哪棵树。今天要把 YAML 当成应用本身。

### `id` 不是装饰

```yaml
- id: greeter          # 稳定身份
  name: './greeter.ts'
- id: consumer
  name: './consumer.ts'
  disabled: true       # 保留条目，不挂载
```

- 有 `id`：loader 能区分「改现有条目」和「删了再加」。
- 没有 `id`：每次读文件都生成新 id，任何编辑都会被看成先删后加，整条重新挂载。
- `disabled: true` 卸插件但不删条目。改回后，它以及所有因依赖它而 PENDING 的插件会再加载。

`group` + `isolate` 可以让两组各自看到不同的 `shell` 实例。今天知道有这回事即可，第 7 天 preset 会再碰到。

### HMR 为什么「能热替换」

因为第 2 章的 effect 会在卸载时回卷，第 3 章的 `inject` 会在服务回来后重载。HMR 只是「先 dispose 再 apply」。

照教程挂上 `logger-console`、`timer`、`hmr` 和 `hello.ts`。改一句日志并保存，终端应出现 `hmr reload plugin`。

HMR 自己 `inject: ['timer']`。忘了挂 timer，HMR 会静默 PENDING——这正好引出下一节。

### 诊断 PENDING

「插件没输出」的第一怀疑不是 bug，是 PENDING：`inject` 要的服务没人提供。PENDING 是合法状态，提供方可能稍后才挂，所以它不是错误。

照教程写 `diagnose.ts` + `needs-timer.ts`，确认打印 `PENDING`。再加上 `@deepseek-ai/cordis-plugin-timer`，确认加载。

dsh 产品启动器用 `assertEntriesActivated` 把「启用了却一直 PENDING」升级成启动失败（第 7 天）。教程启动器没有这层，所以要自己查。

---

## 三、进入 harness：注册一个真工具

对照：[`07-into-the-harness.zh.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/cordis-tutorial/07-into-the-harness.zh.md)

前 6 章是纯 Cordis。这一章第一次碰到 dsh 服务：`ctx.tools`。不调模型、不需要 key。

组合必须同时有：

```yaml
- name: '@deepseek-ai/dsh-system-prompt'   # tools 依赖它
- name: '@deepseek-ai/dsh-tools'
- name: './tool-logger.ts'
- name: './greet-tool.ts'
```

`dsh-tools` 会 `inject` `systemPrompt`，因为工具 schema 要流进系统提示词。缺这一行，工具插件会 PENDING。这就是第 3 章在真实包上的再现。

照教程写 `greet-tool.ts` 和 `tool-logger.ts`，跑出：

```
[tool-logger] greet -> Hello, Cordis!
tool replied: [{"type":"text","text":"Hello, Cordis!"}]
```

logger 先打印：`tools/result` 在结果物化时发出，早于 `execute()` 返回给调用方的 Promise。两个插件互不 import，只靠服务和事件相连。

把这块拆开记：

| 你写的 | 对应昨天哪一章 |
|---|---|
| `inject: ['tools']` | 3. 服务 |
| `ctx.tools.register(...)` | 2. 注册是 effect，卸载即注销 |
| `defineTool({ parameters, output, execute })` | 新：dsh 工具 DSL |
| `ctx.on('tools/result', ...)` | 4. emit 观察 |
| `import type {} from '@deepseek-ai/dsh-tools'` | 4. 声明合并 |

`defineTool` 今天只需记住三件事：

1. `parameters` 生成给模型看的 JSON Schema，并推导 `execute` 的 `args` 类型。
2. `execute` 只返回规范 JSON 值（这里是 string），不返回内容块。
3. `output.render` 把规范值变成模型可见的文本块。

更完整的约定第 5、8 天再讲。

做完后打开 [`examples/headless-agent/cordis.yml`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/examples/headless-agent/cordis.yml)，试着读每一行。你现在应该能认出「这是在挂哪个服务」。读不懂的行先标出来，第 7 天回头看。

---

## 四、挂进 Web UI

对照：[`user/develop/basic/index.zh.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/user/develop/basic/index.zh.md)、[`tool.zh.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/user/develop/basic/tool.zh.md)

教程启动器和产品启动器不是同一条路。产品用 profile + patch。本地插件通过 `--patch` 插进已启动的 web 树。

```mermaid
flowchart LR
  tree["已启动的 web 树"] --> patch["--patch cordis.yml"]
  patch --> insert["insert id=hello"]
  insert --> apply["绝对路径上的 apply"]
  apply -->|"inject tools"| reg["ctx.tools.register"]
```

图：[architecture.md §2](./architecture.md#2-运行中的-dsh-是一棵插件树) · [§13](./architecture.md#13-产品-patch-怎么插进去)。

在 **harness 检出根**（`../deepseek-harness`）建练习插件，不要建在本课程仓库里：

```sh
cd ../deepseek-harness
mkdir -p scratch-plugin/src
```

`scratch-plugin/src/my-plugin.ts`：

```ts
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'greet-tool'
export const inject = ['tools']

export function apply(ctx: Context) {
  console.log('[greet-tool] plugin loaded')
  ctx.tools.register(defineTool({
    name: 'greet',
    description: 'Greet someone by name.',
    parameters: {
      name: { type: 'string', required: true, description: 'The name to greet' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `Hello, ${args.name}!`
    },
  }))
}
```

`name` 必须是**你机器上的绝对路径**。在 harness 根生成：

```sh
cd ../deepseek-harness
python3 -c "import os; print(os.path.abspath('scratch-plugin/src/my-plugin.ts'))"
```

把打印结果填进 `scratch-plugin/cordis.yml`：

```yaml
- insert:
    - id: hello
      name: '/ABS/PATH/scratch-plugin/src/my-plugin.ts'
```

patch 只贡献配置，不改变 loader 解析模块时用的 profile 目录。

```sh
pnpm dsh web --patch ./scratch-plugin/cordis.yml
```

终端应出现 `[greet-tool] plugin loaded`。有 API key 时在 UI 里说：`Use the greet tool to greet Ada.` 没 key 至少确认插件加载成功。

想让问候语可配置，按 [`config.zh.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/user/develop/basic/config.zh.md) 给这个插件加 `Config`。这是把第 5 章搬到产品路径上。

`scratch-plugin/` 是练习场，不要提交。

---

## 五、过关测验

1. 为什么导出普通对象当 `Config` 不行？
2. 编辑 `cordis.yml` 时，没有 `id` 的条目会发生什么？
3. 插件「完全没输出」时，第一件该查的事是什么？
4. 为什么 greet-tool 的组合必须包含 `dsh-system-prompt`？
5. `--patch` 的 YAML 为什么是 `insert:` 而不是直接写 `- name:`？
6. `tools/result`（实时）和后面会见到的 `tool/result`（会话事件）是一回事吗？

## 六、作业

写 [02-cordis.md](../02-cordis.md)。用自己的话写 5 个核心概念 + 四种分发模式表，不要抄 primer。另加一小节：从教程启动器到 `dsh web --patch` 你看到的差别。

## 七、明日预告

先读 [architecture.md](./architecture.md)，再读官方 architecture。过不了第 3 天不要进主干源码。

<details>
<summary>参考答案</summary>

1. Cordis 要的是 Standard Schema 验证器。普通对象没有校验协议，加载时不会按字段检查，也补不了默认值。
2. 每次读取都生成新 id，整条被当成删除再添加，即使文本没变也会重新挂载。
3. 看 fiber 是否 PENDING：`inject` 的服务有没有提供方。
4. `dsh-tools` 注入 `systemPrompt`，用它把工具 schema 送进提示词组装。缺提供方则 tools 自己 PENDING，greet-tool 跟着等。
5. 产品启动时树已经由 profile 的 bundle 填满。`--patch` 是叠在上面的补丁列表，用 `insert` 加新条目，或按 `id` 整份替换已有条目的 config。
6. 不是。`tools/result` 是工具注册表发出的实时观察事件；`tool/result` 是 agent-loop 随后写入会话日志的持久事实。名字故意接近，域不同。

</details>
