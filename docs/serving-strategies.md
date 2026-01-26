# Serving Strategies

This project supports three model serving strategies through a unified interface. Beyond the obvious utility, this architecture enables something more interesting: a **canary benchmark** for tracking when smaller models become "good enough" for specific tasks.

## The Three Strategies

| Strategy | How it works | Privacy | Setup |
|----------|--------------|---------|-------|
| **Cloud** | API calls to remote servers (Gemini, OpenRouter) | Data leaves device | API key required |
| **Browser** | WASM/WebGPU inference in-tab (Transformers.js) | Nothing leaves the tab | Zero setup |
| **Local** | HTTP calls to localhost server (Ollama, LM Studio) | Data stays on machine | Local server required |

## Why This Matters

### Privacy Continuum
Users can choose their trust level:
- Cloud: "I trust the provider with my schedule"
- Local: "Data stays on my machine, but I run servers"
- Browser: "Zero trust—everything stays in this browser tab"

### Canary Benchmark Thesis
The goal isn't to compare a frontier model against a 3B parameter model—that's an unfair fight. The goal is to answer:

> **When does a local/browser model cross the "good enough" threshold for this task?**

By keeping the application task simple (calendar event parsing), this project becomes a clear lens for tracking that threshold over time. As local models improve, this benchmark can detect when they become viable for real assistant tasks.

### Unified Interface
All three strategies share the same contract:
- `initialize()` — setup/connect
- `generate(prompt)` — free-form text
- `generateStructured(prompt, schema)` — JSON conforming to Zod schema

This means the same test harness runs against cloud, browser, and local models without modification.

## Future Directions

*These are ideas, not roadmap.*

- **Latency benchmarking**: Extend the conformance suite to measure inference latency per strategy, not just accuracy
- **Complexity ratcheting**: As local models improve, increase task complexity (e.g., calendar context reasoning, conflict detection)
- **Threshold tracking**: Periodic benchmark runs to chart when local/browser models hit parity with cloud for this specific task
- **Progressive enhancement**: Try browser-first, fall back to cloud if confidence is low—leverage the tri-modality for graceful degradation
- **Portable eval extraction**: The golden dataset + conformance suite could become a standalone eval for calendar parsing that other projects can use
