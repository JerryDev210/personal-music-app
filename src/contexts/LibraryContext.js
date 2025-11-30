import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  fetchTracks,
  fetchAlbums,
  fetchArtists,
  searchLibrary,
} from '../services/tracks';
import { fetchPlaylists } from '../services/playlists';
import { 
  storeCachedData, 
  getCachedData, 
  getCacheStats,
  clearNonProtectedCache,
  removeData,
} from '../services/cache';
import { STORAGE_KEYS, CACHE_TTL, CACHE_CONFIG } from '../config/constants';

/**
 * @typedef {import('../types/models').LibraryState} LibraryState
 * @typedef {import('../types/models').Track} Track
 * @typedef {import('../types/models').Album} Album
 * @typedef {import('../types/models').Artist} Artist
 * @typedef {import('../types/models').Playlist} Playlist
 */

/**
 * Library Context
 * @type {React.Context<LibraryState & {
 *   refetch: () => Promise<void>,
 *   search: (query: string) => Promise<any>,
 *   refreshTracks: () => Promise<void>,
 *   refreshAlbums: () => Promise<void>,
 *   refreshArtists: () => Promise<void>,
 *   refreshPlaylists: () => Promise<void>
 * }>}
 */
export const LibraryContext = createContext(null);

/**
 * Library Provider Component
 * Manages all music library data (tracks, albums, artists, playlists)
 */
export const LibraryProvider = ({ children }) => {
  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  /**
   * Load library data from cache first, then fetch fresh data
   */
  const loadLibrary = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Try to load from cache first
      if (!forceRefresh) {
        const cachedData = await getCachedData(
          STORAGE_KEYS.LIBRARY_CACHE,
          CACHE_TTL.LIBRARY
        );

        if (cachedData) {
          setTracks(cachedData.tracks || []);
          setAlbums(cachedData.albums || []);
          setArtists(cachedData.artists || []);
          setPlaylists(cachedData.playlists || []);
          setLastFetch(cachedData.timestamp);
          setLoading(false);
          
          // Fetch in background to update cache
          fetchFreshData();
          return;
        }
      }

      // Fetch fresh data
      await fetchFreshData();
    } catch (err) {
      console.error('Error loading library:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch fresh data from API and cache it
   */
  const fetchFreshData = async () => {
    try {
      const [tracksData, albumsData, artistsData, playlistsData] = await Promise.all([
        fetchTracks(),
        fetchAlbums(),
        fetchArtists(),
        fetchPlaylists(),
      ]);

      setTracks(tracksData.tracks || []);
      setAlbums(albumsData.albums || []);
      setArtists(artistsData.artists || []);
      setPlaylists(playlistsData.playlists || []);

      const timestamp = Date.now();
      setLastFetch(timestamp);

      // Cache the data
      await storeCachedData(STORAGE_KEYS.LIBRARY_CACHE, {
        tracks: tracksData.tracks,
        albums: albumsData.albums,
        artists: artistsData.artists,
        playlists: playlistsData.playlists,
        timestamp,
      });
    } catch (err) {
      console.error('Error fetching fresh library data:', err);
      throw err;
    }
  };

  /**
   * Force refresh all library data
   */
  const refetch = useCallback(async () => {
    await loadLibrary(true);
  }, [loadLibrary]);

  /**
   * Refresh only tracks
   */
  const refreshTracks = useCallback(async () => {
    try {
      const tracksData = await fetchTracks();
      setTracks(tracksData.tracks);
    } catch (err) {
      console.error('Error refreshing tracks:', err);
      setError(err);
    }
  }, []);

  /**
   * Refresh only albums
   */
  const refreshAlbums = useCallback(async () => {
    try {
      const albumsData = await fetchAlbums();
      setAlbums(albumsData.albums);
    } catch (err) {
      console.error('Error refreshing albums:', err);
      setError(err);
    }
  }, []);

  /**
   * Refresh only artists
   */
  const refreshArtists = useCallback(async () => {
    try {
      const artistsData = await fetchArtists();
      setArtists(artistsData.artists);
    } catch (err) {
      console.error('Error refreshing artists:', err);
      setError(err);
    }
  }, []);

  /**
   * Refresh only playlists
   */
  const refreshPlaylists = useCallback(async () => {
    try {
      const playlistsData = await fetchPlaylists();
      setPlaylists(playlistsData.playlists);
      
      // Update library cache with new playlists
      const cachedData = await getCachedData(STORAGE_KEYS.LIBRARY_CACHE, CACHE_TTL.LIBRARY);
      if (cachedData) {
        await storeCachedData(STORAGE_KEYS.LIBRARY_CACHE, {
          ...cachedData,
          playlists: playlistsData.playlists,
          timestamp: Date.now(),
        });
      }
      
      // Clear individual playlist track caches as they may be outdated
      await clearPlaylistTrackCaches();
    } catch (err) {
      console.error('Error refreshing playlists:', err);
      setError(err);
    }
  }, []);

  /**
   * Clear all playlist track caches
   */
  const clearPlaylistTrackCaches = async () => {
    try {
      const inventory = await getCacheStats();
      const playlistKeys = Object.keys(inventory).filter(key => 
        key.startsWith(STORAGE_KEYS.PLAYLIST_TRACKS_PREFIX)
      );
      
      for (const key of playlistKeys) {
        await removeData(key);
      }
    } catch (err) {
      console.error('Error clearing playlist track caches:', err);
    }
  };

  /**
   * Get cache statistics
   * @returns {Promise<{totalSize: number, entryCount: number, byType: Object}>}
   */
  const getCacheStatistics = useCallback(async () => {
    try {
      return await getCacheStats();
    } catch (err) {
      console.error('Error getting cache stats:', err);
      return { totalSize: 0, entryCount: 0, byType: {} };
    }
  }, []);

  /**
   * Clear all non-protected cache entries
   * @returns {Promise<number>} Number of entries cleared
   */
  const clearCache = useCallback(async () => {
    try {
      const cleared = await clearNonProtectedCache(CACHE_CONFIG.PROTECTED_KEYS);
      // Refetch library data after clearing cache
      await loadLibrary(true);
      return cleared;
    } catch (err) {
      console.error('Error clearing cache:', err);
      return 0;
    }
  }, [loadLibrary]);

  /**
   * Search library
   * @param {string} query - Search query
   * @returns {Promise<any>}
   */
  const search = useCallback(async (query) => {
    try {
      const results = await searchLibrary(query);
      return results;
    } catch (err) {
      console.error('Error searching library:', err);
      throw err;
    }
  }, []);

  // Load library on mount
  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const value = {
    tracks,
    albums,
    artists,
    playlists,
    loading,
    error,
    lastFetch,
    refetch,
    search,
    refreshTracks,
    refreshAlbums,
    refreshArtists,
    refreshPlaylists,
    getCacheStatistics,
    clearCache,
  };

  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
};
