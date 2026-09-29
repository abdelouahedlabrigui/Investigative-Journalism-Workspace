# Transcript Investigation API

A FastAPI service that turns a YouTube video transcript into a structured research-style investigation. It fetches transcript captions, lightly preprocesses the text, summarizes it, and uses a local Ollama model to generate structured investigation fields that are saved in MongoDB.

This project is designed for AI-assisted research workflows: gather transcript evidence, extract trends and themes, and store the results for search and later review.

## What it does

- Fetches a YouTube transcript from a video ID
- Cleans and preprocesses transcript text
- Produces a concise summary of the transcript
- Uses Ollama to generate structured investigation fields such as:
  - investigation title
  - target trend
  - raw notes
  - source URLs
  - external research prompt
  - steering controls
- Stores the transcript, summary, and generated fields in MongoDB
- Supports full-text search over investigation titles, trends, and notes

## Example output

```json
{
  "investigation_title": "AI hiring trends in 2026",
  "target_trend": "Generative AI replacing entry-level knowledge work",
  "raw_notes": "Interview notes about hiring freezes, automation pilots, and new evaluation practices.",
  "source_urls": [
    "https://example.com/report/ai-hiring"
  ],
  "external_info_prompt": "Compare the notes with recent public reporting.",
  "steering_controls": {
    "bias_angle": "financial",
    "tone_selector": "objective",
    "temperature": 0.7,
    "top_p": 0.9,
    "context_window_depth": 5
  }
}
```

## Tech stack

- Python 3.11+
- FastAPI
- MongoDB + Beanie
- YouTube Transcript API
- spaCy
- Ollama
- Pydantic

## Prerequisites

Before running the project, make sure you have:

- A running MongoDB instance
- Ollama installed and running locally at `http://localhost:11434`
- An available Ollama model such as `gemma4:31b-cloud` (or set `OLLAMA_MODEL` in your environment)

## Local setup

```bash
cd /path/to/transcripts_analysis
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Set environment variables if needed:

```bash
export MONGODB_URL="mongodb://localhost:27017/investigate_ai?authSource=admin"
export OLLAMA_MODEL="gemma4:31b-cloud"
```

Start the API:

```bash
python3 app/main.py
```

## API usage

### Create an investigation

`POST /api/v1/investigations/?video_id=<youtube-video-id>`

Pass only the YouTube video ID. No JSON request body is required.

```bash
curl -X POST "http://localhost:8000/api/v1/investigations/?video_id=Ks-_Mh1QhMc" | jq
```

### Search investigations

```bash
curl "http://localhost:8000/api/v1/investigations/?key=AI&limit=20&offset=0"
```

### Fetch latest investigations

```bash
curl "http://localhost:8000/api/v1/investigations/latest"
```

### Fetch one investigation by ID

```bash
curl "http://localhost:8000/api/v1/investigations/<investigation_id>"
```

## Project structure

```text
transcripts_analysis/
├── app/
│   ├── db.py
│   ├── main.py
│   ├── models.py
│   ├── routes.py
│   ├── services.py
│   └── __init__.py
├── requirements.txt
├── README.md
└── .venv/
```

## Notes

- The service uses the video ID only for transcript lookup and does not require a request body.
- Generated investigation fields are stored both at the top level of the MongoDB document and under `extracted_fields`.
- Transcript text, summaries, and metadata are saved alongside the generated analysis.

## License

This project is provided as-is for research and experimentation.
