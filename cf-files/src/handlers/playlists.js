/**
 * Playlist handlers: CRUD operations
 */

import { successResponse, errorResponse, parseJsonBody } from '../utils.js';

export const handlePlaylists = {
  /**
   * GET /api/playlists - Get all playlists
   */
  async getAllPlaylists(env) {
    try {
      const result = await env.DB.prepare(`
        SELECT * FROM playlists
        ORDER BY created_at DESC
      `).all();

      return successResponse({ playlists: result.results || [] });

    } catch (error) {
      console.error('Error getting playlists:', error);
      return errorResponse(error.message || 'Failed to get playlists', 500);
    }
  },

  /**
   * POST /api/playlists - Create new playlist
   */
  async createPlaylist(request, env) {
    try {
      const body = await parseJsonBody(request);

      if (!body.name) {
        return errorResponse('Missing required field: name', 400);
      }

      const playlistId = crypto.randomUUID();

      await env.DB.prepare(`
        INSERT INTO playlists (id, name, description, artwork_url)
        VALUES (?, ?, ?, ?)
      `).bind(
        playlistId,
        body.name,
        body.description || null,
        body.artwork_url || null
      ).run();

      return successResponse({
        message: 'Playlist created successfully',
        playlist_id: playlistId,
      }, 201);

    } catch (error) {
      console.error('Error creating playlist:', error);
      return errorResponse(error.message || 'Failed to create playlist', 500);
    }
  },

  /**
   * GET /api/playlists/:id - Get playlist with tracks
   */
  async getPlaylist(playlistId, env) {
    try {
      // Get playlist info
      const playlist = await env.DB.prepare(`
        SELECT * FROM playlists WHERE id = ?
      `).bind(playlistId).first();

      if (!playlist) {
        return errorResponse('Playlist not found', 404);
      }

      // Get playlist tracks
      const tracks = await env.DB.prepare(`
        SELECT pt.position, t.*
        FROM playlist_tracks pt
        JOIN tracks t ON pt.track_id = t.id
        WHERE pt.playlist_id = ? AND t.is_deleted = 0
        ORDER BY pt.position
      `).bind(playlistId).all();

      return successResponse({
        playlist,
        tracks: tracks.results || [],
      });

    } catch (error) {
      console.error('Error getting playlist:', error);
      return errorResponse(error.message || 'Failed to get playlist', 500);
    }
  },

  /**
   * PUT /api/playlists/:id - Update playlist
   */
  async updatePlaylist(playlistId, request, env) {
    try {
      const body = await parseJsonBody(request);

      // Check if playlist exists
      const existing = await env.DB.prepare(`
        SELECT id FROM playlists WHERE id = ?
      `).bind(playlistId).first();

      if (!existing) {
        return errorResponse('Playlist not found', 404);
      }

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (body.name !== undefined) {
        updates.push('name = ?');
        values.push(body.name);
      }
      if (body.description !== undefined) {
        updates.push('description = ?');
        values.push(body.description);
      }
      if (body.artwork_url !== undefined) {
        updates.push('artwork_url = ?');
        values.push(body.artwork_url);
      }

      if (updates.length === 0) {
        return errorResponse('No fields to update', 400);
      }

      updates.push('updated_at = unixepoch()');
      values.push(playlistId);

      await env.DB.prepare(`
        UPDATE playlists
        SET ${updates.join(', ')}
        WHERE id = ?
      `).bind(...values).run();

      return successResponse({ message: 'Playlist updated successfully' });

    } catch (error) {
      console.error('Error updating playlist:', error);
      return errorResponse(error.message || 'Failed to update playlist', 500);
    }
  },

  /**
   * DELETE /api/playlists/:id - Delete playlist
   */
  async deletePlaylist(playlistId, env) {
    try {
      const result = await env.DB.prepare(`
        DELETE FROM playlists WHERE id = ?
      `).bind(playlistId).run();

      if (result.meta.changes === 0) {
        return errorResponse('Playlist not found', 404);
      }

      // playlist_tracks will be deleted automatically by CASCADE

      return successResponse({ message: 'Playlist deleted successfully' });

    } catch (error) {
      console.error('Error deleting playlist:', error);
      return errorResponse(error.message || 'Failed to delete playlist', 500);
    }
  },

  /**
   * POST /api/playlists/:id/tracks - Add track to playlist
   */
  async addTrackToPlaylist(playlistId, request, env) {
    try {
      const body = await parseJsonBody(request);

      if (!body.track_id) {
        return errorResponse('Missing required field: track_id', 400);
      }

      // Check if playlist exists
      const playlist = await env.DB.prepare(`
        SELECT id FROM playlists WHERE id = ?
      `).bind(playlistId).first();

      if (!playlist) {
        return errorResponse('Playlist not found', 404);
      }

      // Check if track exists
      const track = await env.DB.prepare(`
        SELECT id FROM tracks WHERE id = ? AND is_deleted = 0
      `).bind(body.track_id).first();

      if (!track) {
        return errorResponse('Track not found', 404);
      }

      // Get next position
      const maxPosition = await env.DB.prepare(`
        SELECT COALESCE(MAX(position), 0) as max_pos
        FROM playlist_tracks
        WHERE playlist_id = ?
      `).bind(playlistId).first();

      const nextPosition = (maxPosition?.max_pos || 0) + 1;

      // Add track to playlist
      await env.DB.prepare(`
        INSERT INTO playlist_tracks (playlist_id, track_id, position)
        VALUES (?, ?, ?)
      `).bind(playlistId, body.track_id, nextPosition).run();

      return successResponse({
        message: 'Track added to playlist',
        position: nextPosition,
      }, 201);

    } catch (error) {
      console.error('Error adding track to playlist:', error);
      
      // Handle duplicate track error
      if (error.message && error.message.includes('UNIQUE constraint')) {
        return errorResponse('Track already in playlist', 409);
      }
      
      return errorResponse(error.message || 'Failed to add track to playlist', 500);
    }
  },

  /**
   * DELETE /api/playlists/:playlistId/tracks/:trackId - Remove track from playlist
   */
  async removeTrackFromPlaylist(playlistId, trackId, env) {
    try {
      const result = await env.DB.prepare(`
        DELETE FROM playlist_tracks
        WHERE playlist_id = ? AND track_id = ?
      `).bind(playlistId, trackId).run();

      if (result.meta.changes === 0) {
        return errorResponse('Track not found in playlist', 404);
      }

      return successResponse({ message: 'Track removed from playlist' });

    } catch (error) {
      console.error('Error removing track from playlist:', error);
      return errorResponse(error.message || 'Failed to remove track from playlist', 500);
    }
  },
};
