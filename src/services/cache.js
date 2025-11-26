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
 * Store data with timestamp for cache management
 * @param {string} key - Storage key
 * @param {any} value - Data to store
 * @returns {Promise<void>}
 */
export const storeCachedData = async (key, value) => {
  try {
    const cacheData = {
      data: value,
      timestamp: Date.now(),
    };
    await storeData(key, cacheData);
  } catch (error) {
    console.error(`Error storing cached data for key ${key}:`, error);
    throw error;
  }
};

/**
 * Get cached data if not expired
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
