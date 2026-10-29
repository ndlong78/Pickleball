# PickleUp V4.8.0 — Manual practice check-ins and sustainable engineering

- Planned practice days and saved /20 assessment attempts are **not** completed workouts.
- Users manually confirm `done` with actual duration (5–180 minutes), `skipped`, or clear a day, including a rest day with an unexpected actual practice.
- Block future-day completion; provide current-week counters and an 8-week history derived **only** from manual confirmations.
- Store under new, independent localStorage key `pickleup_week_checkins_v48`. Preserve older data and include validated optional `weeklyCheckins` in JSON backups.
- Add root `AGENTS.md` with architecture, data compatibility, security, CI and release quality gates for future Codex work.
- Versioned PWA release cache `pickleup-shell-v4-8-stable`. Node.js 24 + Chromium/WebKit CI regression tests.

Field testing on physical iPhone/iPad and coaching validation remains outstanding.
