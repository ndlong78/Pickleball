# PickleUp V5.0.0 — Unified Guided Journey

Major UX milestone; **no storage schema or backend migration**.

- New dedicated lazy-loaded **Hành trình** page with a six-step training journey:
  1. Skill assessment (optional, existing Coach).
  2. Goal and recovery-aware week (existing V4.6/V4.7).
  3. Recommended Academy lesson and resume from existing selection.
  4. Accurate links to Academy step timer or existing personalized on-court plan. A library lesson is NOT silently treated as an on-court personalized plan.
  5. Explicit manual check-in for today's actual minutes, skipped status or clear. Reuses V4.8 schema.
  6. Progress/next action from existing V4.9 analytics.
- Home shortcut and desktop/tablet navigation; all previously supported pages remain.
- Read-only derived journey state except deliberate Academy lesson selection and explicit user-owned V4.8 check-ins.
- Retain all historical localStorage keys and JSON backup schema, Node.js 24, Chromium+WebKit CI.
- PWA release cache `pickleup-shell-v5-0-stable`.

Pending independent field QA: physically installed iPhone/iPad offline upgrade, timer and on-court training evaluation. Academy 80 lessons still span 1.0–4.0, **not a formal DUPR rating**.
