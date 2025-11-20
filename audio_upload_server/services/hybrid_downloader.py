"""
Hybrid downloader: Downloads audio from URL and embeds Spotify metadata.
"""
import os
import requests
import re
from pathlib import Path
from typing import Dict, Any
from mutagen.mp3 import MP3
from mutagen.mp4 import MP4
from mutagen.flac import FLAC
from mutagen.id3 import ID3, TIT2, TPE1, TALB, TPE2, TDRC, TRCK, TPOS, TCON, APIC


def sanitize_filename(filename: str) -> str:
    """Remove invalid characters from filename."""
    invalid_chars = r'[<>:"/\\|?*]'
    sanitized = re.sub(invalid_chars, '', filename)
    if len(sanitized) > 200:
        sanitized = sanitized[:200]
    return sanitized


def detect_audio_format(url: str, content_type: str) -> str:
    """Detect audio format from URL or Content-Type."""
    url_lower = url.lower()
    
    if '.mp3' in url_lower or 'audio/mpeg' in content_type:
        return 'mp3'
    elif '.flac' in url_lower or 'audio/flac' in content_type:
        return 'flac'
    elif '.m4a' in url_lower or 'audio/mp4' in content_type or 'audio/x-m4a' in content_type:
        return 'm4a'
    elif '.wav' in url_lower or 'audio/wav' in content_type:
        return 'wav'
    else:
        return 'mp3'  # Default to mp3


def embed_metadata_mp3(file_path: Path, spotify_metadata: Dict[str, Any]):
    """Embed Spotify metadata into MP3 file."""
    try:
        audio = MP3(str(file_path), ID3=ID3)
        
        # Add ID3v2 tag if it doesn't exist
        if audio.tags is None:
            audio.add_tags()
        
        # Clear existing tags
        audio.tags.clear()
        
        # Add Spotify metadata
        if spotify_metadata.get("title"):
            audio.tags.add(TIT2(encoding=3, text=spotify_metadata["title"]))
        if spotify_metadata.get("artist"):
            audio.tags.add(TPE1(encoding=3, text=spotify_metadata["artist"]))
        if spotify_metadata.get("album"):
            audio.tags.add(TALB(encoding=3, text=spotify_metadata["album"]))
        if spotify_metadata.get("album_artist"):
            audio.tags.add(TPE2(encoding=3, text=spotify_metadata["album_artist"]))
        if spotify_metadata.get("year"):
            audio.tags.add(TDRC(encoding=3, text=str(spotify_metadata["year"])))
        if spotify_metadata.get("track_number"):
            audio.tags.add(TRCK(encoding=3, text=str(spotify_metadata["track_number"])))
        if spotify_metadata.get("disc_number"):
            audio.tags.add(TPOS(encoding=3, text=str(spotify_metadata["disc_number"])))
        if spotify_metadata.get("genre"):
            audio.tags.add(TCON(encoding=3, text=spotify_metadata["genre"]))
        
        # Add album artwork
        if spotify_metadata.get("artwork_bytes"):
            audio.tags.add(
                APIC(
                    encoding=3,
                    mime='image/jpeg',
                    type=3,  # Cover (front)
                    desc='Cover',
                    data=spotify_metadata["artwork_bytes"]
                )
            )
        
        audio.save()
        
    except Exception as e:
        print(f"Warning: Could not embed metadata into MP3: {e}")


def embed_metadata_m4a(file_path: Path, spotify_metadata: Dict[str, Any]):
    """Embed Spotify metadata into M4A file."""
    try:
        audio = MP4(str(file_path))
        
        # Add Spotify metadata
        if spotify_metadata.get("title"):
            audio["\xa9nam"] = spotify_metadata["title"]
        if spotify_metadata.get("artist"):
            audio["\xa9ART"] = spotify_metadata["artist"]
        if spotify_metadata.get("album"):
            audio["\xa9alb"] = spotify_metadata["album"]
        if spotify_metadata.get("album_artist"):
            audio["aART"] = spotify_metadata["album_artist"]
        if spotify_metadata.get("year"):
            audio["\xa9day"] = str(spotify_metadata["year"])
        if spotify_metadata.get("track_number"):
            audio["trkn"] = [(spotify_metadata["track_number"], 0)]
        if spotify_metadata.get("disc_number"):
            audio["disk"] = [(spotify_metadata["disc_number"], 0)]
        if spotify_metadata.get("genre"):
            audio["\xa9gen"] = spotify_metadata["genre"]
        
        # Add album artwork
        if spotify_metadata.get("artwork_bytes"):
            audio["covr"] = [MP4Cover(spotify_metadata["artwork_bytes"], imageformat=MP4Cover.FORMAT_JPEG)]
        
        audio.save()
        
    except Exception as e:
        print(f"Warning: Could not embed metadata into M4A: {e}")


def embed_metadata_flac(file_path: Path, spotify_metadata: Dict[str, Any]):
    """Embed Spotify metadata into FLAC file."""
    try:
        audio = FLAC(str(file_path))
        
        # Add Spotify metadata
        if spotify_metadata.get("title"):
            audio["title"] = spotify_metadata["title"]
        if spotify_metadata.get("artist"):
            audio["artist"] = spotify_metadata["artist"]
        if spotify_metadata.get("album"):
            audio["album"] = spotify_metadata["album"]
        if spotify_metadata.get("album_artist"):
            audio["albumartist"] = spotify_metadata["album_artist"]
        if spotify_metadata.get("year"):
            audio["date"] = str(spotify_metadata["year"])
        if spotify_metadata.get("track_number"):
            audio["tracknumber"] = str(spotify_metadata["track_number"])
        if spotify_metadata.get("disc_number"):
            audio["discnumber"] = str(spotify_metadata["disc_number"])
        if spotify_metadata.get("genre"):
            audio["genre"] = spotify_metadata["genre"]
        
        # Add album artwork
        if spotify_metadata.get("artwork_bytes"):
            from mutagen.flac import Picture
            picture = Picture()
            picture.type = 3  # Cover (front)
            picture.mime = 'image/jpeg'
            picture.desc = 'Cover'
            picture.data = spotify_metadata["artwork_bytes"]
            audio.add_picture(picture)
        
        audio.save()
        
    except Exception as e:
        print(f"Warning: Could not embed metadata into FLAC: {e}")


def download_and_embed_metadata(download_url: str, spotify_metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Download audio from URL and embed Spotify metadata.
    
    Args:
        download_url: Direct download link to audio file
        spotify_metadata: Metadata from Spotify API (includes artwork_bytes)
    
    Returns:
        Dictionary with audio_bytes, filename, and combined metadata
    """
    try:
        # Step 1: Download audio file
        print(f"Downloading audio from: {download_url}")
        response = requests.get(download_url, stream=True, timeout=120)
        response.raise_for_status()
        
        audio_bytes = response.content
        print(f"Downloaded {len(audio_bytes)} bytes")
        
        # Step 2: Detect format
        content_type = response.headers.get('Content-Type', '')
        file_ext = detect_audio_format(download_url, content_type)
        
        # Step 3: Save temporarily
        temp_file = Path(f"./temp_audio.{file_ext}")
        with open(temp_file, 'wb') as f:
            f.write(audio_bytes)
        
        # Step 4: Embed Spotify metadata
        print(f"Embedding Spotify metadata into {file_ext.upper()} file...")
        if file_ext == 'mp3':
            embed_metadata_mp3(temp_file, spotify_metadata)
        elif file_ext == 'm4a':
            embed_metadata_m4a(temp_file, spotify_metadata)
        elif file_ext == 'flac':
            embed_metadata_flac(temp_file, spotify_metadata)
        
        # Step 5: Read enhanced file
        with open(temp_file, 'rb') as f:
            enhanced_audio_bytes = f.read()
        
        # Step 6: Extract final metadata (including file-specific info)
        final_metadata = extract_final_metadata(temp_file, file_ext, spotify_metadata)
        
        # Step 7: Generate filename
        artist = spotify_metadata.get("artist") or "Unknown Artist"
        title = spotify_metadata.get("title") or "Unknown Title"
        filename = sanitize_filename(f"{artist} - {title}.{file_ext}")
        
        # Step 8: Clean up temp file
        temp_file.unlink()
        
        return {
            "audio_bytes": enhanced_audio_bytes,
            "filename": filename,
            "metadata": final_metadata
        }
        
    except Exception as e:
        # Clean up on error
        if temp_file.exists():
            temp_file.unlink()
        raise Exception(f"Failed to download and embed metadata: {str(e)}")


def extract_final_metadata(file_path: Path, file_ext: str, spotify_metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Extract final metadata including file-specific info (bitrate, sample rate, etc.)."""
    metadata = spotify_metadata.copy()
    
    try:
        if file_ext == 'mp3':
            audio = MP3(str(file_path))
            metadata["duration"] = int(audio.info.length)
            metadata["bitrate"] = audio.info.bitrate
            metadata["sample_rate"] = audio.info.sample_rate
            metadata["format"] = "mp3"
            
        elif file_ext == 'm4a':
            audio = MP4(str(file_path))
            metadata["duration"] = int(audio.info.length)
            metadata["bitrate"] = audio.info.bitrate
            metadata["sample_rate"] = audio.info.sample_rate
            metadata["format"] = "m4a"
            
        elif file_ext == 'flac':
            audio = FLAC(str(file_path))
            metadata["duration"] = int(audio.info.length)
            metadata["bitrate"] = None  # FLAC is lossless
            metadata["sample_rate"] = audio.info.sample_rate
            metadata["format"] = "flac"
    
    except Exception as e:
        print(f"Warning: Could not extract file metadata: {e}")
    
    return metadata
