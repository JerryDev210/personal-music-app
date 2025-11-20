"""
Cloudflare Worker client for syncing track metadata.
"""
import os
import requests
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()


class WorkerClient:
    def __init__(self):
        self.worker_url = os.getenv("WORKER_API_URL")
        self.api_key = os.getenv("API_KEY")
    
    def create_track(self, track_data: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.worker_url}/tracks"
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key
        }
        
        response = requests.post(url, json=track_data, headers=headers)
        response.raise_for_status()
        
        return response.json()

worker_client = WorkerClient()
