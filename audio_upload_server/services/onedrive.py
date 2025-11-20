"""
OneDrive service for uploading files and getting metadata.
Uses app-only authentication with user-specific endpoints.
"""
import os
import time
import requests
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()


class OneDriveClient:    
    def __init__(self):
        self.client_id = os.getenv("ONEDRIVE_CLIENT_ID")
        self.client_secret = os.getenv("ONEDRIVE_CLIENT_SECRET")
        self.tenant_id = os.getenv("ONEDRIVE_TENANT_ID")
        self.user_id = os.getenv("ONEDRIVE_USER_ID")
        
        # Token cache
        self.access_token: Optional[str] = None
        self.token_expiry: float = 0
        
        # Graph API base URL
        self.graph_base = "https://graph.microsoft.com/v1.0"
    
    def _get_access_token(self) -> str:
        """Get access token with caching (refreshes when expired)."""
        # Return cached token if still valid
        if self.access_token and self.token_expiry > time.time():
            return self.access_token
        
        # Request new token
        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials"
        }
        
        response = requests.post(token_url, data=data)
        response.raise_for_status()
        
        token_data = response.json()
        self.access_token = token_data["access_token"]
        # Set expiry 60 seconds before actual expiry to be safe
        self.token_expiry = time.time() + token_data["expires_in"] - 60
        
        return self.access_token
    
    def upload_file(self, filename: str, file_content: bytes) -> Dict[str, Any]:
        """
        Upload file to user's OneDrive Music folder.
        
        Args:
            filename: Name of the file (e.g., "Artist - Title.mp3")
            file_content: File content as bytes
        
        Returns:
            Dictionary with item_id, path, and thumbnail_url
        """
        token = self._get_access_token()
        
        # Upload file to /Music folder
        upload_url = f"{self.graph_base}/users/{self.user_id}/drive/root:/Music/{filename}:/content"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/octet-stream"
        }
        
        response = requests.put(upload_url, headers=headers, data=file_content)
        response.raise_for_status()
        
        item_data = response.json()
        
        # Extract item details
        item_id = item_data["id"]
        parent_path = item_data["parentReference"]["path"]
        item_name = item_data["name"]
        full_path = f"{parent_path}/{item_name}"
        file_size = item_data.get("size", 0)
        
        # Get thumbnail URL
        thumbnail_url = self._get_thumbnail_url(item_id, token)
        
        return {
            "item_id": item_id,
            "path": full_path,
            "thumbnail_url": thumbnail_url,
            "file_size": file_size
        }
    
    def _get_thumbnail_url(self, item_id: str, token: str) -> Optional[str]:
        """Get thumbnail URL for a file (for artwork)."""
        try:
            thumbnail_url = f"{self.graph_base}/users/{self.user_id}/drive/items/{item_id}/thumbnails"
            headers = {"Authorization": f"Bearer {token}"}
            
            response = requests.get(thumbnail_url, headers=headers)
            response.raise_for_status()
            
            thumbnails = response.json()
            if thumbnails.get("value") and len(thumbnails["value"]) > 0:
                # Get large thumbnail (or medium/small as fallback)
                sizes = thumbnails["value"][0]
                if "large" in sizes:
                    return sizes["large"]["url"]
                elif "medium" in sizes:
                    return sizes["medium"]["url"]
                elif "small" in sizes:
                    return sizes["small"]["url"]
        except Exception as e:
            print(f"Warning: Could not get thumbnail: {e}")
        
        return None

onedrive_client = OneDriveClient()
