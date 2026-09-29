# AI Trends Investigations Dashboard

A React and TypeScript client for exploring AI-trend investigations. The dashboard brings together recent investigation summaries, source links, transcripts, and tools for creating and reviewing investigations.

## Features

- **Home:** overview cards and a snapshot of the latest investigations.
- **Trends:** browse and paginate investigations, then open detailed notes, summaries, transcripts, source links, and steering settings.
- **AI Trends:** create and review investigations using the AI-trends workspace.
- **Transcript playback:** optional text-to-speech controls for investigation content.
- Responsive layouts built with Material UI.

## Requirements

- Node.js compatible with the Vite version used by this project.
- npm.
- The API services used by the client, if you want to load or create live investigations.

## Getting started

```bash
git clone <repository-url>
cd investigations-dashboard
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The development server is configured to listen on port `3000`.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check and create a production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |

## API services

The client currently uses local service addresses in its source code:

- The Home and Trends pages use `http://127.0.0.1:8100/api/v1` for the latest investigations, investigation lists, and investigation details.
- The AI Trends workspace uses `http://localhost:8000/api/v1` for investigation creation and related operations.
- Text-to-speech sends requests to a separately configured service from `src/speech/TextToSpeech.tsx`.

Start the corresponding services for these features to work. If you deploy the client or run the API elsewhere, update the service URLs in the relevant source files and configure the API to allow requests from the client origin (CORS). These addresses are currently hard-coded rather than read from environment variables.

The Home page requests up to six latest investigations. The Trends page provides the full list and detail view. If an API is unavailable, the Home page displays an error instead of live data.

## Routes

| Path | Page |
| --- | --- |
| `/` | Home |
| `/trends` | Investigation list and details |
| `/ai-trends` | AI Trends investigation workspace |

## Deployment notes

Build the static client with `npm run build`, then serve the generated `dist/` directory using your preferred static hosting provider. Configure the host to serve `index.html` for client-side routes such as `/trends` and `/ai-trends`. Before publishing or deploying, replace local service addresses with addresses reachable from the deployed client and ensure those services are configured for the deployment environment.