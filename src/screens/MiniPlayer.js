import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { usePlayer } from '../hooks';
import { formatDuration } from '../utils/formatters';

/**
 * Mini Player Component
 * Shows current track and basic controls at bottom of screen
 */
export default function MiniPlayer() {
  const insets = useSafeAreaInsets();
  
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    play,
    pause,
    resume,
    next,
    previous,
    seek,
    repeatMode,
    shuffleEnabled,
    toggleRepeat,
    toggleShuffle,
  } = usePlayer();

  if (!currentTrack) {
    return null;
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const getRepeatIcon = () => {
    switch (repeatMode) {
      case 'one':
        return '🔂';
      case 'all':
        return '🔁';
      default:
        return '↻';
    }
  };

  return (
    <View style={[styles.container, { 
      bottom: (Platform.OS === 'ios' ? 80 : 60) + insets.bottom
    }]}>
      {/* Progress Bar
      <View style={styles.progressContainer}>
        <Slider
          style={styles.progressBar}
          value={position}
          minimumValue={0}
          maximumValue={duration || 1}
          onSlidingComplete={seek}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#ddd"
          thumbTintColor="#007AFF"
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatDuration(position)}</Text>
          <Text style={styles.timeText}>{formatDuration(duration)}</Text>
        </View>
      </View> */}

      {/* Track Info + Controls */}
      <View style={styles.trackInfo}>
        {currentTrack.artwork_url ? (
          <Image
            source={{ uri: currentTrack.artwork_url }}
            style={styles.albumArt}
          />
        ) : (
          <View style={[styles.albumArt, styles.albumArtPlaceholder]}>
            <Text style={styles.albumArtIcon}>🎵</Text>
          </View>
        )}
        
        <View style={styles.trackDetails}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>

        {/* Controls on the right */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={previous}
          >
            <Text style={styles.controlIcon}>⏮️</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handlePlayPause}
          >
            <Text style={styles.controlIcon}>
              {isPlaying ? '⏸️' : '▶️'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.controlButton}
            onPress={next}
          >
            <Text style={styles.controlIcon}>⏭️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#282828',
    borderTopWidth: 1,
    borderTopColor: '#404040',
    paddingBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10,
  },
  progressContainer: {
    paddingHorizontal: 15,
    paddingTop: 5,
  },
  progressBar: {
    width: '100%',
    height: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -5,
  },
  timeText: {
    fontSize: 12,
    color: '#b3b3b3',
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  albumArt: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  albumArtPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumArtIcon: {
    fontSize: 24,
  },
  trackDetails: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    color: '#b3b3b3',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    padding: 3,
    marginHorizontal: 4,
  },
  controlIcon: {
    fontSize: 20,
    color: '#fff',
  },
});
