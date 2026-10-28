# PickleUp V4.6.0 — Weekly Goals & Long-term Progress
Date: 28/10/2026

## Features
- Set 1–5 practice-result days per week and select a recommendation stage.
- Eight-week Monday–Sunday participation history deduplicating same-day results; counts local calendar dates rather than completed sessions.
- Conservative recommendation priority: repeated lesson decline (>=3 points), below lesson-specific assessment target, unseen lesson, then review.
- Backward-compatible backup/restore with optional weeklyGoal field and strict validation; no backend or rating claims.
- Responsive weekly dashboard loaded only on the progress page; Node.js 24, Chromium, WebKit tests.
- New PWA cache key `pickleup-shell-v4-6-stable`; existing localStorage keys untouched.

## Remaining field QA
- iPhone/iPad installed PWA and offline reload on physical devices.
- Compare coaching criteria with real drills, recording conditions consistently.
