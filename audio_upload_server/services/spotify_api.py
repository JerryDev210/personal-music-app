"""
Spotify API client for fetching metadata and artwork.
"""
import os
import requests
import base64
import time
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


class SpotifyClient:
    """Spotify API client for fetching track metadata and artwork URLs."""
    
    def __init__(self):
        self.client_id = os.getenv("SPOTIFY_CLIENT_ID")
        self.client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        self.access_token: Optional[str] = None
        self.token_expiry: float = 0
    
    def _get_access_token(self) -> str:
        """Get Spotify API access token with caching."""
        # Return cached token if still valid
        if self.access_token and self.token_expiry > time.time():
            return self.access_token
        
        # Request new token
        auth_url = "https://accounts.spotify.com/api/token"
        auth_header = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        
        headers = {
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {"grant_type": "client_credentials"}
        
        response = requests.post(auth_url, headers=headers, data=data)
        response.raise_for_status()
        
        token_data = response.json()
        self.access_token = token_data["access_token"]
        # Cache token (expires in 3600 seconds = 1 hour)
        self.token_expiry = time.time() + token_data.get("expires_in", 3600) - 60
        
        return self.access_token
    
    def get_track_metadata(self, spotify_url: str) -> Dict[str, Any]:
        """
        Get track metadata and artwork from Spotify.
        
        Args:
            spotify_url: Spotify track URL (e.g., https://open.spotify.com/track/...)
        
        Returns:
            Dictionary with metadata including artwork_url and artwork_bytes
        """
        try:
            # Extract track ID from URL
            if "/track/" not in spotify_url:
                raise ValueError("Invalid Spotify track URL")
            
            track_id = spotify_url.split("/track/")[1].split("?")[0]
            
            # Get track info from Spotify API
            token = self._get_access_token()
            headers = {"Authorization": f"Bearer {token}"}
            
            response = requests.get(
                f"https://api.spotify.com/v1/tracks/{track_id}",
                headers=headers
            )
            response.raise_for_status()
            
            track_data = response.json()
            
            # Extract metadata
            album = track_data.get("album", {})
            artists = track_data.get("artists", [])
            album_artists = album.get("artists", [])
            
            # Get largest album artwork (usually 640x640)
            artwork_url = None
            if album.get("images"):
                artwork_url = album["images"][0]["url"]  # Largest image first
            
            # Download artwork for embedding
            artwork_bytes = None
            if artwork_url:
                try:
                    artwork_response = requests.get(artwork_url, timeout=10)
                    artwork_response.raise_for_status()
                    artwork_bytes = artwork_response.content
                except Exception as e:
                    print(f"Warning: Could not download artwork: {e}")
            
            metadata = {
                "title": track_data.get("name"),
                "artist": artists[0]["name"] if artists else None,
                "album": album.get("name"),
                "album_artist": album_artists[0]["name"] if album_artists else None,
                "year": int(album.get("release_date", "")[:4]) if album.get("release_date") else None,
                "duration": track_data.get("duration_ms", 0) // 1000,  # Convert to seconds
                "track_number": track_data.get("track_number"),
                "disc_number": track_data.get("disc_number"),
                "genre": None,  # Spotify API doesn't provide genre at track level
                "artwork_url": artwork_url,
                "artwork_bytes": artwork_bytes,
                "spotify_id": track_id
            }
            
            return metadata
            
        except Exception as e:
            raise Exception(f"Failed to fetch Spotify metadata: {str(e)}")


# Singleton instance
spotify_client = SpotifyClient()
