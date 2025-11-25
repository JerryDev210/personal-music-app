import { useContext } from 'react';
import { PlayerContext } from '../contexts/PlayerContext';

/**
 * Custom hook to access Player Context
 * Provides access to playback controls and state
 * 
 * @returns {import('../contexts/PlayerContext').PlayerContext}
 * @throws {Error} If used outside PlayerProvider
 * 
 * @example
 * const { 
 *   currentTrack, 
 *   isPlaying, 
 *   play, 
 *   pause, 
 *   next 
 * } = usePlayer();
 */
export const usePlayer = () => {
  const context = useContext(PlayerContext);
  
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  
  return context;
};
