# Log a GitHub Issue

The user has provided a stream-of-consciousness description of something they noticed. Your job is to immediately log it as a GitHub issue with zero back-and-forth.

**Steps:**

1. From the user's description, infer:
   - **Type**: one of `bug`, `feature`, `enhancement`, `spike`, `chore` (pick the best fit based on their description)
   - **Title**: short, imperative, plain English (e.g. "Fix brush tool losing opacity on undo")
   - **Body**: 1–3 sentences max — just enough context to understand the issue later. No headers, no bullet points, no fluff.

2. Run `gh issue create` with:
   - `--title` set to your title
   - `--label` set to the inferred type (use the label as-is; if the label doesn't exist on the repo that's fine — gh will error and you should retry without `--label`)
   - `--body` set to your minimal body

3. Output the issue URL and number. Nothing else.

**Rules:**
- Do NOT ask clarifying questions
- Do NOT summarize what you're about to do
- Do NOT explain your reasoning
- Just create the issue and return the link
