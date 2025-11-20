"""
FastAPI application for audio upload server.
"""
import os
import uuid
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from dotenv import load_dotenv

from services.youtube import download_youtube_audio
from services.onedrive import onedrive_client
from utils.worker_client import worker_client

load_dotenv()

app = FastAPI(
    title="Audio Upload Server",
    description="Downloads YouTube Music audio and uploads to OneDrive",
    version="1.0.0"
)

# CORS configuration for React Native client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your React Native app origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class ImportRequest(BaseModel):
    youtube_url: HttpUrl


class ImportResponse(BaseModel):
    success: bool
    track_id: str
    title: str
    artist: str
    message: str


# Authentication dependency
async def verify_api_key(x_api_key: str = Header(None)):
    """Verify API key from request header."""
    expected_key = os.getenv("API_KEY")
    if not x_api_key or x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return x_api_key


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Audio Upload Server",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/import", response_model=ImportResponse)
async def import_track(
    request: ImportRequest,
    api_key: str = Depends(verify_api_key)
):
    try:
        # Step 1: Download from YouTube
        print(f"Downloading from YouTube: {request.youtube_url}")
        download_result = download_youtube_audio(str(request.youtube_url))
        
        audio_bytes = download_result["audio_bytes"]
        filename = download_result["filename"]
        metadata = download_result["metadata"]
        
        print(f"Downloaded: {filename} ({len(audio_bytes)} bytes)")
        
        # Step 2: Upload to OneDrive
        print(f"Uploading to OneDrive: {filename}")
        upload_result = onedrive_client.upload_file(filename, audio_bytes)
        
        print(f"Uploaded to OneDrive: {upload_result['item_id']}")
        
        # Step 3: Prepare track data for Worker
        track_id = str(uuid.uuid4())
        track_data = {
            "id": track_id,
            "title": metadata["title"] or "Unknown Title",
            "artist": metadata["artist"],
            "album": metadata["album"],
            "album_artist": metadata["album_artist"],
            "genre": metadata["genre"],
            "year": metadata["year"],
            "duration": metadata["duration"],
            "track_number": metadata["track_number"],
            "disc_number": metadata["disc_number"],
            "file_size": upload_result["file_size"],
            "bitrate": metadata["bitrate"],
            "sample_rate": metadata["sample_rate"],
            "format": metadata["format"] or "mp3",
            "onedrive_item_id": upload_result["item_id"],
            "onedrive_path": upload_result["path"],
            "artwork_url": upload_result["thumbnail_url"]
        }
        
        # Step 4: Sync to Cloudflare Worker
        print(f"Syncing metadata to Worker...")
        worker_response = worker_client.create_track(track_data)
        
        print(f"✓ Successfully imported: {metadata['title']}")
        
        return ImportResponse(
            success=True,
            track_id=track_id,
            title=metadata["title"] or "Unknown Title",
            artist=metadata["artist"] or "Unknown Artist",
            message="Track imported successfully"
        )
    
    except Exception as e:
        print(f"Error during import: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
