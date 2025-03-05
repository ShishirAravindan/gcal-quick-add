# GCal Quick Add

A Progressive Web App that allows you to quickly add events to Google Calendar using natural language processing. Simply describe your event in plain English, and the app will create it in your calendar.

## Features

- Natural language processing for event creation
- Support for recurring events
- Progressive Web App (PWA) for mobile support
- Dark/Light theme support
- Multiple LLM model support (Google Gemini and Ollama)
- Keyboard shortcuts for quick event creation

## Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/gcal-quick-add.git
cd gcal-quick-add
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Deployment

The app is automatically deployed to GitHub Pages when changes are pushed to the main branch. The deployment process:

1. Builds the application using Vite
2. Generates PWA assets and service workers
3. Deploys to GitHub Pages

To manually trigger a deployment, you can:

1. Go to the Actions tab in your GitHub repository
2. Select the "Deploy to GitHub Pages" workflow
3. Click "Run workflow"

## Configuration

To use the Google Gemini model, you'll need to:

1. Get an API key from Google AI Studio
2. Enter the API key in the app's settings

For Ollama models:

1. Install Ollama locally
2. Start the Ollama server
3. Select an Ollama model in the app's settings