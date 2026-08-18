# learn_dsh

English | [中文](README.zh.md)

A study workspace for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`): a 12-day course from the plugin runtime to the agent loop, meant to sit next to an upstream checkout.

**Lectures are in Chinese.** Start at [course/README.md](course/README.md). Architecture diagrams: [course/architecture.md](course/architecture.md). Verified against deepseek-harness [`47f943859b`](https://github.com/deepseek-ai/deepseek-harness/commit/47f943859b) (2026-08-13).

This is not a fork and not an official DeepSeek project. Clone [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) beside this repo. This repository is the curriculum and your notes.

A typical local layout:

```
learn_dsh/                      # folder on disk, not this git root
  deepseek-harness/             # upstream checkout
  learn/                        # this repository
    README.md
    00-学习路径.md
    course/
```

## What dsh is

DeepSeek Harness is an open-source **agent harness** from DeepSeek AI. As a product it is a runtime that can run an agent (Web UI, headless one-shot, ACP, SDK). As an implementation, **everything is a plugin**, including the model adapter, the tool registry, the session log, and the agent loop itself. The plugin runtime is a vendored copy of [Cordis](https://github.com/cordiverse/cordis).

dsh is in **developer preview**. APIs will break. Prefer current package READMEs and `docs/` over anything under `.agents/notes/archived/`.

## What this repo adds

The upstream tree is large — fifty-plus package groups, hundreds of packages — but the spine is narrow. Official docs are excellent and bilingual. They do not give you:

- a reading order
- a “do not open this yet” list
- daily lectures that connect one `session.jsonl` line back to `agent-loop`
- a quiz that tells you when to stop and when to go on

This repo is that layer. It does not replace official docs. Lectures point at them. Official pages are companion reading, not a substitute for the lecture.

## Who it is for

You will get something out of this if you want to **understand how dsh is put together** — enough to hang a tool, a policy hook, or a provider on the existing tree without editing the loop.

It is the wrong entry if you only want to *run* dsh as a product. Use the [upstream README](https://github.com/deepseek-ai/deepseek-harness) and the Web UI guide in that tree instead.

You do not need to be a TypeScript expert. The official Cordis tutorial explains the few constructs the examples use. You do need to be willing to read source in the order the lectures name, and to write notes in your own words.

## Language

| Surface | Language |
|---|---|
| This README | English (Chinese: [README.zh.md](README.zh.md)) |
| Daily lectures in `course/` | Chinese |
| Full learning map [`00-学习路径.md`](00-学习路径.md) | Chinese |
| Official dsh docs | English + Chinese (`*.md` / `*.zh.md`) |

Domain words follow the official [glossary](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/glossary.md): say *scope*, *turn*, *step*, *Round*, *seam*. Do not invent “namespace” or “sandbox context” for those ideas.

## Layout

```
.
  README.md                 This file
  README.zh.md              Chinese counterpart
  .gitignore                Secrets, editor junk
  00-学习路径.md            Full map: phases, gates, what to skip
  course/
    README.md               Course table of contents
    architecture.md         Diagrams (plugin tree, turn, seams)
    day-01.md … day-12.md   Lectures
  01-跑起来.md …            Homework stubs (fill these in)
```

Inside the sibling checkout, the parts the course actually uses:

```
../deepseek-harness/
  vendor/          Cordis source (read the primer first, not this)
  packages/        @deepseek-ai/dsh-* workspaces
    core/          Spine: session, scope, system-prompt, tools, agent, agent-loop
    llm/           Message vocabulary + DeepSeek adapters
    boot/          Profile / bundle / dump-config glue
    bundle/        Shipped layers: base → web-app / headless
    shell/ fs/ …   Capability seam families
    host/ client/  Web GUI halves (late, and not as an entry)
  apps/cli/        Product launcher `dsh`
  examples/        Runnable leaves: headless, acp, jsonrpc
  docs/            Architecture, tutorials, subsystem pages, cookbook
```

Keep study notes in this repo. Do not leave homework inside the harness checkout.

## Prerequisites

- **Node.js** `^22.19 || >=24`
- **[pnpm](https://pnpm.io)**
- A sibling clone of [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- Optional: **`DEEPSEEK_API_KEY`** for a live model turn

Days 1–8 are designed to finish without a key. The Cordis tutorial, `--dump-config`, snapshot `session.jsonl` files, and `ctx.tools.execute` do not call a model. A key only adds a real Web or headless turn.

Put the key in a gitignored `.env` at the **harness repo root** (`../deepseek-harness/.env`), not in this repo:

```
DEEPSEEK_API_KEY=sk-...
```

Harness home (profiles, user patches) is `$DSH_HOME` if set, otherwise `~/.dsh`. The course does not require you to edit that directory on day 1.

## Start

```sh
cd ../deepseek-harness
pnpm install
pnpm run build
pnpm dsh web                          # http://127.0.0.1:3080
pnpm dsh --profile web --dump-config  # the plugin tree that actually booted
```

`dsh web` is an alias of `dsh --profile web`. With a key you can also try:

```sh
pnpm dsh --profile headless "Introduce yourself in one sentence."
```

Then open **[Day 1](course/day-01.md)**. Skim **[architecture.md](course/architecture.md)** whenever a lecture points at a figure. Do not start in `packages/`.

The first hour is meant to answer three questions only: it runs, it is a plugin tree, the tree is visible from config.

## How to use a lecture

Each `course/day-NN.md` is a lesson, not a link dump. A typical day is 4–6 hours.

1. Read **today’s goal** and the schedule.
2. Read the **explanation** in the lecture first.
3. Follow **companion reading** (official doc or named source file) in the order given.
4. Do the **lab**. Commands and expected signals are in the lecture.
5. Sit the **quiz** before you open the answers at the bottom.
6. Write the homework file named at the end of the day, in this directory.

Suggested note shape (also in the [learning path](00-学习路径.md)):

```md
# <topic>

## What it is
## Objects and events
## Source entries (path:symbol)
## What I still do not understand
```

Write it in your own words. Copying the primer is not the assignment.

Course scratch (`tmp/`, `scratch-plugin/`) belongs under the harness checkout and is gitignored there. Do not commit it here either.

## Six facts before any package

1. **Everything is a plugin.** Model adapters, the tool registry, the session log, and the agent loop itself are Cordis plugins. There is no privileged kernel to patch. Unload a plugin and its registrations reverse.
2. **A running `dsh` is a plugin tree.** A profile (`web` / `headless`) stacks bundles, then the profile `cordis.patch.yml`, then `~/.dsh/cordis.patch.yml`, then `--patch`. Inspect the result with `dsh --profile web --dump-config`. A patch replaces a row’s whole `config` by `id`; it does not deep-merge.
3. **The session log is the source of truth.** Model history is `session.deriveMessages()` over an append-only `SessionEvent` log. **Model-visible ⟺ logged.** A new input the model can see requires a new session event.
4. **Capabilities swap at a seam**, not at a concrete class. A seam is Service Definition (`ctx.<key>`) + Provider + Consumer. The template is `packages/shell`: `dsh-shell` / `dsh-bash-local` / `dsh-tool-bash`. Extension plugins depend on the definition, never on one provider.
5. **Three loop layers.** A **step** (one model request plus its tool calls) ⊂ a **turn** (draining one accepted input) ⊂ a **Round** (a policy iteration such as a Goal Round or Ralph Round). Do not collapse these words.
6. **New behavior hangs off extension points.** `dsh-agent` is the interface; `dsh-agent-loop` is the default, replaceable driver. UI, ACP, and hooks program against `ctx.agents`. Changing the loop means updating `docs/architecture.md` in the same change.

Related rules you will hit as soon as you write a plugin:

- Registrations go through `ctx.effect()` / `ctx.on()`. `register()` returns a disposer.
- A waterfall listener must call `next()` unless it is deliberately short-circuiting.
- `followup()` wakes the driver on `next-turn`; `steer()` wakes it on `next-step`; `inject()` lands on `next-step` and does **not** wake the driver.

## Course

About eight focused days for the spine, plus four optional advanced days. After day 8 you can hang a tool and a policy hook. Days 9–12 are for persistence, multi-agent, the human channel, and contributing.

Lectures: [`course/`](course/README.md). Phase map: [`00-学习路径.md`](00-学习路径.md).

| Day | Lecture | You can leave when… |
|---|---|---|
| 1 | [Run it + Cordis 01–04](course/day-01.md) | Web starts; you can write `apply(ctx)` and a waterfall |
| 2 | [Config, HMR, first real tool](course/day-02.md) | A local plugin loads under `dsh web --patch` |
| 3 | [Architecture map](course/day-03.md) | You can draw the turn flow and name the three event domains |
| 4 | [scope + session](course/day-04.md) | You can mark surface events in a real `session.jsonl` |
| 5 | [system-prompt + tools](course/day-05.md) | You can follow `register` into `request/header` |
| 6 | [llm + agent interface](course/day-06.md) | You can explain why UI talks to `ctx.agents` |
| 6b | [agent-loop](course/day-06-loop.md) | You can walk one step in `agent.ts` |
| 7 | [Boot and composition](course/day-07.md) | You can diff the `web` and `headless` trees |
| 8 | [Shell seam + write a tool](course/day-08.md) | You can add a tool and a deny hook without touching the loop |
| 9 | [Session data plane](course/day-09.md) | You can tell persistence, surface, and compaction apart |
| 10 | [Multi-agent](course/day-10.md) | You can tell subagent / goal / Ralph / workflow / jobs apart |
| 11 | [Human interaction](course/day-11.md) | You can tell commands, tools, and approval apart |
| 12 | [Product surfaces + engineering](course/day-12.md) | You know which surface to open — and which gates CI will run |

Do not skip day 3. The spine source is organized around that map. Do not start day 4 until you can redraw the turn flow yourself.

## How to read the upstream tree

Always in this order:

> architecture / glossary → subsystem page → package README → `src/index.ts` → the hot path → a test or snapshot

Package READMEs usually already state the role, the `ctx` key, the public API, and known limits. Types on subsystem pages are checked against source.

`agent-loop` is the **only** package that contains a concrete loop. Everything else is an abstract service or a plugin on an extension point. That is why the course spends three days on `packages/core` and `packages/llm/llm` before boot or the Web UI.

### Do not start here

These matter later. As an entry they drown the spine.

| Postpone | Why |
|---|---|
| `packages/client/**` | Browser half; 1000+ files; depends on the event stream you do not know yet |
| Generated catalogs end-to-end | `config-catalog`, `tool-catalog` — look up a field, do not read through |
| `docs/i18n/`, `*.i18n.yaml` | Doc machinery, not the runtime |
| `vendor/cordis` source | Primer + tutorial first; source is a third pass |
| `native/landlock-run` | Only when you work on the Linux sandbox backend |
| `packages/typert` generator | Use the gateway first |
| `.agents/notes/archived/` | Frozen history, not current authority |
| `scripts/` gate implementations | Only when you change repo process |

Current design notes live in `.agents/notes/implemented/`. After day 3, follow links from package READMEs. Do not browse the whole notes tree.

## Official dsh docs

Pinned to [`47f943859b`](https://github.com/deepseek-ai/deepseek-harness/commit/47f943859b). Locally the same files live under `../deepseek-harness/`.

| Doc | Role |
|---|---|
| [Architecture](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/architecture.md) | Cross-subsystem behavior (required) |
| [Glossary](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/glossary.md) | Domain language (required) |
| [Cordis primer](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/cordis-primer.md) | One-page plugin model |
| [Cordis tutorial](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/cordis-tutorial/index.md) | Hands-on, no API key |
| [Agent lifecycle](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/agent-lifecycle.md) | Turn / step sequence diagram |
| [Tool execution pipeline](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/tool-execution-pipeline.md) | Where policy runs outside the loop |
| [Subsystem pages](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/subsystems/README.md) | Per-service vocabulary (reference) |
| [Graph atlas](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/graph-atlas.md) | Index of generated and curated diagrams |
| [Cookbook](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/cookbook/extension-cookbook.md) | How to extend |
| [Testing](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/testing.md) | What each test command is allowed to prove |
| Upstream [README](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/README.md) | How to run dsh as a product |

Chinese counterparts use the same path with `.zh.md`.

## License

`deepseek-harness/` keeps its own MIT license and third-party notices. Materials in this repository are study notes.
