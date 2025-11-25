import { useContext } from 'react';
import { DownloadContext } from '../contexts/DownloadContext';

/**
 * Custom hook to access Download Context
 * Provides access to offline download functionality (stub for future implementation)
 * 
 * @returns {import('../contexts/DownloadContext').DownloadContext}
 * @throws {Error} If used outside DownloadProvider
 * 
 * @example
 * const { 
 *   downloads, 
 *   downloadTrack, 
 *   isDownloaded 
 * } = useDownloads();
 */
export const useDownloads = () => {
  const context = useContext(DownloadContext);
  
  if (!context) {
    throw new Error('useDownloads must be used within a DownloadProvider');
  }
  
  return context;
};
