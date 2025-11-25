import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { getTrackUri } from '../services/streaming';
import { incrementPlayCount } from '../services/tracks';
import { storeData, getData } from '../services/cache';
import { STORAGE_KEYS, REPEAT_MODE, PLAYER_CONFIG } from '../config/constants';
import {
  getNextIndex,
  getPreviousIndex,
  createQueue,
  addToQueue as addToQueueUtil,
  removeFromQueue as removeFromQueueUtil,
} from '../utils/queue';

/**
 * @typedef {import('../types/models').Track} Track
 * @typedef {import('../types/models').PlaybackState} PlaybackState
 */

/**
 * Player Context
 * @type {React.Context<PlaybackState & {
 *   play: (track?: Track) => Promise<void>,
 *   pause: () => Promise<void>,
 *   resume: () => Promise<void>,
 *   next: () => Promise<void>,
 *   previous: () => Promise<void>,
 *   seek: (seconds: number) => Promise<void>,
 *   setQueue: (tracks: Track[], startIndex?: number) => Promise<void>,
 *   addToQueue: (tracks: Track | Track[]) => void,
 *   removeFromQueue: (index: number) => void,
 *   toggleRepeat: () => void,
 *   toggleShuffle: () => void,
 *   clearQueue: () => void
 * }>}
 */
export const PlayerContext = createContext(null);

/**
 * Player Provider Component
 * Manages audio playback, queue, and playback state
 */
export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatMode, setRepeatMode] = useState(REPEAT_MODE.OFF);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);

  const progressIntervalRef = useRef(null);
  
  // Initialize audio player at component level (start with null source)
  // We'll use player.replace() to dynamically change tracks
  const player = useAudioPlayer(null);

  // Initialize audio player (expo-audio handles background playback automatically)
  useEffect(() => {
    loadSavedState();

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  /**
   * Load saved playback state from storage
   */
  const loadSavedState = async () => {
    try {
      const [savedQueue, savedIndex, savedPosition] = await Promise.all([
        getData(STORAGE_KEYS.QUEUE),
        getData(STORAGE_KEYS.QUEUE_INDEX),
        getData(STORAGE_KEYS.PLAYBACK_POSITION),
      ]);

      if (savedQueue && savedQueue.length > 0) {
        setQueue(savedQueue);
        if (savedIndex !== null) setQueueIndex(savedIndex);
        if (savedPosition !== null) setPosition(savedPosition);
      }
    } catch (error) {
      console.error('Error loading saved state:', error);
    }
  };

  /**
   * Save playback state to storage
   */
  const saveState = useCallback(async () => {
    try {
      await Promise.all([
        storeData(STORAGE_KEYS.QUEUE, queue),
        storeData(STORAGE_KEYS.QUEUE_INDEX, queueIndex),
        storeData(STORAGE_KEYS.PLAYBACK_POSITION, position),
      ]);
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }, [queue, queueIndex, position]);

  // Auto-save state when it changes
  useEffect(() => {
    if (queue.length > 0) {
      saveState();
    }
  }, [queue, queueIndex, saveState]);

  /**
   * Start progress tracking
   */
  const startProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      try {
        if (player && player.playing !== undefined) {
          setPosition(player.currentTime || 0);
          setDuration(player.duration || 0);

          // Check if track ended
          if (!player.playing && player.currentTime >= player.duration - 0.5 && player.duration > 0) {
            handleTrackEnd();
          }
        }
      } catch (error) {
        console.error('Error tracking progress:', error);
      }
    }, PLAYER_CONFIG.UPDATE_INTERVAL);
  };

  /**
   * Stop progress tracking
   */
  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  /**
   * Handle track end - play next track
   */
  const handleTrackEnd = async () => {
    const nextIdx = getNextIndex(queueIndex, queue.length, repeatMode);
    if (nextIdx !== null && nextIdx !== queueIndex) {
      await playTrackAtIndex(nextIdx);
    } else if (repeatMode === REPEAT_MODE.ONE) {
      await seek(0);
      await resume();
    } else {
      setIsPlaying(false);
      stopProgressTracking();
    }
  };

  /**
   * Load and play a track
   * @param {Track} track - Track to play
   */
  const loadTrack = async (track) => {
    try {
      setIsLoading(true);

      // Get track URI (stream or local)
      const uri = await getTrackUri(track.id);

      // Replace the audio source in the existing player
      player.replace(uri);
      
      setCurrentTrack(track);
      setPosition(0);
      
      // Start playback
      player.play();
      setIsPlaying(true);
      startProgressTracking();

      // Update play count
      incrementPlayCount(track.id);
    } catch (error) {
      console.error('Error loading track:', error);
      setIsLoading(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Play a track at specific queue index
   * @param {number} index - Queue index
   */
  const playTrackAtIndex = async (index) => {
    if (index < 0 || index >= queue.length) return;
    setQueueIndex(index);
    await loadTrack(queue[index]);
  };

  /**
   * Play a track (or resume if no track provided)
   * @param {Track} [track] - Track to play
   */
  const play = async (track) => {
    if (track) {
      await loadTrack(track);
    } else if (currentTrack && soundRef.current) {
      await resume();
    }
  };

  /**
   * Pause playback
   */
  const pause = async () => {
    if (player) {
      try {
        player.pause();
        setIsPlaying(false);
        stopProgressTracking();
      } catch (error) {
        console.error('Error pausing:', error);
      }
    }
  };

  /**
   * Resume playback
   */
  const resume = async () => {
    if (player) {
      try {
        player.play();
        setIsPlaying(true);
        startProgressTracking();
      } catch (error) {
        console.error('Error resuming:', error);
      }
    }
  };

  /**
   * Play next track in queue
   */
  const next = async () => {
    const nextIdx = getNextIndex(queueIndex, queue.length, repeatMode);
    if (nextIdx !== null) {
      await playTrackAtIndex(nextIdx);
    }
  };

  /**
   * Play previous track in queue
   */
  const previous = async () => {
    // If more than 3 seconds into track, restart current track
    if (position > 3) {
      await seek(0);
      return;
    }

    const prevIdx = getPreviousIndex(queueIndex, queue.length, repeatMode);
    if (prevIdx !== null) {
      await playTrackAtIndex(prevIdx);
    }
  };

  /**
   * Seek to position in current track
   * @param {number} seconds - Position in seconds
   */
  const seek = async (seconds) => {
    if (player) {
      try {
        player.seekTo(seconds);
        setPosition(seconds);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  };

  /**
   * Set new queue and optionally start playing
   * @param {Track[]} tracks - Array of tracks
   * @param {number} [startIndex=0] - Index to start from
   */
  const setQueueAndPlay = async (tracks, startIndex = 0) => {
    const { queue: newQueue, startIndex: newStartIndex } = createQueue(
      tracks,
      startIndex,
      shuffleEnabled
    );
    
    setQueue(newQueue);
    setQueueIndex(newStartIndex);
    await playTrackAtIndex(newStartIndex);
  };

  /**
   * Add tracks to end of queue
   * @param {Track | Track[]} tracks - Track(s) to add
   */
  const addToQueue = (tracks) => {
    const tracksArray = Array.isArray(tracks) ? tracks : [tracks];
    const newQueue = addToQueueUtil(queue, tracksArray);
    setQueue(newQueue);
  };

  /**
   * Remove track from queue
   * @param {number} index - Index to remove
   */
  const removeFromQueue = (index) => {
    const newQueue = removeFromQueueUtil(queue, index);
    setQueue(newQueue);
    
    // Adjust current index if needed
    if (index < queueIndex) {
      setQueueIndex(queueIndex - 1);
    } else if (index === queueIndex) {
      // Removed current track, stop playback
      pause();
    }
  };

  /**
   * Toggle repeat mode (off -> all -> one -> off)
   */
  const toggleRepeat = () => {
    const modes = [REPEAT_MODE.OFF, REPEAT_MODE.ALL, REPEAT_MODE.ONE];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  /**
   * Toggle shuffle mode
   */
  const toggleShuffle = () => {
    setShuffleEnabled(!shuffleEnabled);
  };

  /**
   * Clear queue and stop playback
   */
  const clearQueue = () => {
    pause();
    setQueue([]);
    setQueueIndex(0);
    setCurrentTrack(null);
  };

  const value = {
    currentTrack,
    queue,
    queueIndex,
    isPlaying,
    isLoading,
    position,
    duration,
    repeatMode,
    shuffleEnabled,
    play,
    pause,
    resume,
    next,
    previous,
    seek,
    setQueue: setQueueAndPlay,
    addToQueue,
    removeFromQueue,
    toggleRepeat,
    toggleShuffle,
    clearQueue,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};
