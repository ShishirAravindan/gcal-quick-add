# GCal Quick Add

A Progressive Web App that allows you to quickly add events to Google Calendar using natural language processing. Simply describe your event in plain English, and the app will create it in your calendar.

## Features

- Natural language processing for event creation
- Support for recurring events
- Progressive Web App (PWA) for mobile support
- Dark/Light theme support
- Multiple LLM model support (Google Gemini and Ollama)
- Keyboard shortcuts for quick event creation

## Installing as App

You can install this application as a standalone app on your device:

### Desktop (Chrome/Edge)
1. Open the app in your browser
2. Click the install icon in the address bar (computer with down arrow)
3. Click "Install"

### iOS (Safari)
1. Open the app in Safari
2. Tap the "Share" button (box with arrow pointing up)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu icon (three dots)
3. Tap "Install app" or "Add to Home screen"
4. Follow the on-screen instructions

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