import { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';

/**
 * Custom hook to access User Context
 * Provides access to favorites, recently played, and settings
 * 
 * @returns {import('../contexts/UserContext').UserContext}
 * @throws {Error} If used outside UserProvider
 * 
 * @example
 * const { 
 *   favorites, 
 *   addToFavorites, 
 *   isFavorite 
 * } = useUser();
 */
export const useUser = () => {
  const context = useContext(UserContext);
  
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
};
