/**
 * Type Definitions for the Music Player App
 * These JSDoc types provide autocomplete and type checking in VS Code
 */

/**
 * @typedef {Object} Track
 * @property {number} track_id - Unique track identifier
 * @property {string} title - Track title
 * @property {string} artist - Artist name
 * @property {string} album - Album name
 * @property {number} duration - Duration in seconds
 * @property {string} file_path - OneDrive file path
 * @property {number} file_size - File size in bytes
 * @property {number} play_count - Number of times played
 * @property {string|null} album_art - Album artwork URL or path
 * @property {string|null} genre - Music genre
 * @property {number|null} year - Release year
 * @property {number|null} track_number - Track number in album
 */

/**
 * @typedef {Object} Album
 * @property {number} album_id - Unique album identifier
 * @property {string} name - Album name
 * @property {string} artist - Artist name
 * @property {number|null} year - Release year
 * @property {string|null} album_art - Album artwork URL
 * @property {number} track_count - Number of tracks in album
 */

/**
 * @typedef {Object} Artist
 * @property {number} artist_id - Unique artist identifier
 * @property {string} name - Artist name
 * @property {number} track_count - Number of tracks by artist
 * @property {number} album_count - Number of albums by artist
 */

/**
 * @typedef {Object} Playlist
 * @property {number} playlist_id - Unique playlist identifier
 * @property {string} name - Playlist name
 * @property {string|null} description - Playlist description
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 * @property {number} track_count - Number of tracks in playlist
 */

/**
 * @typedef {Object} PlaylistTrack
 * @property {number} playlist_track_id - Unique identifier
 * @property {number} playlist_id - Parent playlist ID
 * @property {number} track_id - Track ID
 * @property {number} position - Track position in playlist
 * @property {string} added_at - ISO date string
 * @property {Track} track - Full track object (when populated)
 */

/**
 * @typedef {Object} PlaybackState
 * @property {Track|null} currentTrack - Currently playing track
 * @property {Track[]} queue - Playback queue
 * @property {number} queueIndex - Current position in queue
 * @property {boolean} isPlaying - Whether audio is playing
 * @property {boolean} isLoading - Whether track is loading
 * @property {number} position - Current playback position in seconds
 * @property {number} duration - Track duration in seconds
 * @property {string} repeatMode - 'off' | 'one' | 'all'
 * @property {boolean} shuffleEnabled - Whether shuffle is on
 */

/**
 * @typedef {Object} UserSettings
 * @property {number} volume - Volume level (0-1)
 * @property {boolean} downloadOnWifiOnly - Restrict downloads to WiFi
 * @property {string} audioQuality - 'low' | 'medium' | 'high'
 * @property {boolean} showLyrics - Whether to show lyrics
 */

/**
 * @typedef {Object} LibraryState
 * @property {Track[]} tracks - All tracks
 * @property {Album[]} albums - All albums
 * @property {Artist[]} artists - All artists
 * @property {Playlist[]} playlists - All playlists
 * @property {boolean} loading - Whether library is loading
 * @property {Error|null} error - Last error if any
 * @property {number|null} lastFetch - Timestamp of last fetch
 */

export {};
