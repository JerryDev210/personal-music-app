/**
 * @typedef {import('../types/models').Track} Track
 */

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @template T
 * @param {T[]} array - Array to shuffle
 * @returns {T[]} New shuffled array
 */
export const shuffle = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * Get the next index in queue based on repeat mode
 * @param {number} currentIndex - Current queue index
 * @param {number} queueLength - Total queue length
 * @param {string} repeatMode - 'off' | 'one' | 'all'
 * @returns {number|null} Next index or null if end of queue
 */
export const getNextIndex = (currentIndex, queueLength, repeatMode) => {
  if (queueLength === 0) return null;
  
  if (repeatMode === 'one') {
    return currentIndex;
  }
  
  if (currentIndex >= queueLength - 1) {
    // Last track in queue
    return repeatMode === 'all' ? 0 : null;
  }
  
  return currentIndex + 1;
};

/**
 * Get the previous index in queue
 * @param {number} currentIndex - Current queue index
 * @param {number} queueLength - Total queue length
 * @param {string} repeatMode - 'off' | 'one' | 'all'
 * @returns {number|null} Previous index or null if start of queue
 */
export const getPreviousIndex = (currentIndex, queueLength, repeatMode) => {
  if (queueLength === 0) return null;
  
  if (repeatMode === 'one') {
    return currentIndex;
  }
  
  if (currentIndex <= 0) {
    // First track in queue
    return repeatMode === 'all' ? queueLength - 1 : null;
  }
  
  return currentIndex - 1;
};

/**
 * Create a queue from tracks, optionally starting at a specific track
 * @param {Track[]} tracks - Array of tracks
 * @param {number} [startIndex=0] - Index to start from
 * @param {boolean} [shouldShuffle=false] - Whether to shuffle
 * @returns {{queue: Track[], startIndex: number}}
 */
export const createQueue = (tracks, startIndex = 0, shouldShuffle = false) => {
  if (shouldShuffle) {
    const startTrack = tracks[startIndex];
    const otherTracks = tracks.filter((_, i) => i !== startIndex);
    const shuffledOthers = shuffle(otherTracks);
    
    return {
      queue: [startTrack, ...shuffledOthers],
      startIndex: 0,
    };
  }
  
  return {
    queue: [...tracks],
    startIndex,
  };
};

/**
 * Insert tracks into queue at a specific position
 * @param {Track[]} currentQueue - Current queue
 * @param {Track[]} tracksToAdd - Tracks to insert
 * @param {number} position - Position to insert at
 * @returns {Track[]}
 */
export const insertIntoQueue = (currentQueue, tracksToAdd, position) => {
  const newQueue = [...currentQueue];
  newQueue.splice(position, 0, ...tracksToAdd);
  return newQueue;
};

/**
 * Add tracks to end of queue
 * @param {Track[]} currentQueue - Current queue
 * @param {Track[]} tracksToAdd - Tracks to add
 * @returns {Track[]}
 */
export const addToQueue = (currentQueue, tracksToAdd) => {
  return [...currentQueue, ...tracksToAdd];
};

/**
 * Remove a track from queue
 * @param {Track[]} currentQueue - Current queue
 * @param {number} index - Index to remove
 * @returns {Track[]}
 */
export const removeFromQueue = (currentQueue, index) => {
  return currentQueue.filter((_, i) => i !== index);
};

/**
 * Move a track within the queue
 * @param {Track[]} currentQueue - Current queue
 * @param {number} fromIndex - Source index
 * @param {number} toIndex - Destination index
 * @returns {Track[]}
 */
export const moveInQueue = (currentQueue, fromIndex, toIndex) => {
  const newQueue = [...currentQueue];
  const [track] = newQueue.splice(fromIndex, 1);
  newQueue.splice(toIndex, 0, track);
  return newQueue;
};
