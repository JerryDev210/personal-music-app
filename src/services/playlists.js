import api from './api';
import { API_ENDPOINTS } from '../config/constants';

/**
 * @typedef {import('../types/models').Playlist} Playlist
 * @typedef {import('../types/models').PlaylistTrack} PlaylistTrack
 */

/**
 * Fetch all playlists
 * @returns {Promise<Playlist[]>}
 */
export const fetchPlaylists = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.PLAYLISTS);
    return response.data;
  } catch (error) {
    console.error('Error fetching playlists:', error);
    throw error;
  }
};

/**
 * Create a new playlist
 * @param {string} name - Playlist name
 * @param {string[]} trackIds - Array of track IDs
 * @returns {Promise<Playlist>}
 */
export const createPlaylist = async (name, trackIds) => {
  try {
    const response = await api.post(API_ENDPOINTS.PLAYLISTS, {
      name,
      track_ids: trackIds,
    });
    return response.data.playlist;
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
};

/**
 * Fetch a single playlist by ID
 * @param {number} playlistId - Playlist ID
 * @returns {Promise<Playlist>}
 */
export const fetchPlaylistById = async (playlistId) => {
  try {
    const response = await api.get(`${API_ENDPOINTS.PLAYLISTS}/${playlistId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching playlist ${playlistId}:`, error);
    throw error;
  }
};

/**
 * Fetch tracks in a playlist
 * @param {number} playlistId - Playlist ID
 * @returns {Promise<PlaylistTrack[]>}
 */
export const fetchPlaylistTracks = async (playlistId) => {
  try {
    const response = await api.get(`${API_ENDPOINTS.PLAYLISTS}/${playlistId}/tracks`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching tracks for playlist ${playlistId}:`, error);
    throw error;
  }
};


/**
 * Update a playlist
 * @param {number} playlistId - Playlist ID
 * @param {Object} updates - Updates to apply
 * @param {string} [updates.name] - New name
 * @param {string} [updates.description] - New description
 * @returns {Promise<Playlist>}
 */
export const updatePlaylist = async (playlistId, updates) => {
  try {
    const response = await api.put(`${API_ENDPOINTS.PLAYLISTS}/${playlistId}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating playlist ${playlistId}:`, error);
    throw error;
  }
};

/**
 * Delete a playlist
 * @param {number} playlistId - Playlist ID
 * @returns {Promise<void>}
 */
export const deletePlaylist = async (playlistId) => {
  try {
    await api.delete(`${API_ENDPOINTS.PLAYLISTS}/${playlistId}`);
  } catch (error) {
    console.error(`Error deleting playlist ${playlistId}:`, error);
    throw error;
  }
};

/**
 * Add a track to a playlist
 * @param {number} playlistId - Playlist ID
 * @param {number} trackId - Track ID to add
 * @returns {Promise<PlaylistTrack>}
 */
export const addTrackToPlaylist = async (playlistId, trackId) => {
  try {
    const response = await api.post(
      `${API_ENDPOINTS.PLAYLISTS}/${playlistId}/tracks`,
      { track_id: trackId }
    );
    return response.data;
  } catch (error) {
    console.error(`Error adding track ${trackId} to playlist ${playlistId}:`, error);
    throw error;
  }
};

/**
 * Remove a track from a playlist
 * @param {number} playlistId - Playlist ID
 * @param {number} trackId - Track ID to remove
 * @returns {Promise<void>}
 */
export const removeTrackFromPlaylist = async (playlistId, trackId) => {
  try {
    await api.delete(`${API_ENDPOINTS.PLAYLISTS}/${playlistId}/tracks/${trackId}`);
  } catch (error) {
    console.error(`Error removing track ${trackId} from playlist ${playlistId}:`, error);
    throw error;
  }
};

/**
 * Reorder tracks in a playlist
 * @param {number} playlistId - Playlist ID
 * @param {number[]} trackIds - Array of track IDs in new order
 * @returns {Promise<void>}
 */
export const reorderPlaylistTracks = async (playlistId, trackIds) => {
  try {
    await api.put(`${API_ENDPOINTS.PLAYLISTS}/${playlistId}/tracks/reorder`, {
      track_ids: trackIds,
    });
  } catch (error) {
    console.error(`Error reordering tracks in playlist ${playlistId}:`, error);
    throw error;
  }
};
