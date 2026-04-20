---
description: Ship current changes to GitHub, Vercel (web), and TestFlight (iOS)
argument-hint: [optional commit message]
---

Ship the current worktree to every deploy target. Do the following in order — stop and ask the user if anything is ambiguous.

## 1. Commit any uncommitted work

Run `git status` and `git diff`.

- If the working tree is clean, skip to step 2.
- If there are changes:
  - If the user passed a message as `$ARGUMENTS`, use it as the commit subject.
  - Otherwise draft a conventional commit message (`feat:`, `fix:`, `chore:`…) from the diff — short subject, 1–3 line body focused on WHY.
  - Stage specific files (never `git add -A`). Skip obvious secrets (`.env*`, credential files).
  - Commit with the Co-Authored-By trailer used elsewhere in this repo.

## 2. Push to GitHub

- `git push` on the current branch.
- If the branch has no upstream, push with `-u origin <branch>`.
- Never force-push. Never `--no-verify`.

## 3. Deploy to Vercel (web)

Run `vercel --prod --yes` from the repo root (runs `npx expo export --platform web` per `vercel.json`). Run it in the background and report the production URL from the output when the deploy finishes.

## 4. Ship to TestFlight (iOS)

Run `eas build -p ios --profile production --non-interactive --auto-submit` in the background. This builds the iOS app and auto-submits to App Store Connect / TestFlight on success. Report the EAS build URL once EAS prints it.

Do **not** wait for the build to finish — Apple processing can take 15+ minutes. Just report the URL and let the user check TestFlight later.

## 5. Summarize

When all three are kicked off (not necessarily finished), give the user:
- Commit SHA + message (or "nothing to commit")
- Git push result (branch → remote)
- Vercel production URL
- EAS build URL (and note that TestFlight will show the build once Apple finishes processing)

Keep the summary under 10 lines.

## Guardrails

- If `git status` shows you're on `main`, stop and ask before committing directly — usually the user wants a feature branch + PR.
- If there are merge conflicts, resolve before pushing — never skip hooks.
- If EAS credentials or the Vercel project link is missing, stop and tell the user exactly which one to fix rather than guessing.
