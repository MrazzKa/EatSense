# Project Context

## Repo structure (high level)
- app/ or apps/: mobile (Expo RN)
- src/: backend/api (NestJS) or shared
- workers/: background jobs, AI pipeline
- prisma/: schema/migrations (if present)
- .cursor/rules/: Cursor rules (mdc)
- .claude/: project memory + runbooks + tasks

## Core flows
1) Onboarding -> profile save -> plan generation -> subscription
2) Food photo -> upload -> vision/LLM -> normalize -> compute totals -> autosave -> history -> PDF
3) Subscriptions: currency by locale/region + plans incl Student
4) Experts: marketplace (role selection happens inside Experts tab)
