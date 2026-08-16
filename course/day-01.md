# 第 1 天 · 跑起来 + Cordis 入门

**对应阶段：** 0 + Cordis 教程 01–04
**时长：** 5–6 小时
**今天结束时你能：** 启动 dsh、看懂一条 dump-config 条目、亲手写一个带服务和 waterfall 的插件。

## 时间表

| 时段 | 内容 |
|---|---|
| 0:00–1:00 | 安装、启动 Web、dump-config |
| 1:00–1:30 | 讲：Cordis 五个核心概念 |
| 1:30–5:30 | 做：官方教程 01–04 |
| 5:30–6:00 | 过关测验 + 写笔记 |

---

## 一、先当产品用一次

不要一上来就钻 `packages/`。先确认三件事：它能跑、它是一棵插件树、树可以从配置看到。

### 1. 安装

```sh
cd /Users/leon/Downloads/leonlearn/learn_dsh/deepseek-harness
pnpm install
pnpm run build
```

需要 Node `^22.19 || >=24`。构建会把 TypeScript 编到各包的 `lib/`。源码启动走 `tsx`，不依赖你刚编出的每一份产物，但第一次还是先 `build`，后面 dump-config / headless 更稳。

### 2. 启动 Web

```sh
pnpm dsh web
```

浏览器打开 `http://127.0.0.1:3080`。这是 `--profile web` 的别名。没有 API key 也能看到界面；真正对话需要 `DEEPSEEK_API_KEY`。

另开一个终端看真实插件树：

```sh
pnpm dsh --profile web --dump-config | less
```

你会看到一长串 YAML 条目。每一条大致是：

```yaml
- id: tools                 # 稳定身份，patch 按它定位
  name: '@deepseek-ai/dsh-tools'  # 要挂载的模块
  config:                   # 交给插件 schema 校验的配置
    mode: native
```

先在 dump 里找出这 5 个 id（或相近名字）：`session` / `system-prompt` / `tools` / `llm` / `agent-loop`。找不到就搜 `dsh-session`、`dsh-tools`、`dsh-agent-loop`。今天只要求「认得出」，不要求读懂 config。

### 3. 两个入口差在哪

| 命令 | 实际含义 |
|---|---|
| `dsh web` | `--profile web`：base 组合包 + web-app 组合包 |
| `dsh --profile headless "任务"` | base + headless 组合包，跑完就退出 |

两者共享 `dsh-base`（模型、工具、持久化、沙箱）。差的是最上面那一层：浏览器宿主，还是一次性 runner。第 7 天会用 `diff` 把这两棵树摊开。

有 key 时再试：

```sh
# 仓库根目录放一个 gitignored 的 .env：DEEPSEEK_API_KEY=sk-...
pnpm dsh --profile headless "用一句话介绍你自己"
```

没 key 就跳过，不影响今天。

对照阅读：

- [`README.zh.md`](../../deepseek-harness/README.zh.md)
- [`apps/cli/README.md`](../../deepseek-harness/apps/cli/README.md) 前半（入口模式、profile）
- [`docs/user/guide/index.zh.md`](../../deepseek-harness/docs/user/guide/index.zh.md) 扫一眼 Web UI

---

## 二、Cordis：后面所有包都是这个模型的实例

dsh 没有「内核 + 插件」。**运行时本身就是插件树。** 模型适配器、工具注册表、会话日志、agent loop 都是插件，卸载时各自的注册会撤销。

底层框架叫 Cordis，源码在 `vendor/cordis`。今天不要读 vendor，读 primer + 做教程。

### 五个核心概念

1. **插件是实现 Service 的对象。** 常见形态是导出 `apply(ctx)` 的函数。也可以是带 `apply` 的对象，或 `Service` 子类。
2. **上下文是服务容器。** 服务占据稳定的 `ctx.<key>`（`ctx.tools`、`ctx.llm`）。消费方按 key 查找，不 import 具体实现。所以换 bash 提供方不用改工具插件。
3. **`inject` 声明服务依赖。** 插件会停在 PENDING，直到依赖就绪。加载顺序由依赖决定，不是 YAML 行序。
4. **类型化事件用来通信。** 四种常用分发：`emit` / `waterfall` / `parallel` / `serial`。
5. **注册是可逆副作用。** `ctx.on()`、`ctx.plugin()`、`ctx.tools.register()` 都是 effect。Cordis 管不到的资源（定时器、连接）必须包进 `ctx.effect()` 并返回 disposer。

### 四种分发，今天必须背下来

| 模式 | 等不等 | 有没有返回值 | 典型用途 |
|---|---|---|---|
| `emit` | 否 | 否 | 广播：`session/event`、`tools/result` |
| `parallel` | 是 | 否 | 一起干活：`session/flush` |
| `serial` | 是 | 是（第一个有值的胜出） | 终点检查：`agent/turn-stopping` |
| `waterfall` | 否（但监听器里 `await next()`） | 是 | 中间件：`agent/pre-step`、`tools/pre-execute` |

**Waterfall 铁律：** 只观察 / 标注的监听器必须调用 `next()`。不调用就直接 return = 有意短路。日志插件忘了 `next()`，会静默吞掉整条下游链。这是仓库常驻规矩。

对照阅读：[`docs/cordis-primer.zh.md`](../../deepseek-harness/docs/cordis-primer.zh.md) 整篇。读完再动手，不要边做边第一次读 primer。

---

## 三、动手：教程 01–04

官方教程在临时目录里搭一个最小 Cordis 应用，不需要 API key。

```sh
cd /Users/leon/Downloads/leonlearn/learn_dsh/deepseek-harness
mkdir -p tmp/cordis-tutorial
cd tmp/cordis-tutorial
```

每一章都用同一条命令：

```sh
node --import tsx ../../vendor/cordis/bin.js
```

它会创建根 `Context`、挂 Loader、读当前目录的 `./cordis.yml`。`tmp/` 已被 gitignore。

按顺序做，不要跳章。每章做完再进下一章。

### 第 1 章 · 插件就是 `apply(ctx)`

对照：[`01-first-plugin.zh.md`](../../deepseek-harness/docs/cordis-tutorial/01-first-plugin.zh.md)

写 `hello.ts` + `cordis.yml`，跑出 `hello from my first plugin`。

要点：

- YAML 里的 `name` 是模块指定符，相对路径或 npm 包名都可以。
- 条目**并发**启动。行序不保证加载先后。
- `apply` 里抛错会让进程失败（明确报错）。**拼错模块路径不会崩进程**，只打日志，看起来像「没效果」——这是今天就要记住的坑。

故意制造一次错误：让 `apply` `throw new Error('apply exploded')`，确认进程退出。然后改回来。

### 第 2 章 · 生命周期与 effect

对照：[`02-lifecycle-and-effects.zh.md`](../../deepseek-harness/docs/cordis-tutorial/02-lifecycle-and-effects.zh.md)

照教程写 `lifecycle.ts`，看到 `tick` 若干次后 `heartbeat cleaned up`。

要点：

- `ctx.plugin(fn)` 从代码挂子插件，返回 **fiber**（已加载实例的句柄）。
- `fiber.dispose()` 等清理完成，并递归卸子插件。
- Fiber 状态：`PENDING → LOADING → ACTIVE → UNLOADING → DISPOSED`，`LOADING` 可掉到 `FAILED`。
- 已经是 effect 的 API：`ctx.on`、`ctx.plugin`、服务注册、`ctx.tools.register`。
- 多个**异步** disposer 会并发跑。必须串行拆除时，放进**同一个** disposer 里依次 await。

问自己：为什么教程要把 `setTimeout` 也包进 `ctx.effect()`？答案：父插件若先卸，未触发的回调必须被取消，不能打在已死的应用上。

### 第 3 章 · 服务

对照：[`03-services.zh.md`](../../deepseek-harness/docs/cordis-tutorial/03-services.zh.md)

写 `greeter.ts` + `consumer.ts`。交换 YAML 两行顺序，输出不变。删掉 greeter，consumer 静默 PENDING，进程以 0 退出。

要点：

- `super(ctx, 'greeter')` 是**运行时**注册。
- `declare module '@deepseek-ai/cordis' { interface Context { greeter: ... } }` 是**编译时**声明合并，不生成代码。
- `inject` 不是一次性启动检查。提供方被卸掉，消费方也会卸；提供方回来，消费方再加载。这就是「换 `dsh-bash-local` 为另一个 shell 提供方，所有 `inject: ['shell']` 的插件会重启」的机制。
- 可选依赖不要写 `inject`，用 `ctx.get('greeter')` 探测。

### 第 4 章 · 事件与 waterfall

对照：[`04-events.zh.md`](../../deepseek-harness/docs/cordis-tutorial/04-events.zh.md)

先做 `stats` + `reporter`，再单独做 `waterfall-demo.ts`。确认输出：

```
HELLO
** BLOCKED **
```

亲手推演第二行：

1. 监听器 1 先跑，调用 `next()`。
2. 监听器 2 看到 `blocked`，直接 return `'** blocked **'`，最内层默认逻辑没跑。
3. 返回途中监听器 1 把结果 `toUpperCase()`，得到 `** BLOCKED **`。

`import type {} from './stats.ts'` 只为让 TypeScript 看到声明合并，运行时什么都不导入。第 7 章对 `@deepseek-ai/dsh-tools` 会用完全相同的手法。

---

## 四、过关测验

先自己答，再看文末参考答案。

1. `dsh web` 和 `dsh --profile headless` 共享哪一层？差在哪一层？
2. dump-config 里一条 entry 的 `id` / `name` / `config` 各是什么？
3. 为什么不能在 `apply` 里裸写 `setInterval`？
4. waterfall 监听器忘了 `next()` 会怎样？权限门禁什么时候应该故意不调用？
5. `inject: ['tools']` 的插件，在 `tools` 被卸载时会发生什么？
6. 模块路径拼错和 `apply` 抛错，失败表现有何不同？

## 五、作业

写 [`learn/01-跑起来.md`](../01-跑起来.md)，四节：

```md
# 跑起来 + Cordis 01–04

## 它是什么
## 关键对象与事件
## 源码入口（path:symbol）
## 我仍然不清楚的问题
```

至少记下：`~/.dsh` 是否已出现、dump-config 里你认出的 5 个服务、waterfall 用自己的话复述一遍。

## 六、明日预告

配置 schema、`id` / `disabled` / HMR、诊断 PENDING，然后把一个工具挂进真实 harness，再 `--patch` 进 Web UI。

---

### 参考答案

1. 共享 `dsh-base`。差在最上层组合包：`dsh-web-app`（浏览器）vs `dsh-headless`（一次性 runner）。
2. `id` 是稳定身份，patch 按它定位；`name` 是要挂载的模块；`config` 是交给该插件 schema 校验的选项。
3. 定时器不是 Cordis 管的资源。不包进 `ctx.effect()`，插件卸载后定时器还在跑，热替换会泄漏。
4. 链条在该监听器处短路，下游（含默认实现）不跑。策略门禁在自己拥有最终决定（deny / 替换结果）时才故意不调用 `next()`。
5. 消费方被卸载（ACTIVE → DISPOSED）；`tools` 恢复后会再加载。它不会拿着已经消失的 `ctx.tools` 继续跑。
6. `apply` 抛错：fiber FAILED，启动器通常非零退出。模块解析失败：打日志，进程可能不崩，看起来像「没加载」。
