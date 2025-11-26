import { API_BASE_URL, API_ENDPOINTS } from '../config/constants';

/**
 * @typedef {import('../types/models').Track} Track
 */

/**
 * Generate stream URL for a track
 * @param {number} trackId - Track ID
 * @returns {string} Stream URL
 */
export const getStreamUrl = (trackId) => {
  return `${API_BASE_URL}${API_ENDPOINTS.STREAM}/${trackId}`;
};

/**
 * Get track URI for playback (stream URL or local file path)
 * This function will be extended in the future to check for downloaded tracks
 * 
 * @param {number} trackId - Track ID
 * @returns {Promise<string>} URI for audio playback
 */
export const getTrackUri = async (trackId) => {
  // TODO: Future enhancement - check if track is downloaded locally
  // const localPath = await checkLocalDownload(trackId);
  // if (localPath) {
  //   return localPath;
  // }
  
  // For now, always return stream URL
  return getStreamUrl(trackId);
};

/**
 * Check if a track is available for offline playback
 * (Stub for future offline download feature)
 * 
 * @param {number} trackId - Track ID
 * @returns {Promise<boolean>}
 */
export const isTrackDownloaded = async (trackId) => {
  // TODO: Future enhancement - check AsyncStorage or file system
  return false;
};

/**
 * Get local file path for a downloaded track
 * (Stub for future offline download feature)
 * 
 * @param {number} trackId - Track ID
 * @returns {Promise<string|null>}
 */
export const getLocalTrackPath = async (trackId) => {
  // TODO: Future enhancement - retrieve from download manager
  return null;
};
