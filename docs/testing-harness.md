# Testing Harness

## Purpose

This repo uses explicit, opt-in test modes so that real providers (cloud, local, browser) only run when you ask for them.
No stubbing is allowed: every conformance/benchmark run hits real providers.

## What Each Test Is For

- Unit
  - Goal: deterministic correctness for pure logic.
  - Proves: URL building, timezone handling, model factory behavior, guardrails.
  - Does not prove: model output quality, provider availability, latency.

- Conformance
  - Goal: behavioral correctness against the Golden Dataset.
  - Proves: model outputs match expected patterns/cases.
  - Does not prove: performance trends or long-run stability.

- Benchmark
  - Goal: latency + stability profiling with report artifacts.
  - Proves: pass rate and latency metrics for each provider.
  - Does not prove: UI correctness.

- E2E
  - Goal: UI smoke tests only.
  - Proves: critical UI flows load and behave.
  - Does not prove: provider correctness or model quality.

## Script Matrix

- `npm run test:unit`
  - Runs deterministic unit tests only.
  - No providers.

- `npm run test:conformance`
  - Runs Golden Dataset tests for providers in `TEST_PROVIDERS`.
  - Fails if `TEST_PROVIDERS` is not set.

- `npm run test:conformance:local`
  - Conformance for local providers only.
  - Sets `TEST_PROVIDERS=ollama,lmstudio`.

- `npm run test:conformance:cloud`
  - Conformance for cloud providers only.
  - Sets `TEST_PROVIDERS=gemini,openrouter`.

- `npm run test:conformance:browser`
  - Conformance for browser provider only.
  - Sets `TEST_PROVIDERS=browser`.

- `npm run bench`
  - Benchmarks providers in `TEST_PROVIDERS`.
  - Always writes a JSON report to `tests/conformance/results/`.

- `npm run bench:local` / `npm run bench:cloud` / `npm run bench:browser`
  - Provider-scoped benchmarks mirroring conformance scripts.

- `npm run test:e2e`
  - UI-only Playwright smoke tests.

Note: `npm run test` is intentionally non-functional to avoid accidental real-provider runs.

## Provider Gating

Providers run only if explicitly listed in `TEST_PROVIDERS`.
Browser is treated like cloud: opt-in only.

## Env Flags

- `TEST_PROVIDERS` (required for conformance/benchmark)
  - CSV allowlist: `browser,ollama,lmstudio,gemini,openrouter`

- `TEST_GEMINI_KEY`
  - Required when `gemini` is enabled.

- `TEST_OPENROUTER_KEY`
  - Required when `openrouter` is enabled.

- `TEST_RUN_OLLAMA`
  - `true` => auto-starts Ollama and shuts it down after the run.
  - unset => requires Ollama to already be running.

- `TEST_RUN_LMSTUDIO` (optional)
  - Reserved for future LM Studio automation (no auto-start today).

- `TEST_REQUIRE_MODEL_PULL`
  - `true` => do not auto-pull missing Ollama models.
  - unset/false => auto-pulls missing Ollama models.

## Reporting

Conformance and benchmark runs emit JSON reports containing:
- dataset size
- provider status (ready/error)
- pass rate and latency metrics
- per-case results

Reports live in `tests/conformance/results/`.
