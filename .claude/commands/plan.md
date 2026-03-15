# Plan an Implementation

> **Note:** `/plan` takes no arguments. It relies entirely on the context established by a previously run `/explore` session in the current conversation.

## Before Anything Else

Check whether `/explore` has already been run in this conversation for this issue. Look for evidence of:
- A synthesized findings write-up (current behavior, what needs to change, nuances, lift estimate)
- Resolved clarifying questions
- The "I have everything I need" sign-off

If you do NOT find this context, stop immediately and respond with:

> **`/explore` must be run before `/plan`.**
>
> `/plan` relies on the deep codebase knowledge and resolved questions gathered during `/explore`. Without it, the plan will be shallow and likely incomplete.
>
> Run `/explore <github issue number>` first, complete the back-and-forth, and then return here.

Do not proceed. Do not attempt to re-derive the explore findings yourself.

---

## Writing the Plan

If `/explore` context is present, write a complete implementation plan to `PLAN.md` in the project root. Overwrite it if it already exists.

The plan should be detailed enough that it could be handed to a developer and executed without needing to re-investigate the codebase. It should reflect everything learned during `/explore`, including non-obvious nuances and edge cases.

---

## PLAN.md Structure

```markdown
# Plan: [Issue Title] (#[issue number])

## Summary

One short paragraph describing what we're building/fixing and why.

## Relevant Context

Key facts from /explore that inform this plan — current behavior, architectural notes, gotchas, anything a developer needs to know before touching the code.

## Implementation Steps

Ordered, specific steps. Each step should name the exact file(s) involved and describe precisely what changes. Steps should be small enough to be individually verifiable.

Example format:
1. **[File: src/components/editor/Toolbar/Toolbar.jsx]** Add a new button for X. Wire it to handler Y defined in step 3.
2. ...

## Edge Cases & Nuances

Bullet list of non-obvious things to handle, informed by /explore findings. E.g. undo/redo implications, persistence, mobile vs desktop differences, coordinate system concerns, PWA constraints, etc.

## Out of Scope

Anything explicitly decided NOT to include in this change (from clarifying questions or scope decisions made during /explore).

## Verification

How to manually test that the implementation is correct. Specific steps, not vague ("click the button and see if it works" level of detail).
```

---

## After Writing PLAN.md

Tell the user the plan has been written, then give a brief summary of the key decisions and tradeoffs baked into it. Then ask:

> "Do you have any feedback, questions, or changes before we move to implementation?"

If the user has feedback:
- Update `PLAN.md` to reflect any changes
- Ask again if there's anything else
- Repeat until the user is satisfied

Once the user confirms the plan is good, tell them:

> "Plan is locked in. You're ready to implement."

Do not begin implementing. The user will initiate that separately.
