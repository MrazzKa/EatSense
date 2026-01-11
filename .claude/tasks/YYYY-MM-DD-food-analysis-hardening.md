---
status: active
area: ai-food-analysis
owner: claude
branch: feat/food-analysis-hardening
---

# Goal
Make food analysis output correct and stable (names, ingredients, macros, persistence).

# Acceptance Criteria
- Correct dish name (human readable)
- Ingredients list matches photo (no hallucinated random items)
- Totals and per-ingredient macros are consistent and non-zero where expected
- Record never disappears from history; failed states are visible with retry
- Added eval cases and a repeatable test procedure

# Plan (to be approved)
- [ ] ...
- [ ] ...

# Notes / Findings
- ...

# Test checklist
- ...
