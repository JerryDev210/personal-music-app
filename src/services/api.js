import axios from 'axios';
import { API_BASE_URL, API_KEY } from '../config/constants';

/**
 * Axios instance configured for the music API
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
});

/**
 * Request interceptor for logging and modifications
 */
api.interceptors.request.use(
  (config) => {
    // Log requests in development
    if (__DEV__) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
api.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (__DEV__) {
      console.log(`[API Response] ${response.config.url}:`, response.status);
    }
    return response;
  },
  (error) => {
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      console.error(`[API Error ${status}]`, data);

      switch (status) {
        case 401:
          // Unauthorized - invalid API key
          console.error('Invalid API Key');
          break;
        case 404:
          // Not found
          console.error('Resource not found');
          break;
        case 500:
          // Server error
          console.error('Server error');
          break;
        default:
          console.error('API error:', status);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('[Network Error] No response received');
    } else {
      // Error in request setup
      console.error('[Request Setup Error]', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * Update API key dynamically (useful for configuration changes)
 * @param {string} newApiKey - New API key
 */
export const updateApiKey = (newApiKey) => {
  api.defaults.headers['X-API-Key'] = newApiKey;
};

export default api;
