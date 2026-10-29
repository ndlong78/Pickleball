# PickleUp — Codex repository instructions

## Scope and priorities
PickleUp is a Vietnamese-language pickleball training PWA: https://github.com/ndlong78/Pickleball, deployed at https://ndlong78.github.io/Pickleball/.
Prioritize (1) correctness and local data safety, (2) mobile-first UX and accessibility, (3) reliable offline/PWA updates, (4) performance supported by measurements, and (5) small maintainable changes.

## Architecture contracts
- Static HTML/CSS/browser JavaScript; no backend or account service. Do not rewrite the app or add a framework/cloud sync without authorization.
- `index.html` is the small shell. `modules/page-catalog.js`, `modules/page-router.js`, `modules/page-loader.js` manage eight virtual pages and lazy-loaded `pages/*.html` fragments.
- Pure business logic belongs in `modules/*-core.js`; DOM and listeners in `modules/*-ui.js`.
- `sw.js` caches the shell and visited assets by release version. Offline migration must preserve localStorage.
- `tests/`: Node.js built-in test runner and Chromium/WebKit Playwright. CI uses **Node.js 24**.
- Preserve storage keys and old JSON backups; new schemas/fields must be optional, bounded, validated before import, and regression-tested.

## Product truthfulness
Six skills: `serve`, `return`, `dink`, `volley`, `position`, `strategy`. The Academy has 80 lessons (currently 1.0–4.0). Full session: 10-minute warmup, 12+12+15-minute drills, 6-minute assessment, 5-minute cooldown. Shorter workouts must be described as abbreviated.
- Compare outcomes **within the same lesson and comparable test conditions**, never claim a cross-level rating.
- Internal scores (/20) are NOT DUPR.
- A planned lesson is NOT completed; recorded assessment attempts are NOT proof of full-session attendance. Keep attendance manually confirmed.
- Encourage safe progression, recovery days, and reduced intensity when needed.

## Required engineering workflow
1. Inspect current `main`, open PRs, recent commits and GitHub Actions on every new task; do not rely on a hardcoded release number.
2. Make feature/fix branch, implement changes together with unit and Playwright tests, open PR.
3. Run `npm run test:unit` and `npm run test:responsive` (Node 24, Chromium/WebKit), including iPhone/iPad viewports and legacy/offline cases.
4. Diagnose and resolve red or flaky CI. Never disable tests or weaken assertions just to pass.
5. Merge ONLY when CI for the exact PR HEAD is green; then check both production `main` CI and GitHub Pages deployment.
6. Synchronize version in `package.json`, `PICKLEUP_BUILD`, URL `?v=` query, `sw.js` cache, and all version tests. Update README, ROADMAP, and release notes.
7. Never force-push over others, delete stored data, leak secrets, or make an irreversible change without explicit approval.
8. Use `textContent` for user-derived strings and accessible labels/touch-friendly controls. Avoid UI overflow. Measure performance before claiming improvement.

Respond in Vietnamese with completed changes, PR/commit links, exact test outcomes, merge/deployment status, and any **physical device/field QA not yet performed**. Distinguish code written, CI green, deployed and field-verified.
