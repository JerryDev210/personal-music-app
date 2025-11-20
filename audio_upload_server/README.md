# Audio Upload Server

Python FastAPI server for downloading YouTube Music audio and uploading to OneDrive/SharePoint.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and fill in your credentials

3. Run the server:
```bash
uvicorn main:app --reload --port 8000
```

## API Endpoints

- `POST /import` - Download from YouTube Music and upload to OneDrive
  - Body: `{ "youtube_url": "https://music.youtube.com/watch?v=..." }`
  - Returns: Track metadata and OneDrive item ID

- `GET /health` - Health check endpoint
