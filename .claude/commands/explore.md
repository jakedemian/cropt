# Explore a GitHub Issue

You are entering **Explore Mode** for issue `$ARGUMENTS`. Your goal is to fully understand what needs to change before any planning or implementation begins. This skill is always followed by `/plan`.

---

## Step 1 — Fetch the Issue

Run `gh issue view $ARGUMENTS` to get the full issue details including title, body, labels, and any comments.

---

## Step 2 — Deep Codebase Exploration

Thoroughly read and understand every part of the codebase relevant to this issue. Do not skim. This includes:

- The files most directly involved
- Adjacent files that interact with those files (callers, consumers, related hooks/components/utils)
- Shared utilities, types, or constants the affected code relies on
- Any existing patterns in the codebase that should be followed for this type of change
- The CLAUDE.md domain language and architecture notes — check if this issue touches any documented systems (e.g. tool system, raster layer system, coordinate system, history, persistence)

Go as deep as needed. Read full files, not just snippets. If a file calls something you haven't read yet, read that too.

---

## Step 3 — Web Search (if warranted)

If the issue involves introducing something new to the project — a library, a pattern, an external service, a testing framework, etc. — search the web for current best options and tradeoffs. Use your judgment. A copy change doesn't need a web search. A "set up end-to-end tests" issue does.

---

## Step 4 — Synthesize Your Findings

After exploring, produce a clear write-up covering:

1. **What the issue is asking for** — in your own words, concisely
2. **How the relevant code currently works** — describe the current behavior and implementation
3. **What would need to change** — files, components, logic, data flow
4. **Non-obvious nuances** — edge cases, interactions with other systems, things the issue author may not have considered (e.g. undo/redo implications, persistence, mobile vs desktop, PWA constraints, coordinate system gotchas)
5. **Estimated lift** — small / medium / large, with a brief rationale
6. **Open questions** (if any) — things that are genuinely ambiguous and need the user's input before a plan can be made

---

## Step 5 — Clarifying Questions (if needed)

After presenting your findings, ask any clarifying questions that are **genuinely necessary** to lock in the scope before planning. Do not ask questions you can answer yourself through code exploration. Do not ask questions just to seem thorough.

**When questions are NOT needed:** simple bug fixes, copy changes, well-scoped small features, anything where the right implementation is unambiguous.

**When questions ARE needed:** the issue is underspecified, there are multiple valid approaches with meaningfully different tradeoffs, the scope is unclear, or a decision by the user would significantly change the implementation.

Ask all your questions at once in a single message — do not drip them one at a time.

---

## Done When

The conversation has reached a point where you have no remaining open questions and you believe you have everything needed to write a complete, detailed implementation plan. At that point, tell the user:

> "I have everything I need. Run `/plan $ARGUMENTS` when you're ready."

Do not start planning. Do not start implementing. Explore only.
