/**
 * Library handlers: Tracks, Albums, Artists, Search, Stats
 */

import { successResponse, errorResponse, validateApiKey, parseJsonBody, getPaginationParams } from '../utils.js';

export const handleLibrary = {
  /**
   * POST /api/tracks - Create new track (from audio upload server)
   */
  async createTrack(request, env) {
    // Validate API key from audio upload server
    const { valid, error } = validateApiKey(request, env);
    if (!valid) {
      return errorResponse(error, 401);
    }

    try {
      const track = await parseJsonBody(request);

      // Validate required fields
      if (!track.id || !track.title || !track.onedrive_item_id) {
        return errorResponse('Missing required fields: id, title, onedrive_item_id', 400);
      }

      // Insert track into D1
      await env.DB.prepare(`
        INSERT INTO tracks (
          id, title, artist, album, album_artist, genre, year,
          duration, track_number, disc_number, file_size, bitrate,
          sample_rate, format, onedrive_item_id, onedrive_path, artwork_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        track.id,
        track.title,
        track.artist || null,
        track.album || null,
        track.album_artist || null,
        track.genre || null,
        track.year || null,
        track.duration || 0,
        track.track_number || null,
        track.disc_number || null,
        track.file_size || 0,
        track.bitrate || null,
        track.sample_rate || null,
        track.format || 'mp3',
        track.onedrive_item_id,
        track.onedrive_path || null,
        track.artwork_url || null
      ).run();

      return successResponse({ message: 'Track created successfully', track_id: track.id }, 201);

    } catch (error) {
      console.error('Error creating track:', error);
      return errorResponse(error.message || 'Failed to create track', 500);
    }
  },

  /**
   * GET /api/tracks - Get all tracks (paginated)
   */
  async getAllTracks(request, env) {
    try {
      const url = new URL(request.url);
      const { limit, offset } = getPaginationParams(url);

      const result = await env.DB.prepare(`
        SELECT * FROM tracks
        WHERE is_deleted = 0
        ORDER BY added_at DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();

      // Get total count
      const countResult = await env.DB.prepare(`
        SELECT COUNT(*) as total FROM tracks WHERE is_deleted = 0
      `).first();

      return successResponse({
        tracks: result.results || [],
        pagination: {
          limit,
          offset,
          total: countResult.total || 0,
        },
      });

    } catch (error) {
      console.error('Error getting tracks:', error);
      return errorResponse(error.message || 'Failed to get tracks', 500);
    }
  },

  /**
   * GET /api/tracks/:id - Get single track
   */
  async getTrack(trackId, env) {
    try {
      const track = await env.DB.prepare(`
        SELECT * FROM tracks
        WHERE id = ? AND is_deleted = 0
      `).bind(trackId).first();

      if (!track) {
        return errorResponse('Track not found', 404);
      }

      return successResponse({ track });

    } catch (error) {
      console.error('Error getting track:', error);
      return errorResponse(error.message || 'Failed to get track', 500);
    }
  },

  /**
   * GET /api/albums - Get all albums
   */
  async getAllAlbums(request, env) {
    try {
      const result = await env.DB.prepare(`
        SELECT * FROM albums
        ORDER BY name
      `).all();

      return successResponse({ albums: result.results || [] });

    } catch (error) {
      console.error('Error getting albums:', error);
      return errorResponse(error.message || 'Failed to get albums', 500);
    }
  },

  /**
   * GET /api/albums/:name/tracks - Get tracks in album
   */
  async getAlbumTracks(albumName, env) {
    try {
      const result = await env.DB.prepare(`
        SELECT * FROM tracks
        WHERE album = ? AND is_deleted = 0
        ORDER BY disc_number, track_number
      `).bind(albumName).all();

      return successResponse({ tracks: result.results || [] });

    } catch (error) {
      console.error('Error getting album tracks:', error);
      return errorResponse(error.message || 'Failed to get album tracks', 500);
    }
  },

  /**
   * GET /api/artists - Get all artists
   */
  async getAllArtists(request, env) {
    try {
      const result = await env.DB.prepare(`
        SELECT * FROM artists
        ORDER BY name
      `).all();

      return successResponse({ artists: result.results || [] });

    } catch (error) {
      console.error('Error getting artists:', error);
      return errorResponse(error.message || 'Failed to get artists', 500);
    }
  },

  /**
   * GET /api/artists/:name/tracks - Get tracks by artist
   */
  async getArtistTracks(artistName, env) {
    try {
      const result = await env.DB.prepare(`
        SELECT * FROM tracks
        WHERE artist = ? AND is_deleted = 0
        ORDER BY year DESC, album, track_number
      `).bind(artistName).all();

      return successResponse({ tracks: result.results || [] });

    } catch (error) {
      console.error('Error getting artist tracks:', error);
      return errorResponse(error.message || 'Failed to get artist tracks', 500);
    }
  },

  /**
   * GET /api/search?q=query - Search tracks
   */
  async searchTracks(request, env) {
    try {
      const url = new URL(request.url);
      const query = url.searchParams.get('q');

      if (!query) {
        return errorResponse('Missing search query parameter "q"', 400);
      }

      const searchPattern = `%${query}%`;

      const result = await env.DB.prepare(`
        SELECT * FROM tracks
        WHERE is_deleted = 0
          AND (
            title LIKE ? OR
            artist LIKE ? OR
            album LIKE ?
          )
        ORDER BY play_count DESC
        LIMIT 50
      `).bind(searchPattern, searchPattern, searchPattern).all();

      return successResponse({ tracks: result.results || [] });

    } catch (error) {
      console.error('Error searching tracks:', error);
      return errorResponse(error.message || 'Failed to search tracks', 500);
    }
  },

  /**
   * GET /api/stats - Get library statistics
   */
  async getStats(env) {
    try {
      const stats = await env.DB.prepare(`
        SELECT
          COUNT(*) as total_tracks,
          COUNT(DISTINCT artist) as total_artists,
          COUNT(DISTINCT album) as total_albums,
          SUM(duration) as total_duration,
          SUM(file_size) as total_size
        FROM tracks
        WHERE is_deleted = 0
      `).first();

      return successResponse({ stats: stats || {} });

    } catch (error) {
      console.error('Error getting stats:', error);
      return errorResponse(error.message || 'Failed to get stats', 500);
    }
  },
};
