# GCal Quick Add

A Progressive Web App that turns an event description into a prefilled Google Calendar event. Review, edit, and save it in Calendar.

## Features

- **Natural language parsing** for event creation (dates, times, recurrence)
- **Three serving strategies**: Cloud APIs, Browser inference, Local servers
- **PWA support** for mobile installation
- **Light and dark appearance** follows the system setting

## Serving Strategies

The app supports three model serving strategies, switchable under **Settings → Model**.

| Strategy | Examples | Trade-off |
|----------|----------|-----------|
| **Cloud** | Gemini, OpenRouter | Highest quality, requires API key |
| **Browser** | Transformers.js (LaMini-T5) | Private, no setup, runs in-tab |
| **Local** | Ollama, LM Studio | Quality + privacy, requires local server |

## Development

```bash
# Clone and install
git clone https://github.com/yourusername/gcal-quick-add.git
cd gcal-quick-add
npm install

# Start dev server
npm run dev
```

## Running Tests

```bash
# Unit tests (deterministic logic)
npm run test:unit

# E2E UI tests
npm run test:e2e

# Conformance tests (requires TEST_PROVIDERS)
TEST_PROVIDERS=browser npm run test:conformance

# Benchmark with report
TEST_PROVIDERS=browser npm run bench

# Local benchmark (auto-starts Ollama)
TEST_PROVIDERS=ollama TEST_RUN_OLLAMA=true npm run bench
```

See [docs/testing-harness.md](docs/testing-harness.md) for full test matrix and env flags.

## Configuration

**Cloud (Gemini):**
1. Get an API key from [Google AI Studio](https://aistudio.google.com/)
2. Save the key under **Settings → Connection**, then choose a Gemini model

**Local (Ollama):**
1. Install [Ollama](https://ollama.ai/)
2. Run `ollama serve`
3. Select an Ollama model in the app

## Deployment

Auto-deploys to GitHub Pages on push to `main`. Manual trigger available via Actions tab.

## Documentation

- [Architecture](docs/architecture.md) — System design and providers
- [Testing Harness](docs/testing-harness.md) — Test modes and env flags
