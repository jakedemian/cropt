# Contributing to Cropt

Thanks for your interest in contributing. Cropt follows a governance model inspired by the Linux kernel — a hierarchy of trusted maintainers with clear, merit-based criteria for advancement.

---

## How Contributions Work

1. **Fork the repo** and create a branch from `main`
2. **Open a PR** with a clear description of what you changed and why
3. **PRs are reviewed** by the relevant area maintainer (see below)
4. **Merged PRs** go to `main` and deploy automatically via Vercel

All contributions must pass the existing lint checks (`npm run lint`) and not break the production build (`npm run build`).

---

## Governance

### Roles

**Top-level maintainer**
Jake Demian (@jakedemian) — sets project direction, resolves disputes, has final say on all merges until area maintainers are established.

**Area maintainers**
Trusted contributors with merge rights over a specific part of the codebase. Currently none — this role will be established as the contributor community grows.

**Contributors**
Anyone who submits a PR. No special requirements to contribute — just follow the guidelines below.

### How to Become an Area Maintainer

Maintainer status is earned, not appointed. To be considered:

1. **Track record** — at least 5 merged PRs of meaningful quality in the area you're interested in maintaining
2. **Consistency** — contributions over a period of time, not a single burst
3. **Code review participation** — actively reviewing other contributors' PRs in your area
4. **Alignment** — demonstrated understanding of the project's values (transparency, privacy, quality)

When you believe you meet these criteria, open an issue titled `Maintainer nomination: [your area]` and make your case. The decision will be made publicly in that issue thread.

---

## Areas of the Codebase

| Area | Path | Description |
|---|---|---|
| Editor | `src/components/editor/` | Konva-based canvas editor (client-only) |
| API | `src/app/api/` | Server-side routes (upload, report) |
| Feed | `src/app/page.tsx`, `src/components/feed/` | Public meme feed |
| Viewer | `src/app/m/[id]/` | Individual meme viewer |
| Lib | `src/lib/` | Database, storage, moderation clients |
| Infrastructure | `next.config.*`, `vercel.json`, migrations | Build, deploy, DB schema |

---

## Guidelines

- **Keep PRs focused** — one logical change per PR
- **No new dependencies without discussion** — open an issue first for anything that adds a package
- **No analytics or tracking** — Cropt's core promise is transparency; nothing that phones home without user knowledge will be merged
- **Mobile-first** — the app is a PWA targeting mobile users; changes to the editor or UI must work well on small screens
- **Respect the existing code style** — TypeScript for `app/` and `lib/`, JavaScript/JSX for `components/editor/`

---

## Reporting Issues

Open a GitHub issue. For security vulnerabilities, email `jakedemian@proton.me`.

> **TODO:** Set up `security@cropt.app` and `dmca@cropt.app` and replace the email above with `security@cropt.app`.

---

## Code of Conduct

Be constructive. Critique code, not people. Maintainers reserve the right to remove contributions or ban contributors who are disrespectful or act in bad faith.
