"""
YouTube download service using yt-dlp.
Downloads audio and extracts metadata.
"""
import os
import tempfile
import re
from typing import Dict, Any, Optional
import yt_dlp
from mutagen.mp3 import MP3
from mutagen.mp4 import MP4
from mutagen.flac import FLAC
from mutagen.easyid3 import EasyID3


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe filesystem usage."""
    # Remove invalid characters
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    # Replace multiple spaces with single space
    filename = re.sub(r'\s+', ' ', filename)
    # Trim and limit length
    filename = filename.strip()[:200]
    return filename


def extract_metadata_from_file(file_path: str) -> Dict[str, Any]:
    """Extract metadata from audio file using mutagen."""
    metadata = {
        "title": None,
        "artist": None,
        "album": None,
        "album_artist": None,
        "genre": None,
        "year": None,
        "duration": 0,
        "track_number": None,
        "disc_number": None,
        "bitrate": None,
        "sample_rate": None,
        "format": None
    }
    
    try:
        # Try different formats
        audio = None
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.mp3':
            audio = MP3(file_path, ID3=EasyID3)
            metadata["format"] = "mp3"
            if audio.info:
                metadata["bitrate"] = int(audio.info.bitrate / 1000)  # Convert to kbps
                metadata["sample_rate"] = audio.info.sample_rate
        elif file_ext in ['.m4a', '.mp4']:
            audio = MP4(file_path)
            metadata["format"] = "m4a"
            if audio.info:
                metadata["bitrate"] = int(audio.info.bitrate / 1000)
                metadata["sample_rate"] = audio.info.sample_rate
        elif file_ext == '.flac':
            audio = FLAC(file_path)
            metadata["format"] = "flac"
            if audio.info:
                metadata["sample_rate"] = audio.info.sample_rate
        
        if audio:
            # Duration
            if hasattr(audio.info, 'length'):
                metadata["duration"] = int(audio.info.length)
            
            # Tags
            if file_ext in ['.m4a', '.mp4']:
                # MP4 tags
                metadata["title"] = audio.get('\xa9nam', [None])[0]
                metadata["artist"] = audio.get('\xa9ART', [None])[0]
                metadata["album"] = audio.get('\xa9alb', [None])[0]
                metadata["album_artist"] = audio.get('aART', [None])[0]
                metadata["genre"] = audio.get('\xa9gen', [None])[0]
                year_tag = audio.get('\xa9day', [None])[0]
                if year_tag:
                    metadata["year"] = int(str(year_tag)[:4])
                track_tag = audio.get('trkn', [None])[0]
                if track_tag:
                    metadata["track_number"] = track_tag[0]
                disc_tag = audio.get('disk', [None])[0]
                if disc_tag:
                    metadata["disc_number"] = disc_tag[0]
            else:
                # ID3 tags (MP3, FLAC)
                metadata["title"] = audio.get('title', [None])[0]
                metadata["artist"] = audio.get('artist', [None])[0]
                metadata["album"] = audio.get('album', [None])[0]
                metadata["album_artist"] = audio.get('albumartist', [None])[0]
                metadata["genre"] = audio.get('genre', [None])[0]
                date_tag = audio.get('date', [None])[0]
                if date_tag:
                    try:
                        metadata["year"] = int(str(date_tag)[:4])
                    except:
                        pass
                track_tag = audio.get('tracknumber', [None])[0]
                if track_tag:
                    try:
                        metadata["track_number"] = int(str(track_tag).split('/')[0])
                    except:
                        pass
                disc_tag = audio.get('discnumber', [None])[0]
                if disc_tag:
                    try:
                        metadata["disc_number"] = int(str(disc_tag).split('/')[0])
                    except:
                        pass
    
    except Exception as e:
        print(f"Warning: Could not extract all metadata: {e}")
    
    return metadata


def download_youtube_audio(youtube_url: str) -> Dict[str, Any]:
    """
    Download audio from YouTube Music and extract metadata.
    
    Args:
        youtube_url: YouTube Music URL
    
    Returns:
        Dictionary with audio_bytes, metadata, and filename
    """
    # Create temporary directory for download
    temp_dir = tempfile.mkdtemp()
    
    # yt-dlp options for best audio quality
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(temp_dir, '%(title)s.%(ext)s'),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '320',
        }],
        'quiet': False,
        'no_warnings': False,
        'extract_flat': False,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info first
            info = ydl.extract_info(youtube_url, download=True)
            
            # Get downloaded file path
            downloaded_file = None
            for file in os.listdir(temp_dir):
                if file.endswith('.mp3'):
                    downloaded_file = os.path.join(temp_dir, file)
                    break
            
            if not downloaded_file:
                raise Exception("Downloaded file not found")
            
            # Extract metadata from file
            metadata = extract_metadata_from_file(downloaded_file)
            
            # Fallback to YouTube metadata if not in file
            if not metadata["title"]:
                metadata["title"] = info.get('title', 'Unknown Title')
            if not metadata["artist"]:
                metadata["artist"] = info.get('artist') or info.get('uploader', 'Unknown Artist')
            if not metadata["album"]:
                metadata["album"] = info.get('album')
            if not metadata["duration"]:
                metadata["duration"] = int(info.get('duration', 0))
            
            # Get file size
            file_size = os.path.getsize(downloaded_file)
            
            # Read file content
            with open(downloaded_file, 'rb') as f:
                audio_bytes = f.read()
            
            # Generate filename
            artist = metadata["artist"] or "Unknown Artist"
            title = metadata["title"] or "Unknown Title"
            filename = sanitize_filename(f"{artist} - {title}.mp3")
            
            # Clean up temp directory
            try:
                os.remove(downloaded_file)
                os.rmdir(temp_dir)
            except:
                pass
            
            return {
                "audio_bytes": audio_bytes,
                "filename": filename,
                "file_size": file_size,
                "metadata": metadata
            }
    
    except Exception as e:
        # Clean up temp directory on error
        try:
            for file in os.listdir(temp_dir):
                os.remove(os.path.join(temp_dir, file))
            os.rmdir(temp_dir)
        except:
            pass
        raise Exception(f"Failed to download YouTube audio: {str(e)}")
