# PickleUp V4.7.0 Stable — Smart Weekly Plan

Date: 28 October 2026

- Deterministic Monday–Sunday schedule for the existing 1–5 result-day goal. The maximum of five practice suggestions includes rest days; practice sessions never appear more than twice consecutively.
- Duration options 20, 30, 45 or 60 minutes with a lighter-week toggle capped at 30 minutes/day.
- Same-lesson evidence prioritizes declines, below-target attempts, unseen lessons, then review, rotating distinct skills when feasible.
- Saved results are *annotations*, not evidence a scheduled session was completed. Short plans are excerpts, not equivalent to the 60-minute Academy lesson.
- No backend; new localStorage key `pickleup_week_plan_v47`; prior V4.6 data preserved and optional backup/restore field with validation.
- Node.js 24 unit tests and Chromium/WebKit Playwright CI, including mobile viewports, storage, PWA upgrade.

Still requires manual field QA on real devices and coach validation of content.
