-- ============================================
-- Music Player D1 Database Schema (Simplified)
-- ============================================

-- Tracks table (main music library)
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  album TEXT,
  album_artist TEXT,
  genre TEXT,
  year INTEGER,
  duration INTEGER, -- in seconds
  track_number INTEGER,
  disc_number INTEGER,
  file_size INTEGER, -- in bytes
  bitrate INTEGER, -- in kbps
  sample_rate INTEGER, -- in Hz
  format TEXT, -- mp3, flac, m4a, etc.
  onedrive_item_id TEXT UNIQUE NOT NULL,
  onedrive_path TEXT,
  artwork_url TEXT,
  added_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER,
  play_count INTEGER DEFAULT 0
);

-- Albums (aggregated from tracks)
CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  artist TEXT,
  artwork_url TEXT,
  year INTEGER,
  track_count INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0, -- in seconds
  created_at INTEGER DEFAULT (unixepoch())
);

-- Artists (aggregated from tracks)
CREATE TABLE IF NOT EXISTS artists (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  artwork_url TEXT,
  track_count INTEGER DEFAULT 0,
  album_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Playlists
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  artwork_url TEXT,
  track_count INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0, -- in seconds
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER
);

-- Playlist tracks (ordered)
CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  added_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (playlist_id, track_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES for performance
-- ============================================

-- Tracks indexes
-- CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
-- CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
-- CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
-- CREATE INDEX IF NOT EXISTS idx_tracks_year ON tracks(year);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
CREATE INDEX IF NOT EXISTS idx_tracks_added_at ON tracks(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_onedrive_item ON tracks(onedrive_item_id);

-- Playlist indexes
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id, position);
-- CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks(track_id);

-- Albums and Artists indexes
-- CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(artist);
-- CREATE INDEX IF NOT EXISTS idx_albums_name ON albums(name);
-- CREATE INDEX IF NOT EXISTS idx_albums_year ON albums(year);
-- CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);

-- ============================================
-- VIEWS for common queries
-- ============================================

-- Recently added tracks
CREATE VIEW IF NOT EXISTS v_recently_added AS
SELECT * FROM tracks
ORDER BY added_at DESC
LIMIT 50;

-- Popular tracks (most played)
CREATE VIEW IF NOT EXISTS v_popular_tracks AS
SELECT * FROM tracks
ORDER BY play_count DESC
LIMIT 50;

-- Albums with track info
CREATE VIEW IF NOT EXISTS v_album_list AS
SELECT 
  a.*,
  COUNT(t.id) as actual_track_count,
  SUM(t.duration) as actual_duration
FROM albums a
LEFT JOIN tracks t ON t.album = a.name
GROUP BY a.id
ORDER BY a.name;

-- ============================================
-- TRIGGERS for data consistency
-- ============================================

-- Update playlist track count when tracks added
CREATE TRIGGER IF NOT EXISTS trg_playlist_track_count_insert
AFTER INSERT ON playlist_tracks
BEGIN
  UPDATE playlists 
  SET track_count = track_count + 1,
      updated_at = unixepoch()
  WHERE id = NEW.playlist_id;
  
  -- Update total duration
  UPDATE playlists
  SET total_duration = (
    SELECT COALESCE(SUM(t.duration), 0)
    FROM playlist_tracks pt
    JOIN tracks t ON pt.track_id = t.id
    WHERE pt.playlist_id = NEW.playlist_id
  )
  WHERE id = NEW.playlist_id;
END;

-- Update playlist track count when tracks removed
CREATE TRIGGER IF NOT EXISTS trg_playlist_track_count_delete
AFTER DELETE ON playlist_tracks
BEGIN
  UPDATE playlists 
  SET track_count = track_count - 1,
      updated_at = unixepoch()
  WHERE id = OLD.playlist_id;
  
  -- Update total duration
  UPDATE playlists
  SET total_duration = (
    SELECT COALESCE(SUM(t.duration), 0)
    FROM playlist_tracks pt
    JOIN tracks t ON pt.track_id = t.id
    WHERE pt.playlist_id = OLD.playlist_id
  )
  WHERE id = OLD.playlist_id;
END;

-- Auto-create/update artist when track inserted
CREATE TRIGGER IF NOT EXISTS trg_artist_track_insert
AFTER INSERT ON tracks
WHEN NEW.artist IS NOT NULL
BEGIN
  INSERT INTO artists (id, name, track_count)
  VALUES (
    lower(hex(randomblob(16))),
    NEW.artist,
    1
  )
  ON CONFLICT(name) DO UPDATE SET
    track_count = track_count + 1;
END;

-- Update artist count when track deleted
CREATE TRIGGER IF NOT EXISTS trg_artist_track_delete
AFTER UPDATE OF is_deleted ON tracks
WHEN OLD.is_deleted = 0 AND NEW.is_deleted = 1 AND NEW.artist IS NOT NULL
BEGIN
  UPDATE artists
  SET track_count = track_count - 1
  WHERE name = NEW.artist;
END;

-- Auto-create/update album when track inserted
CREATE TRIGGER IF NOT EXISTS trg_album_track_insert
AFTER INSERT ON tracks
WHEN NEW.album IS NOT NULL
BEGIN
  INSERT INTO albums (id, name, artist, year, track_count, artwork_url)
  VALUES (
    lower(hex(randomblob(16))),
    NEW.album,
    COALESCE(NEW.album_artist, NEW.artist),
    NEW.year,
    1,
    NEW.artwork_url
  )
  ON CONFLICT DO NOTHING;
  
  -- Update existing album
  UPDATE albums
  SET track_count = track_count + 1,
      total_duration = total_duration + COALESCE(NEW.duration, 0),
      artwork_url = COALESCE(artwork_url, NEW.artwork_url)
  WHERE name = NEW.album;
END;

-- ============================================
-- COMMON QUERIES (for Worker implementation)
-- ============================================

-- Get all tracks (paginated)
-- SELECT * FROM tracks 
-- WHERE is_deleted = 0 
-- ORDER BY added_at DESC 
-- LIMIT ? OFFSET ?;

-- Search tracks (full-text search on title, artist, album)
-- SELECT * FROM tracks
-- WHERE is_deleted = 0
--   AND (
--     title LIKE '%' || ? || '%' 
--     OR artist LIKE '%' || ? || '%' 
--     OR album LIKE '%' || ? || '%'
--   )
-- ORDER BY play_count DESC
-- LIMIT 50;

-- Get track by OneDrive item ID (for streaming)
-- SELECT * FROM tracks 
-- WHERE onedrive_item_id = ? 
--   AND is_deleted = 0;

-- Get all albums
-- SELECT * FROM albums 
-- ORDER BY name;

-- Get album tracks
-- SELECT * FROM tracks 
-- WHERE album = ? 
--   AND is_deleted = 0 
-- ORDER BY disc_number, track_number;

-- Get all artists
-- SELECT * FROM artists 
-- ORDER BY name;

-- Get artist tracks
-- SELECT * FROM tracks 
-- WHERE artist = ? 
--   AND is_deleted = 0 
-- ORDER BY year DESC, album, track_number;

-- Get playlist with tracks
-- SELECT 
--   pt.position,
--   t.*
-- FROM playlist_tracks pt
-- JOIN tracks t ON pt.track_id = t.id
-- WHERE pt.playlist_id = ?
--   AND t.is_deleted = 0
-- ORDER BY pt.position;

-- Increment play count
-- UPDATE tracks 
-- SET play_count = play_count + 1 
-- WHERE id = ?;

-- Create playlist
-- INSERT INTO playlists (id, name, description)
-- VALUES (?, ?, ?);

-- Add track to playlist
-- INSERT INTO playlist_tracks (playlist_id, track_id, position)
-- VALUES (?, ?, (
--   SELECT COALESCE(MAX(position), 0) + 1 
--   FROM playlist_tracks 
--   WHERE playlist_id = ?
-- ));

-- Remove track from playlist
-- DELETE FROM playlist_tracks 
-- WHERE playlist_id = ? AND track_id = ?;

-- Get library stats
-- SELECT 
--   COUNT(*) as total_tracks,
--   COUNT(DISTINCT artist) as total_artists,
--   COUNT(DISTINCT album) as total_albums,
--   SUM(duration) as total_duration,
--   SUM(file_size) as total_size
-- FROM tracks
-- WHERE is_deleted = 0;