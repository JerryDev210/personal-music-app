"""
FastAPI application for audio upload server.
"""
import os
import uuid
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from dotenv import load_dotenv

from services.spotify_api import spotify_client
from services.hybrid_downloader import download_and_embed_metadata
from services.onedrive import onedrive_client
from utils.worker_client import worker_client

load_dotenv()

app = FastAPI(
    title="Audio Upload Server",
    description="Hybrid audio import: Spotify metadata + Direct download link",
    version="2.0.0"
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
    spotify_url: HttpUrl  # Spotify track URL for metadata + artwork
    download_url: HttpUrl  # Direct download link for audio file


class ImportResponse(BaseModel):
    success: bool
    track_id: str
    title: str
    artist: str
    album: str
    artwork_url: str
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
        # Step 1: Get metadata + artwork from Spotify
        print(f"Fetching metadata from Spotify: {request.spotify_url}")
        spotify_metadata = spotify_client.get_track_metadata(str(request.spotify_url))
        print(f"Got Spotify metadata: {spotify_metadata['title']} by {spotify_metadata['artist']}")
        
        # Step 2: Download audio and embed Spotify metadata
        print(f"Downloading audio from: {request.download_url}")
        download_result = download_and_embed_metadata(
            str(request.download_url),
            spotify_metadata
        )
        
        audio_bytes = download_result["audio_bytes"]
        filename = download_result["filename"]
        metadata = download_result["metadata"]
        
        print(f"Downloaded and enhanced: {filename} ({len(audio_bytes)} bytes)")
        
        # Step 3: Upload to OneDrive
        print(f"Uploading to OneDrive: {filename}")
        upload_result = onedrive_client.upload_file(filename, audio_bytes)
        
        print(f"Uploaded to OneDrive: {upload_result['item_id']}")
        
        # Step 4: Prepare track data for Worker
        track_id = str(uuid.uuid4())
        track_data = {
            "id": track_id,
            "title": metadata["title"] or "Unknown Title",
            "artist": metadata["artist"] or "Unknown Artist",
            "album": metadata["album"],
            "album_artist": metadata["album_artist"],
            "genre": metadata["genre"],
            "year": metadata["year"],
            "duration": metadata["duration"],
            "track_number": metadata["track_number"],
            "disc_number": metadata["disc_number"],
            "file_size": upload_result["file_size"],
            "bitrate": metadata.get("bitrate"),
            "sample_rate": metadata.get("sample_rate"),
            "format": metadata.get("format", "mp3"),
            "onedrive_item_id": upload_result["item_id"],
            "onedrive_path": upload_result["path"],
            "artwork_url": metadata["artwork_url"]  # Use Spotify artwork URL
        }
        
        # Step 5: Sync to Cloudflare Worker
        print(f"Syncing metadata to Worker...")
        worker_response = worker_client.create_track(track_data)
        
        print(f"✓ Successfully imported: {metadata['title']} by {metadata['artist']}")
        
        return ImportResponse(
            success=True,
            track_id=track_id,
            title=metadata["title"] or "Unknown Title",
            artist=metadata["artist"] or "Unknown Artist",
            album=metadata.get("album", ""),
            artwork_url=metadata.get("artwork_url", ""),
            message="Track imported successfully"
        )
    
    except Exception as e:
        print(f"Error during import: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
