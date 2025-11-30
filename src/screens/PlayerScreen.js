import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { usePlayer } from '../hooks';
import { formatDuration } from '../utils/formatters';
import IconClose from '../../assets/icons/close.png';
import IconMenu from '../../assets/icons/menu.png';
import IconLike from '../../assets/icons/like.png';
import IconTimer from '../../assets/icons/timer.png';
import IconShuffle from '../../assets/icons/shuffle.png';
import IconStart from '../../assets/icons/start.png';
import IconPlay from '../../assets/icons/play.png';
import IconPause from '../../assets/icons/pause.png';
import IconEnd from '../../assets/icons/end.png';

/**
 * Full Screen Player
 * Shows current track with full controls
 */
export default function PlayerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
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
    navigation.goBack();
    return null;
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const getRepeatIcon = () => {
    switch (repeatMode) {
      case 'one':
        return '🔂'; // Repeat one
      case 'all':
        return '🔁'; // Repeat all
      default:
        return '↻'; // Repeat off
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <Image source={IconClose} style={styles.headerIcon} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerButton}>
          <Image source={IconMenu} style={styles.headerIcon} />
        </TouchableOpacity>
      </View>

      {/* Artwork */}
      <View style={styles.artworkSection}>
        {currentTrack.artwork_url ? (
          <Image
            source={{ uri: currentTrack.artwork_url }}
            style={styles.artwork}
          />
        ) : (
          <View style={[styles.artwork, styles.artworkPlaceholder]}>
            <Text style={styles.artworkIcon}>🎵</Text>
          </View>
        )}
      </View>

      {/* Song Info */}
      <View style={styles.infoSection}>
        <View style={styles.titleRow}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <TouchableOpacity style={styles.favoriteButton}>
            <Image source={IconLike} style={styles.favoriteIcon} />
          </TouchableOpacity>
        </View>
        <Text style={styles.albumName} numberOfLines={1}>
          {currentTrack.album || currentTrack.artist || 'Unknown Album'}
        </Text>
      </View>

      {/* Controls Row - Timer and Shuffle/Repeat */}
      <View style={styles.controlsRow}>
        <View style={styles.timerSection}>
          <Image source={IconTimer} style={styles.timerIcon} />
        </View>
        
        <View style={styles.toggleSection}>
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={toggleRepeat}
          >
            <Text style={styles.toggleIcon}>{getRepeatIcon()}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toggleButton, shuffleEnabled && styles.toggleButtonActive]}
            onPress={toggleShuffle}
          >
            <Image 
              source={IconShuffle} 
              style={[styles.shuffleIcon, shuffleEnabled && styles.shuffleIconActive]} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Spacer to push bottom controls down */}
      <View style={{ flex: 1 }} />

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <Text style={styles.timeText}>{formatDuration(position)}</Text>
        <Slider
          style={styles.progressBar}
          value={position}
          minimumValue={0}
          maximumValue={duration || 1}
          onSlidingComplete={seek}
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#404040"
          thumbTintColor="#1DB954"
        />
        <Text style={styles.timeText}>{formatDuration(duration)}</Text>
      </View>

      {/* Playback Controls */}
      <View style={styles.playbackControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={previous}
        >
          <Image source={IconStart} style={styles.controlIcon} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.playButton}
          onPress={handlePlayPause}
        >
          <Image 
            source={isPlaying ? IconPause : IconPlay} 
            style={styles.playIcon} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={next}
        >
          <Image source={IconEnd} style={styles.controlIcon} />
        </TouchableOpacity>
      </View>

      {/* Bottom Padding */}
      <View style={{ height: insets.bottom + 30 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  headerButton: {
    padding: 8,
  },
  headerIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
  artworkSection: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  artwork: {
    width: '75%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#282828',
  },
  artworkPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkIcon: {
    fontSize: 80,
  },
  infoSection: {
    marginBottom: 30,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  songTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 12,
  },
  favoriteButton: {
    padding: 4,
  },
  favoriteIcon: {
    width: 28,
    height: 28,
    tintColor: '#fff',
  },
  albumName: {
    fontSize: 16,
    color: '#b3b3b3',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerIcon: {
    width: 28,
    height: 28,
  },
  toggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#1DB954',
  },
  toggleIcon: {
    fontSize: 20,
  },
  shuffleIcon: {
    width: 24,
    height: 24,
  },
  shuffleIconActive: {
    tintColor: '#000',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  timeText: {
    fontSize: 12,
    color: '#b3b3b3',
    width: 45,
  },
  progressBar: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  playbackControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  controlButton: {
    padding: 12,
  },
  controlIcon: {
    width: 32,
    height: 32,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  playIcon: {
    width: 36,
    height: 36,
  },
});
