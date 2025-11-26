import api from './api';
import { API_ENDPOINTS } from '../config/constants';

/**
 * @typedef {import('../types/models').Track} Track
 * @typedef {import('../types/models').Album} Album
 * @typedef {import('../types/models').Artist} Artist
 */

/**
 * Fetch all tracks from the library
 * @returns {Promise<Track[]>}
 */
export const fetchTracks = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.TRACKS);
    return response.data;
  } catch (error) {
    console.error('Error fetching tracks:', error);
    throw error;
  }
};

/**
 * Fetch a single track by ID
 * @param {number} trackId - Track ID
 * @returns {Promise<Track>}
 */
export const fetchTrackById = async (trackId) => {
  try {
    const response = await api.get(`${API_ENDPOINTS.TRACKS}/${trackId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching track ${trackId}:`, error);
    throw error;
  }
};

/**
 * Fetch all albums
 * @returns {Promise<Album[]>}
 */
export const fetchAlbums = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.ALBUMS);
    return response.data;
  } catch (error) {
    console.error('Error fetching albums:', error);
    throw error;
  }
};

/**
 * Fetch tracks for a specific album
 * @param {number} albumId - Album ID
 * @returns {Promise<Track[]>}
 */
export const fetchAlbumTracks = async (albumId) => {
  try {
    const response = await api.get(`${API_ENDPOINTS.ALBUMS}/${albumId}/tracks`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching album ${albumId} tracks:`, error);
    throw error;
  }
};

/**
 * Fetch all artists
 * @returns {Promise<Artist[]>}
 */
export const fetchArtists = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.ARTISTS);
    return response.data;
  } catch (error) {
    console.error('Error fetching artists:', error);
    throw error;
  }
};

/**
 * Fetch tracks for a specific artist
 * @param {number} artistId - Artist ID
 * @returns {Promise<Track[]>}
 */
export const fetchArtistTracks = async (artistId) => {
  try {
    const response = await api.get(`${API_ENDPOINTS.ARTISTS}/${artistId}/tracks`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching artist ${artistId} tracks:`, error);
    throw error;
  }
};

/**
 * Search for tracks, albums, or artists
 * @param {string} query - Search query
 * @param {string} [type='all'] - Search type: 'tracks', 'albums', 'artists', or 'all'
 * @returns {Promise<{tracks?: Track[], albums?: Album[], artists?: Artist[]}>}
 */
export const searchLibrary = async (query, type = 'all') => {
  try {
    const response = await api.get(API_ENDPOINTS.SEARCH, {
      params: { q: query, type },
    });
    return response.data;
  } catch (error) {
    console.error(`Error searching for "${query}":`, error);
    throw error;
  }
};

/**
 * Update play count for a track
 * @param {number} trackId - Track ID
 * @returns {Promise<void>}
 */
export const incrementPlayCount = async (trackId) => {
  try {
    await api.post(`${API_ENDPOINTS.TRACKS}/${trackId}/play`);
  } catch (error) {
    console.error(`Error updating play count for track ${trackId}:`, error);
    // Don't throw - play count is not critical
  }
};
