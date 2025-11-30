import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchPlaylistTracks } from '../services/playlists';
import { getCachedData, storeCachedData } from '../services/cache';
import { STORAGE_KEYS, CACHE_TTL } from '../config/constants';
import { usePlayer } from '../hooks';
import { formatDurationString } from '../utils/formatters';
import { createQueue } from '../utils/queue';
import IconTimer from '../../assets/icons/timer.png';
import IconPlay from '../../assets/icons/round_play.png';
import IconShuffle from '../../assets/icons/shuffle.png';
/**
 * Playlist Detail Screen
 * Shows playlist artwork, metadata, and track list with playback controls
 */
export default function PlaylistDetailScreen({ route, navigation }) {
  const { playlist } = route.params;
  const insets = useSafeAreaInsets();
  
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { play, setQueue, currentTrack, isPlaying, shuffle: isShuffled, toggleShuffle } = usePlayer();

  useEffect(() => {
    loadPlaylistTracks();
  }, [playlist.id]);

  useEffect(() => {
    // Set header options
    navigation.setOptions({
      title: '',
      headerStyle: {
        backgroundColor: '#121212',
      },
      headerTintColor: '#fff',
      headerRight: () => (
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleMenuPress}
        >
          <Text style={styles.headerButtonText}>⋯</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const loadPlaylistTracks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to load from cache first
      const cacheKey = `${STORAGE_KEYS.PLAYLIST_TRACKS_PREFIX}${playlist.id}`;
      const cachedTracks = await getCachedData(cacheKey, CACHE_TTL.PLAYLIST_TRACKS);
      
      if (cachedTracks) {
        setTracks(cachedTracks);
        setLoading(false);
        // Fetch fresh data in background to update cache
        fetchFreshPlaylistTracks();
        return;
      }
      
      // No cache, fetch from server
      await fetchFreshPlaylistTracks();
    } catch (err) {
      console.error('Error loading playlist tracks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFreshPlaylistTracks = async () => {
    try {
      const playlistTracks = await fetchPlaylistTracks(playlist.id);
      setTracks(playlistTracks);
      
      // Cache the tracks
      const cacheKey = `${STORAGE_KEYS.PLAYLIST_TRACKS_PREFIX}${playlist.id}`;
      await storeCachedData(cacheKey, playlistTracks, 'playlist_tracks');
    } catch (err) {
      console.error('Error fetching fresh playlist tracks:', err);
      // Don't throw if we already have cached data
      if (tracks.length === 0) {
        throw err;
      }
    }
  };

  const handleMenuPress = () => {
    Alert.alert(
      'Playlist Options',
      'What would you like to do?',
      [
        { text: 'Edit Playlist', onPress: () => console.log('Edit playlist') },
        { text: 'Share', onPress: () => console.log('Share playlist') },
        { text: 'Delete', onPress: () => console.log('Delete playlist'), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      setQueue(tracks, 0);
    }
  };

  const handleShuffle = () => {
    toggleShuffle();
    if (tracks.length > 0) {
      // Small delay to ensure shuffle state updates in PlayerContext
      setTimeout(() => setQueue(tracks, 0), 100);
    }
  };

  const handleTrackPress = (track, index) => {
    setQueue(tracks, index);
  };

  const calculateTotalDuration = () => {
    return tracks.reduce((total, track) => total + (track.duration || 0), 0);
  };

  const renderTrackItem = ({ item: track, index }) => {
    const isCurrentTrack = currentTrack?.id === track.id;
    
    return (
      <TouchableOpacity
        style={[styles.trackItem, isCurrentTrack && styles.activeTrack]}
        onPress={() => handleTrackPress(track, index)}
      >
        {track.artwork_url ? (
          <Image
            source={{ uri: track.artwork_url }}
            style={styles.trackArtwork}
          />
        ) : (
          <View style={[styles.trackArtwork, styles.trackArtworkPlaceholder]}>
            <Text style={styles.trackArtworkIcon}>🎵</Text>
          </View>
        )}
        
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {track.title}            
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>
        
        {/* <View style={styles.trackMeta}>
          <Text style={styles.trackDuration}>
            {formatDuration(track.duration)}
          </Text>
        </View> */}
        
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => handleTrackMenu(track)}
        >
          <Text style={styles.menuButtonText}>⋯</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const handleTrackMenu = (track) => {
    Alert.alert(
      track.title,
      'Track options',
      [
        { text: 'Add to Queue', onPress: () => console.log('Add to queue') },
        { text: 'Remove from Playlist', onPress: () => console.log('Remove track'), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Loading playlist...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading playlist</Text>
        <Text style={styles.errorDetails}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadPlaylistTracks}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalDuration = calculateTotalDuration();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Artwork Section */}
        <View style={styles.artworkSection}>
          {playlist.artwork_url ? (
            <Image
              source={{ uri: playlist.artwork_url }}
              style={styles.playlistArtwork}
            />
          ) : (
            <View style={[styles.playlistArtwork, styles.artworkPlaceholder]}>
              <Text style={styles.artworkIcon}>🎵</Text>
            </View>
          )}
        </View>

        {/* Playlist Info */}
        <View style={styles.infoSection}>
          <Text style={styles.playlistName}>{playlist.name}</Text>
          
          {/* <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {tracks.length} song{tracks.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.metaDivider}>•</Text>
            <Text style={styles.metaText}>
              {formatDurationString(totalDuration)}
            </Text>
          </View> */}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {/* Duration Section */}
          <View style={styles.durationSection}>
            <Image source={IconTimer} style={styles.timerIcon} />
            <Text style={styles.durationText}>
              {formatDurationString(totalDuration)}
            </Text>
          </View>
          
          {/* Playback Controls */}
          <View style={styles.controlsSection}>
            <TouchableOpacity
              style={[styles.shuffleIconButton, isShuffled && styles.shuffleIconButtonActive]}
              onPress={handleShuffle}
            >
              <Image source={IconShuffle} style={[styles.shuffleIcon, isShuffled && styles.shuffleIconActive]} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.playIconButton}
              onPress={handlePlayAll}
              disabled={tracks.length === 0}
            >
              <Image source={IconPlay} style={styles.playIcon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Track List */}
        <View style={styles.trackListSection}>
          {/* <Text style={styles.trackListHeader}>Songs</Text> */}
          
          {tracks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tracks in this playlist</Text>
            </View>
          ) : (
            <FlatList
              data={tracks}
              renderItem={renderTrackItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              style={styles.trackList}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
  },
  errorDetails: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  artworkSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  playlistArtwork: {
    width: '70%',
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
    alignItems: 'center',
    marginBottom: 10,
  },
  playlistName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  durationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationText: {
    fontSize: 16,
    color: '#ffffffff',
    fontWeight: '500',
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerIcon:{
    width:30,
    height:30
  },
  shuffleIconButtonActive: {
    backgroundColor: '#1DB954',
    borderColor: '#1DB954',
  },
  shuffleIcon: {
    width:33,
    height:33
  },
  shuffleIconActive: {
    fontSize: 20,
  },
  playIconButton: {
    width: 41,
    height: 41,
    borderRadius: 28,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playIcon: {
    width:45,
    height:45
  },
  trackListSection: {
    flex: 1,
  },
  trackListHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  trackList: {
    flex: 1,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  activeTrack: {
    backgroundColor: '#1a2332',
  },
  trackArtwork: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  trackArtworkPlaceholder: {
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackArtworkIcon: {
    fontSize: 20,
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  playingIndicator: {
    fontSize: 12,
  },
  trackArtist: {
    fontSize: 14,
    color: '#b3b3b3',
  },
  trackMeta: {
    marginRight: 12,
  },
  trackDuration: {
    fontSize: 14,
    color: '#b3b3b3',
  },
  menuButton: {
    padding: 8,
  },
  menuButtonText: {
    color: '#b3b3b3',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});