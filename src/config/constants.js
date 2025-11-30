/**
 * Application Configuration Constants
 */

// API Configuration
export const API_BASE_URL = 'https://music-player-api.jerrydev210.workers.dev';
export const API_KEY = 'YOUR_API_KEY_HERE'; // TODO: Replace with actual X-API-Key

// Cache Configuration
export const CACHE_TTL = {
  LIBRARY: 10 * 60 * 1000, // 10 minutes
  ARTWORK: 7 * 24 * 60 * 60 * 1000, // 7 days
  SEARCH: 2 * 60 * 1000, // 2 minutes
  PLAYLIST_TRACKS: 5 * 60 * 1000, // 5 minutes for individual playlist tracks
};

// Cache Management Configuration (for data caching only, not audio files)
export const CACHE_CONFIG = {
  MAX_CACHE_SIZE_MB: 50, // 50MB limit for data caching
  PROTECTED_KEYS: [
    '@music_app/library_cache',
    '@music_app/favorites',
    '@music_app/queue',
    '@music_app/queue_index',
    '@music_app/user_settings',
    '@music_app/recently_played',
  ], // Keys that should never be evicted
};

// Storage Keys
export const STORAGE_KEYS = {
  FAVORITES: '@music_app/favorites',
  RECENTLY_PLAYED: '@music_app/recently_played',
  QUEUE: '@music_app/queue',
  QUEUE_INDEX: '@music_app/queue_index',
  PLAYBACK_POSITION: '@music_app/playback_position',
  USER_SETTINGS: '@music_app/user_settings',
  LIBRARY_CACHE: '@music_app/library_cache',
  PLAYLIST_TRACKS_PREFIX: '@music_app/playlist_tracks_', // Prefix for individual playlist caches
};

// Player Configuration
export const PLAYER_CONFIG = {
  MAX_RECENT_TRACKS: 50,
  SEEK_INTERVAL: 5000, // 5 seconds
  UPDATE_INTERVAL: 1000, // 1 second for progress updates
};

// API Endpoints
export const API_ENDPOINTS = {
  TRACKS: '/api/tracks',
  ALBUMS: '/api/albums',
  ARTISTS: '/api/artists',
  PLAYLISTS: '/api/playlists',
  SEARCH: '/api/search',
  STREAM: '/api/stream',
};

// Repeat Modes
export const REPEAT_MODE = {
  OFF: 'off',
  ONE: 'one',
  ALL: 'all',
};
