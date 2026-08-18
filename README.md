# learn_dsh

English | [中文](README.zh.md)

A 12-day course on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`): from the plugin runtime to the agent loop. Not a fork, not official. Sit this repo next to an upstream checkout.

**Lectures are Chinese.** The HTML site is the intended reader (Mermaid renders there).

## Browse

```sh
./site/serve.sh
```

Open **http://127.0.0.1:8765/site/**

| Page | What |
|---|---|
| [Course table](course/README.md) | Days and gates |
| [Architecture atlas](course/architecture.md) | 23 diagrams |
| [One-request walkthrough](course/walkthrough.md) | One `followup` through the stack |
| [Cheatsheet](course/cheatsheet.md) | `ctx` keys, events, commands |
| [Common mistakes](course/mistakes.md) | What the course keeps repeating |
| [Learning path](00-学习路径.md) | Phase ↔ day, what not to open |

Verified against deepseek-harness [`47f943859b`](https://github.com/deepseek-ai/deepseek-harness/commit/47f943859b) (2026-08-13).

## Layout

```
learn_dsh/                    folder on disk, not this git root
  deepseek-harness/           upstream checkout (its own repo)
  learn/                      this repository
    site/                     localhost reader
    course/                   lectures + atlas
    01-跑起来.md …            homework stubs
```

```
.
  README.md / README.zh.md
  00-学习路径.md
  site/                       index.html · serve.sh
  course/
    README.md                 schedule (source of truth)
    architecture.md
    walkthrough.md
    cheatsheet.md
    mistakes.md
    day-01.md … day-12.md · day-06-loop.md
  01-跑起来.md … 12-工程与表面.md
```

## Prerequisites

- Node.js `^22.19 || >=24`, [pnpm](https://pnpm.io)
- Sibling clone of [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- Optional `DEEPSEEK_API_KEY` in **`../deepseek-harness/.env`** (never in this repo)

Days 1–8 work without a key. Home directory is `$DSH_HOME` or `~/.dsh`.

## Day 1 product commands

```sh
cd ../deepseek-harness
pnpm install && pnpm run build
pnpm dsh web                          # http://127.0.0.1:3080 — pick a workspace
pnpm dsh --profile web --dump-config  # the tree that actually booted
```

Then [Day 1](course/day-01.md). Do not start in `packages/`.

## How a lecture works

Read the goal → read the lecture → companion docs in order → lab → quiz (answers folded) → fill the homework stub in this directory. 4–6 hours. Notes in your own words.

## Six facts

1. **Everything is a plugin.** Loop, log, tools, adapters — all Cordis. Unload reverses registrations.
2. **A running `dsh` is a stacked plugin tree.** Bundles, then profile patch, then `~/.dsh/cordis.patch.yml`, then `--patch`. Patches replace a whole `config` by `id`.
3. **The session log is the source of truth.** Model history is `deriveMessages()`. **Model-visible ⟺ logged.**
4. **Swap capabilities at a seam** (Definition + Provider + Consumer). Depend on `dsh-shell`, never `dsh-bash-local`.
5. **Step ⊂ turn ⊂ Round.** Do not collapse the words.
6. **Hang new behavior on extension points.** `dsh-agent` is the interface; `dsh-agent-loop` is replaceable.

`followup` → `next-turn` + wake. `steer` → `next-step` + wake. `inject` → `next-step`, no wake. Waterfall observers must `next()`.

## Course

Spine ≈ 8 days + day-6 loop. Days 9–12 are optional.

| Day | Lecture | Leave when… |
|---|---|---|
| 1 | [Run it + Cordis 01–04](course/day-01.md) | Web up; you can write `apply` and a waterfall |
| 2 | [Config, HMR, first tool](course/day-02.md) | Plugin loads under `--patch` |
| 3 | [Architecture map](course/day-03.md) | You can draw the turn flow |
| 4 | [scope + session](course/day-04.md) | You can mark surface events on `text-turn` |
| 5 | [system-prompt + tools](course/day-05.md) | `register` reaches `request/header` |
| 6 | [llm + agent](course/day-06.md) | UI talks to `ctx.agents`, not the loop |
| 6b | [agent-loop](course/day-06-loop.md) | One step walked in `agent.ts` |
| 7 | [Boot](course/day-07.md) | You can diff `web` vs `headless` |
| 8 | [Shell seam + a tool](course/day-08.md) | Tool + deny hook, loop untouched |
| 9 | [Data plane](course/day-09.md) | Disk / memory / surface |
| 10 | [Multi-agent](course/day-10.md) | subagent / goal / Ralph / workflow / jobs |
| 11 | [Human channel](course/day-11.md) | Command vs tool vs approval |
| 12 | [Surfaces + engineering](course/day-12.md) | Which surface to open |

Do not skip day 3.

Read code: architecture → subsystem page → package README → `src/index.ts` → hot path → test or snapshot.

Skip as an entry: `packages/client`, generated catalogs, `vendor/cordis` source, `archived/` notes.

## Official docs

Pinned to [`47f943859b`](https://github.com/deepseek-ai/deepseek-harness/commit/47f943859b). Same paths under `../deepseek-harness/`.

| Doc | Role |
|---|---|
| [Architecture](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/architecture.md) | Cross-subsystem behavior |
| [Glossary](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/glossary.md) | Domain language |
| [Cordis tutorial](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/cordis-tutorial/index.md) | Hands-on plugin runtime |
| [Cookbook](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/docs/cookbook/extension-cookbook.md) | How to extend |
| Upstream [README](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859b/README.md) | Run dsh as a product |

## License

`deepseek-harness/` is MIT. This repo is study notes.
