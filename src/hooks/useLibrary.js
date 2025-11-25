import { useContext } from 'react';
import { LibraryContext } from '../contexts/LibraryContext';

/**
 * Custom hook to access Library Context
 * Provides access to tracks, albums, artists, playlists and related functions
 * 
 * @returns {import('../contexts/LibraryContext').LibraryContext}
 * @throws {Error} If used outside LibraryProvider
 * 
 * @example
 * const { tracks, albums, loading, refetch } = useLibrary();
 */
export const useLibrary = () => {
  const context = useContext(LibraryContext);
  
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  
  return context;
};
