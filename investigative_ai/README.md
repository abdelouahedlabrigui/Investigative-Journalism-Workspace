# Investigative AI Trends API

A FastAPI backend for creating and managing investigations into technology
trends. It stores investigation data in MongoDB, uses Hugging Face models for
embeddings and entity extraction, and streams reports from an Ollama-compatible
LLM API.

## Features

- Create, search, list, retrieve, and delete investigations
- Validate investigation inputs, including source URL formats and report
  generation controls
- Store notes, extracted entities, and generated reports
- Stream generated report text as Server-Sent Events (SSE)
- Find similar investigations to provide historical context to report generation

## Requirements

- Python and pip
- MongoDB
- An Ollama-compatible API endpoint and a model available to that endpoint

The Hugging Face embedding and named-entity-recognition models are downloaded
when the application starts for the first time. Initial startup may take a while.

## Setup

From the project directory, create and activate a virtual environment, then
install the dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
pip install -r requirements.txt
```

Configure the service using a `.env` file in the project directory:

```dotenv
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=investigate_ai
OLLAMA_BASE_URL=http://localhost:11434/api
OLLAMA_MODEL=gemma3:1b
ALLOWED_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
```

Make sure MongoDB and Ollama are running. The configured Ollama model must be
available to the Ollama server; for example, pull the default model with
`ollama pull gemma3:1b`.

Start the API from the project directory:

```bash
python3 -m app.main
```

Interactive API documentation is available at
[`http://localhost:8000/docs`](http://localhost:8000/docs). The examples below
use:

```bash
BASE_URL=http://localhost:8000
```

## API

All investigation routes are under `/api/v1/investigations`.

### Create an investigation

`POST /api/v1/investigations/` returns `201 Created`.

```bash
curl -X POST "$BASE_URL/api/v1/investigations/" \
  -H "Content-Type: application/json" \
  -d '{
    "investigation_title": "AI hiring trends in 2026",
    "target_trend": "Generative AI replacing entry-level knowledge work",
    "raw_notes": "Interview notes about hiring freezes, automation pilots, and new evaluation practices.",
    "source_urls": ["https://example.com/report/ai-hiring"],
    "external_info_prompt": "Compare the notes with recent public reporting.",
    "steering_controls": {
      "bias_angle": "financial",
      "tone_selector": "objective",
      "temperature": 0.7,
      "top_p": 0.9,
      "context_window_depth": 5
    }
  }'
```

The response includes the new investigation's `_id`; save it for subsequent
requests. `source_urls` and `external_info_prompt` are optional. Source URLs are
currently stored with the investigation but are not fetched by the service.

### List, search, retrieve, and delete

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/investigations/` | List recent investigations; accepts a `limit` query parameter (default `20`). |
| `GET` | `/api/v1/investigations/search` | Search titles and trends; accepts `search`, `skip`, and `limit` query parameters. |
| `GET` | `/api/v1/investigations/{investigation_id}` | Retrieve one investigation. |
| `DELETE` | `/api/v1/investigations/{investigation_id}` | Delete one investigation; returns `204 No Content`. |

For example, search and retrieve an investigation:

```bash
curl "$BASE_URL/api/v1/investigations/search?search=hiring&skip=0&limit=10"

INVESTIGATION_ID=<id-from-create-response>
curl "$BASE_URL/api/v1/investigations/$INVESTIGATION_ID"
```

### Stream a generated report

`POST /api/v1/investigations/{investigation_id}/stream` returns report content
as SSE events. Use `-N` to disable curl's output buffering:

```bash
curl -N -X POST \
  "$BASE_URL/api/v1/investigations/$INVESTIGATION_ID/stream" \
  -H "Accept: text/event-stream"
```

Each event's `data` field contains JSON with a text `token` and an
`is_finished` flag:

```text
data: {"token":"The report examines ","is_finished":false}

data: {"token":"recent hiring changes.","is_finished":false}

data: {"token":"","is_finished":true}
```

Append each token to the report and stop when `is_finished` is `true`. Generated
text is also saved to the investigation as it streams.

## Validation and errors

Invalid request bodies return `422 Unprocessable Entity`. Retrieving or
deleting an investigation that does not exist returns `404 Not Found`. For
details about request and response schemas, see the interactive API
documentation at `/docs`.
