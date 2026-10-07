---
name: handoff
description: Write handoff.md so a fresh session can resume the current work without re-asking anything. Use when the user asks for a handoff, says they are pausing, wrapping up, or starting a new session, or asks to "make a handoff".
---

# Handoff

The reader is a new session with none of this conversation. It must be able to continue **without asking the user anything**. Write for that reader: short, state before history, and honest about what is verified.

## Before writing

1. Re-check the facts that go stale instead of trusting memory: `git status --short`, `git branch --show-current`, `git log --oneline -8`, and whether servers or containers the work needs are running. Read the files you will name as the source of truth if you are unsure of their current state.
2. If `handoff.md` already exists at the repo root, read it and **replace** it. A handoff describes now, not an accumulating log. Keep anything from the old one only if it is still true and still needed.

## What to write

Save to `handoff.md` at the repo root, with these sections in this order. Skip a section only if it is truly empty, and say "none" instead of dropping it, so the reader knows it was considered.

1. **Goal and current state**: what is being built or solved, and where it stands right now: done, in progress, broken. Lead with this.
2. **Next step**: the single most immediate action, written as an instruction. One step, not a plan.
3. **Decisions made and why**: especially **rejected options** and who rejected them, so they are not proposed again. Include the user's explicit choices from questions.
4. **Constraints and requirements**: deadlines, format rules, tech stack, what must not change, what is out of scope.
5. **Key artifacts**: file paths, branches, commits, URLs, test commands, and which one is the source of truth for each thing.
6. **Open questions and known issues**: bugs, unverified assumptions, things that were uncertain, anything skipped or not looked at.
7. **Preferences for this task**: tone, level of detail, workflow habits (for example how the user wants commits made), and feedback to keep applying.
8. **Verbatim essentials**: exact error messages, specs, commands, or wording that would degrade if summarised. Quote them exactly.

## Rules

- **Mark trust.** Tag facts you verified this session `[confirmed]` (you ran it, read it, or the user said it) and things you inferred or recalled `[assumed]`. Do not tag everything; tag what the reader might act on.
- **State over history.** Do not narrate what happened. Include history only where it explains a decision or a trap.
- **Short.** Aim for one screen per section at most, and well under two pages in total. Cut anything the reader could rediscover in a minute from the repo.
- **Be specific.** Paths and commands, not "the config file". Dates as absolute dates.
- **No secrets.** Never copy passwords, tokens, keys, or private connection strings. Point to where they live (for example "the seed password is in `backend/src/db/seed.ts`") and note any credential the reader will need to ask for.
- **Say what is uncommitted.** List changed or untracked files that matter, and whether anything is unpushed.
- **Do not make decisions in the handoff.** If something is undecided, put it under open questions with the options and a recommendation.

## After writing

1. Reread it once as the new session would: could it start the next step right now? Fix any gap.
2. Tell the user the path, give a two-line summary (state and next step), and tell them how to resume: start a new session in this folder and say `read handoff.md and continue`.
3. Do not commit or push `handoff.md` unless the user asks. Mention that it is untracked.
