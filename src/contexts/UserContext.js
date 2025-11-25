import React, { createContext, useState, useEffect, useCallback } from 'react';
import { storeData, getData } from '../services/cache';
import { STORAGE_KEYS, PLAYER_CONFIG } from '../config/constants';

/**
 * @typedef {import('../types/models').Track} Track
 * @typedef {import('../types/models').UserSettings} UserSettings
 */

/**
 * User Context
 * @type {React.Context<{
 *   favorites: number[],
 *   recentlyPlayed: Track[],
 *   settings: UserSettings,
 *   addToFavorites: (trackId: number) => Promise<void>,
 *   removeFromFavorites: (trackId: number) => Promise<void>,
 *   isFavorite: (trackId: number) => boolean,
 *   addToRecentlyPlayed: (track: Track) => Promise<void>,
 *   clearRecentlyPlayed: () => Promise<void>,
 *   updateSettings: (updates: Partial<UserSettings>) => Promise<void>
 * }>}
 */
export const UserContext = createContext(null);

/**
 * User Provider Component
 * Manages user preferences, favorites, and recently played tracks
 */
export const UserProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [settings, setSettings] = useState({
    volume: 1.0,
    downloadOnWifiOnly: true,
    audioQuality: 'high',
    showLyrics: false,
  });

  /**
   * Load user data on mount
   */
  useEffect(() => {
    loadUserData();
  }, []);

  /**
   * Load all user data from storage
   */
  const loadUserData = async () => {
    try {
      const [favoritesData, recentData, settingsData] = await Promise.all([
        getData(STORAGE_KEYS.FAVORITES),
        getData(STORAGE_KEYS.RECENTLY_PLAYED),
        getData(STORAGE_KEYS.USER_SETTINGS),
      ]);

      if (favoritesData) setFavorites(favoritesData);
      if (recentData) setRecentlyPlayed(recentData);
      if (settingsData) setSettings({ ...settings, ...settingsData });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  /**
   * Add a track to favorites
   * @param {number} trackId - Track ID to add
   */
  const addToFavorites = useCallback(async (trackId) => {
    try {
      if (!favorites.includes(trackId)) {
        const newFavorites = [...favorites, trackId];
        setFavorites(newFavorites);
        await storeData(STORAGE_KEYS.FAVORITES, newFavorites);
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  }, [favorites]);

  /**
   * Remove a track from favorites
   * @param {number} trackId - Track ID to remove
   */
  const removeFromFavorites = useCallback(async (trackId) => {
    try {
      const newFavorites = favorites.filter((id) => id !== trackId);
      setFavorites(newFavorites);
      await storeData(STORAGE_KEYS.FAVORITES, newFavorites);
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  }, [favorites]);

  /**
   * Check if a track is favorited
   * @param {number} trackId - Track ID to check
   * @returns {boolean}
   */
  const isFavorite = useCallback((trackId) => {
    return favorites.includes(trackId);
  }, [favorites]);

  /**
   * Add a track to recently played history
   * @param {Track} track - Track that was played
   */
  const addToRecentlyPlayed = useCallback(async (track) => {
    try {
      // Remove track if it already exists
      const filtered = recentlyPlayed.filter((t) => t.track_id !== track.track_id);
      
      // Add to beginning
      const newRecent = [
        { ...track, played_at: new Date().toISOString() },
        ...filtered,
      ].slice(0, PLAYER_CONFIG.MAX_RECENT_TRACKS); // Keep only max recent tracks

      setRecentlyPlayed(newRecent);
      await storeData(STORAGE_KEYS.RECENTLY_PLAYED, newRecent);
    } catch (error) {
      console.error('Error adding to recently played:', error);
    }
  }, [recentlyPlayed]);

  /**
   * Clear recently played history
   */
  const clearRecentlyPlayed = useCallback(async () => {
    try {
      setRecentlyPlayed([]);
      await storeData(STORAGE_KEYS.RECENTLY_PLAYED, []);
    } catch (error) {
      console.error('Error clearing recently played:', error);
    }
  }, []);

  /**
   * Update user settings
   * @param {Partial<UserSettings>} updates - Settings to update
   */
  const updateSettings = useCallback(async (updates) => {
    try {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      await storeData(STORAGE_KEYS.USER_SETTINGS, newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }, [settings]);

  const value = {
    favorites,
    recentlyPlayed,
    settings,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    addToRecentlyPlayed,
    clearRecentlyPlayed,
    updateSettings,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
