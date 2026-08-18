# 第 7 天 · 启动与组合

**对应阶段：** 4
**时长：** 4–5 小时
**今天结束时你能：** 画出从 `dsh web` 到 `ctx.agents.create` 的序列；解释为什么用户 patch 必须重述整份 config；用 diff 指出 web 和 headless 差在哪些条目。

## 时间表

| 时段 | 内容 |
|---|---|
| 0:00–1:30 | 读 boot / bundle / cli |
| 1:30–3:30 | dump-config 实验 |
| 3:30–4:30 | 对照 composition 图和 base patch |
| 4:30–5:00 | 过关 + 笔记 |

---

图：[architecture.md §2](./architecture.md#2-运行中的-dsh-是一棵插件树) · [§19](./architecture.md#19-从-dsh-web-到第一轮)。

```mermaid
flowchart LR
  cli["dsh web"] --> compose["空列表 + 各层 patch"]
  compose --> boot["Loader + assert ACTIVE"]
  boot --> create["agents.create"]
  create --> turn["第一轮 followup"]
```

## 一、空列表变成产品的五层

对照：

- [`packages/boot/app-boot/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/packages/boot/app-boot/README.md) 的 Profiles 一节
- [`packages/bundle/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/packages/bundle/README.md)
- [`packages/bundle/base/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/packages/bundle/base/README.md)
- [`packages/bundle/web-app/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/packages/bundle/web-app/README.md)
- [`packages/bundle/headless/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/packages/bundle/headless/README.md)
- [`apps/cli/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/apps/cli/README.md)
- [`apps/cli/src/bin.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/apps/cli/src/bin.ts)、[`src/args.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/apps/cli/src/args.ts)

启动不是「跑一个 main 再 require 一堆模块」。它是：

```
空条目列表
  → 按 dsh.profile.bundles 顺序，每个 bundle 的 cordis.patch.yml
  → profile 自己的 cordis.patch.yml
  → home 级 ~/.dsh/cordis.patch.yml
  → --patch overlay
  → boot()：建根 Context，挂 Loader，挂树，assert 全部 ACTIVE
```

### 三个词

| 词 | 是什么 | 在哪 |
|---|---|---|
| **profile** | 具名组装。列出 bundle、装树外插件、存用户 patch | `~/.dsh/profiles/<name>/` |
| **bundle** | 可安装的 patch 层。`package.json` 里 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }` | 发行物里的 `dsh-base` / `dsh-web-app` / `dsh-headless` |
| **patch** | YAML 数组：按 `id` **整份替换**某条目 config，或 `insert` 新条目 | 不是 deep-merge |

`web` 和 `headless` 是随发行版带的模板，第一次用会自动初始化。其它名字必须 `dsh plugin` 创建。

`dsh web` = `dsh --profile web`。
`dsh --profile headless "job"` 跑一个新持久会话，打印最终回答，退出。

启动器只解析自己的旗标，后面的参数交给已启动的 profile。所以：

```sh
dsh --profile web --port 8080     # --port 属于 web app
dsh --help                        # 启动器自己的帮助
dsh --profile web --help          # web app 的帮助
```

### `dsh-base` 贡献什么

每个 profile 的第一层。插入模型适配器、默认模型选择、工具、持久化、沙箱与审批、设置、凭据、遥测、host 级 subagent 提供方。它**没有运行时 API**，实质就是那份 `cordis.patch.yml`。

同一份 patch 用 `disabled: !!js process.platform === 'win32'` 在 POSIX 上挂 bash、在 Windows 上挂 pwsh。两个执行器都注册同一个 `shell` 服务，同时启用会加载失败。

`dsh-web-app` 在 base 上加浏览器宿主。`dsh-headless` 加一次性 runner，不带 HTTP 服务器。

### 用户 patch 的坑

按 `id` 替换时是**整份 config**。想改一个字段，必须把该条目想保留的字段一起重写。漏写 = 丢掉 bundle 的默认值。

`!!js` 仍然只活在 `config` 和 `disabled`。

空的或只有注释的 `cordis.patch.yml` 会当解析失败（解析结果不是数组）。要停用这一层，写 `[]`。

Home：`$DSH_HOME`，否则 `~/.dsh`。里面还有分层 `.env`（进程环境 > 项目 `.env` > home `.env`）和 `.credentials.yaml`（凭据不要塞 `.env` 当正式来源）。

### `boot()` 在坚持什么

`assertEntriesLoaded`：启用了却没有 fiber → 启动失败，列出未解析的插件名。
`assertEntriesActivated`：再等每个 fiber；FAILED 带上原始堆栈，PENDING 点名缺的服务。

这就是第 2 天教程启动器没有、产品启动器有的那一层。本地实验 PENDING 会静默；产品里 PENDING 是启动错误。

---

## 二、实验：diff 两棵树

```sh
cd ../deepseek-harness
pnpm dsh --profile web --dump-config > /tmp/dsh-web.yml
pnpm dsh --profile headless --dump-config > /tmp/dsh-headless.yml
diff -u /tmp/dsh-web.yml /tmp/dsh-headless.yml | less
```

对照 [architecture.md §2](./architecture.md)。

作业里要交：

1. 两边**都有**的 8 个条目 id（来自 base）
2. **只在 web** 的 5 个条目（宿主、路由、client 相关）
3. **只在 headless** 的条目（runner）

读不懂的 config 字段去 [`config-catalog.zh.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/config-catalog.zh.md) 查，不通读。

再打开：

- [`apps/cli/composition.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/apps/cli/composition.md)（生成的组合图）
- [`packages/bundle/base/cordis.patch.yml`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/packages/bundle/base/cordis.patch.yml) 前 80 行
- 第 2 天标过的 [`examples/headless-agent/cordis.yml`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/examples/headless-agent/cordis.yml)

例子叶子和产品 profile 不是同一条路：叶子是一份完整 `cordis.yml` 直接喂给 demo bin；产品是空列表 + 多层 patch。概念相同（都是条目列表），组装方式不同。

### 可选：看启动源码 15 分钟

`apps/cli/src/args.ts`：命令文法。
`apps/cli/src/bin.ts`：选中 runner 再加载。
`app-boot` 的 `boot` / `loadProfile` / `composeEntries` / `renderConfigDump`。

不要顺着整个 boot 文件读下去。盯「谁把 bundle 列表变成条目列表」。

---

## 三、从命令到第一个 agent

把这张图画进作业（方框即可）：

```
shell: pnpm dsh web
  → args.ts 认出 profile=web
  → 解析 ~/.dsh/profiles/web（没有则从模板初始化）
  → composeEntries:
        [] + dsh-base patch
           + dsh-web-app patch
           + profile cordis.patch.yml
           + ~/.dsh/cordis.patch.yml
           + --patch
  → boot(): Context + Loader + 挂树 + assert ACTIVE
  → web-app 插件起 HTTP，UI 连上
  → 某条路径调用 ctx.agents.create(...)
  → AgentLoop 工厂走第 6 天的事务
  → 用户 followup → 第一次 turn
```

headless 把倒数第二步换成 runner：把命令行字符串当成第一条 followup，等 idle，打印，退出。

---

## 四、过关测验

1. 为什么改用户 patch 必须重述该条目想保留的字段？
2. `!!js` 允许出现在哪些位置？为什么 `name` 不行？
3. `dsh-base` 大致贡献哪些 seam？`dsh-web-app` 在它上面加什么？
4. 同时启用 `bash-sandbox` 和 `pwsh-sandbox` 会怎样？为什么？
5. 教程里 PENDING 能静默退出，产品启动为什么不行？
6. 叶子 `examples/headless-agent/cordis.yml` 和 profile 组装差在哪？

## 五、作业

写 [07-启动组合.md](../07-启动组合.md)。必须有启动序列图，以及 web / headless dump-config 的三点对比。

## 六、明日预告

精读 shell seam，按 cookbook 写一个正经工具。

<details>
<summary>参考答案</summary>

1. patch 按 id 整份替换 config，不做 deep-merge。不重述的字段等于丢掉 bundle 默认值。
2. 只允许在条目的 `config` 和 `disabled`。`name` 必须是静态模块指定符，否则解析和 HMR 按 id 对比会失去意义。
3. base：模型、工具、持久化、沙箱/审批、设置、凭据、遥测、host 级 subagent 提供方。web-app：HTTP 宿主和浏览器半侧。
4. 加载失败。两者都注册同一个 `shell` 服务，重复注册响亮失败。
5. 产品 `boot()` 调用 `assertEntriesActivated`：启用却 PENDING 是启动错误。教程启动器没有这层。
6. 叶子是一份完整 `cordis.yml` 直接挂树。profile 从空列表叠加多层 patch。概念都是条目列表，组装路径不同。

</details>
