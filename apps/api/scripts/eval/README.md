# Vision eval harness

A provider-independent way to answer one question: **did this change make food
recognition better or worse?**

It exists because that question has never had a numeric answer here. When USDA
was switched off in June 2026 the note said "9.9s → 6s with no loss of quality",
but quality was never measured — that conclusion came from latency logs. Any
future decision (a new model, a different vendor, a fine-tuned open model) needs
the same answer, on the same numbers.

Deliberately **not** built on OpenAI's Evals platform: that product is being
retired, and the whole point is to score OpenAI and non-OpenAI models on equal
terms.

## Running it

```bash
cd apps/api

# Baseline on the current production model
pnpm run eval:vision

# Any other model — everything is env-driven, no code changes
VISION_MODEL=gpt-5.4-nano pnpm run eval:vision
VISION_MODEL=gpt-5.4-mini pnpm run eval:vision

# A different vendor entirely (anything OpenAI-compatible: Groq, Together, …)
OPENAI_BASE_URL=https://api.groq.com/openai/v1 OPENAI_API_KEY=… \
  VISION_MODEL=some-vision-model pnpm run eval:vision

# Compare two saved runs
pnpm run eval:vision -- --compare results/gpt-4o-mini-*.json results/gpt-5.4-nano-*.json
```

Results are written to `scripts/eval/results/<model>-<timestamp>.json`.

## The golden set

Copy `golden-set.example.json` to `golden-set.json` and fill it in. That file is
git-ignored — it references real photos, and the point is for the set to grow
locally as `analysis_corrections` accumulates real failure cases.

Each entry:

```jsonc
{
  "id": "beshbarmak-01",
  "image": "images/beshbarmak-01.jpg",   // relative to scripts/eval/
  "locale": "ru",
  "cuisine": "local",                     // free-form tag; used to slice results
  "expected": {
    "dishName": "Бешбармак",
    "dishAliases": ["Beshbarmak", "Бесбармак"],  // any of these counts as correct
    "components": ["мясо", "тесто", "лук"],       // recall is measured against this
    "portionG": 350,
    "calories": 520,      // for the WHOLE portion, not per 100 g
    "protein": 34,
    "carbs": 45,
    "fat": 22
  }
}
```

Aim for ~40–60 entries before trusting the numbers, and skew them towards the
dishes the model actually gets wrong — local cuisine (борщ, бешбармак, плов) and
mixed plates where portion estimation is hard.

## What it measures

| Metric | Meaning |
|---|---|
| `dishTop1` | share of photos where the dish name matched (or matched an alias) |
| `componentRecall` | share of expected components the model found |
| `portionMae` | mean absolute error of total portion, grams |
| `caloriesMae` | mean absolute error of total calories |
| `proteinMae` / `carbsMae` / `fatMae` | same, per macro, grams |
| `latencyP50` / `latencyP95` | milliseconds per photo |
| `failureRate` | share of photos the pipeline could not analyse at all |

Metrics are reported overall **and** sliced by `cuisine`, because the interesting
answer is usually "fine on Western food, bad on local dishes" rather than a
single average.
