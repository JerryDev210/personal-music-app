import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache utility functions for AsyncStorage
 */

/**
 * Store data in AsyncStorage
 * @param {string} key - Storage key
 * @param {any} value - Data to store
 * @returns {Promise<void>}
 */
export const storeData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error(`Error storing data for key ${key}:`, error);
    throw error;
  }
};

/**
 * Retrieve data from AsyncStorage
 * @param {string} key - Storage key
 * @returns {Promise<any|null>}
 */
export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`Error getting data for key ${key}:`, error);
    return null;
  }
};

/**
 * Remove data from AsyncStorage
 * @param {string} key - Storage key
 * @returns {Promise<void>}
 */
export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing data for key ${key}:`, error);
    throw error;
  }
};

/**
 * Store data with timestamp and metadata for cache management
 * @param {string} key - Storage key
 * @param {any} value - Data to store
 * @param {string} [type] - Cache type (optional, auto-detected from key)
 * @returns {Promise<void>}
 */
export const storeCachedData = async (key, value, type = null) => {
  try {
    const jsonString = JSON.stringify(value);
    const size = new Blob([jsonString]).size; // Calculate size in bytes
    
    const cacheData = {
      data: value,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      size: size,
      type: type || detectCacheType(key),
    };
    await storeData(key, cacheData);
  } catch (error) {
    console.error(`Error storing cached data for key ${key}:`, error);
    throw error;
  }
};

/**
 * Detect cache type from key pattern
 * @param {string} key - Storage key
 * @returns {string}
 */
const detectCacheType = (key) => {
  if (key.includes('library_cache')) return 'library';
  if (key.includes('playlist_tracks_')) return 'playlist_tracks';
  if (key.includes('cache_')) return 'api_cache';
  return 'other';
};

/**
 * Get cached data if not expired and update lastAccessed timestamp
 * @param {string} key - Storage key
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<any|null>}
 */
export const getCachedData = async (key, ttl) => {
  try {
    const cacheData = await getData(key);
    
    if (!cacheData) {
      return null;
    }

    const { data, timestamp } = cacheData;
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp < ttl) {
      // Update lastAccessed timestamp for LRU tracking
      cacheData.lastAccessed = now;
      await storeData(key, cacheData).catch(() => {
        // Silently fail if we can't update access time
      });
      return data;
    }

    // Cache expired, remove it
    await removeData(key);
    return null;
  } catch (error) {
    console.error(`Error getting cached data for key ${key}:`, error);
    return null;
  }
};

/**
 * Clear all app data from AsyncStorage
 * @returns {Promise<void>}
 */
export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Error clearing all data:', error);
    throw error;
  }
};

/**
 * Get multiple keys at once
 * @param {string[]} keys - Array of storage keys
 * @returns {Promise<Object>}
 */
export const getMultiple = async (keys) => {
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    const result = {};
    
    pairs.forEach(([key, value]) => {
      result[key] = value ? JSON.parse(value) : null;
    });
    
    return result;
  } catch (error) {
    console.error('Error getting multiple keys:', error);
    return {};
  }
};

/**
 * Get all cache keys (keys starting with @music_app/)
 * @returns {Promise<string[]>}
 */
export const getAllCacheKeys = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    // Filter for cache-related keys only
    return allKeys.filter(key => 
      key.startsWith('@music_app/') && 
      (key.includes('cache') || key.includes('_tracks_'))
    );
  } catch (error) {
    console.error('Error getting all cache keys:', error);
    return [];
  }
};

/**
 * Get cache inventory with metadata
 * @returns {Promise<Array<{key: string, size: number, lastAccessed: number, timestamp: number, type: string}>>}
 */
export const getCacheInventory = async () => {
  try {
    const keys = await getAllCacheKeys();
    const inventory = [];
    
    for (const key of keys) {
      const cacheData = await getData(key);
      if (cacheData && cacheData.size !== undefined) {
        inventory.push({
          key,
          size: cacheData.size || 0,
          lastAccessed: cacheData.lastAccessed || cacheData.timestamp || 0,
          timestamp: cacheData.timestamp || 0,
          type: cacheData.type || 'unknown',
        });
      }
    }
    
    return inventory;
  } catch (error) {
    console.error('Error getting cache inventory:', error);
    return [];
  }
};

/**
 * Calculate total cache size in bytes
 * @returns {Promise<number>}
 */
export const calculateTotalCacheSize = async () => {
  try {
    const inventory = await getCacheInventory();
    return inventory.reduce((total, entry) => total + entry.size, 0);
  } catch (error) {
    console.error('Error calculating total cache size:', error);
    return 0;
  }
};

/**
 * Get cache statistics by type
 * @returns {Promise<{totalSize: number, entryCount: number, byType: Object}>}
 */
export const getCacheStats = async () => {
  try {
    const inventory = await getCacheInventory();
    const byType = {};
    
    inventory.forEach(entry => {
      if (!byType[entry.type]) {
        byType[entry.type] = { size: 0, count: 0 };
      }
      byType[entry.type].size += entry.size;
      byType[entry.type].count += 1;
    });
    
    return {
      totalSize: inventory.reduce((sum, e) => sum + e.size, 0),
      entryCount: inventory.length,
      byType,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { totalSize: 0, entryCount: 0, byType: {} };
  }
};

/**
 * Clean up expired cache entries based on TTL
 * @returns {Promise<number>} Number of entries removed
 */
export const cleanupExpiredCache = async () => {
  try {
    const inventory = await getCacheInventory();
    const now = Date.now();
    let removedCount = 0;
    
    // Default TTL: 10 minutes (for entries without specific TTL)
    const DEFAULT_TTL = 10 * 60 * 1000;
    
    for (const entry of inventory) {
      const age = now - entry.timestamp;
      // If cache is older than default TTL, remove it
      if (age > DEFAULT_TTL) {
        await removeData(entry.key);
        removedCount++;
      }
    }
    
    return removedCount;
  } catch (error) {
    console.error('Error cleaning up expired cache:', error);
    return 0;
  }
};

/**
 * Evict cache entries using LRU (Least Recently Used) algorithm
 * @param {number} maxSizeBytes - Maximum cache size in bytes
 * @param {string[]} protectedKeys - Keys that should never be evicted
 * @returns {Promise<{evictedCount: number, freedBytes: number}>}
 */
export const evictLRUCache = async (maxSizeBytes, protectedKeys = []) => {
  try {
    const inventory = await getCacheInventory();
    
    // Calculate current total size
    const currentSize = inventory.reduce((sum, entry) => sum + entry.size, 0);
    
    // If under limit, no eviction needed
    if (currentSize <= maxSizeBytes) {
      return { evictedCount: 0, freedBytes: 0 };
    }
    
    // Filter out protected keys
    const evictableEntries = inventory.filter(
      entry => !protectedKeys.includes(entry.key)
    );
    
    // Sort by lastAccessed (oldest first)
    evictableEntries.sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    // Evict entries until we're under the limit
    let sizeToFree = currentSize - maxSizeBytes;
    let evictedCount = 0;
    let freedBytes = 0;
    
    for (const entry of evictableEntries) {
      if (sizeToFree <= 0) break;
      
      await removeData(entry.key);
      sizeToFree -= entry.size;
      freedBytes += entry.size;
      evictedCount++;
    }
    
    return { evictedCount, freedBytes };
  } catch (error) {
    console.error('Error evicting LRU cache:', error);
    return { evictedCount: 0, freedBytes: 0 };
  }
};

/**
 * Clear all non-protected cache entries
 * @param {string[]} protectedKeys - Keys to keep
 * @returns {Promise<number>} Number of entries cleared
 */
export const clearNonProtectedCache = async (protectedKeys = []) => {
  try {
    const keys = await getAllCacheKeys();
    let clearedCount = 0;
    
    for (const key of keys) {
      if (!protectedKeys.includes(key)) {
        await removeData(key);
        clearedCount++;
      }
    }
    
    return clearedCount;
  } catch (error) {
    console.error('Error clearing non-protected cache:', error);
    return 0;
  }
};
