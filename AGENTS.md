# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Stack: Zero-Build

- **No build tools** (no Vite, Webpack, esbuild, etc.)
- Three.js via CDN with `es-module-shims` for bare imports
- Separate `.js` files loaded via `<script type="module">` during development
- Production: single HTML file with all JS inlined
- File structure follows `engine/`, `world/`, `player/`, `colossus/`, `game/`, `utils/` directories

## Testing: TDD (Red/Green)

- **Test runner:** Native Node.js `node:test` + `node:assert` (no test libraries)
- **Test command:** `node --test` (auto-discovers `*.test.js` files)
- **Scope:** Pure logic modules only (math, noise, input abstraction, game state, stamina, climbing logic, colossus AI state machine, procedural generation)
- **Out of scope:** Three.js-dependent code (renderer, camera, particles) — tested via manual integration
- **TDD workflow for every new feature:**
  1. Write failing test(s) for the desired behavior (RED)
  2. Implement minimal code to pass (GREEN)
  3. Refactor if needed
  4. All tests must pass before work is considered done

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

