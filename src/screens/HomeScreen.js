import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLibrary } from '../hooks/useLibrary';
import { usePlayer } from '../hooks/usePlayer';
import { formatDuration } from '../utils/formatters';

export default function HomeScreen() {
  const { tracks, loading, error, refetch } = useLibrary();
  const { play, currentTrack, isPlaying } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTracks, setFilteredTracks] = useState([]);

  useEffect(() => {
    if (tracks) {
      // Sort by track_id descending (recently uploaded first)
      const sorted = [...tracks].sort((a, b) => b.track_id - a.track_id);
      setFilteredTracks(sorted);
    }
  }, [tracks]);

  useEffect(() => {
    if (tracks) {
      if (searchQuery.trim() === '') {
        const sorted = [...tracks].sort((a, b) => b.track_id - a.track_id);
        setFilteredTracks(sorted);
      } else {
        const query = searchQuery.toLowerCase();
        const filtered = tracks.filter(
          (track) =>
            track.title.toLowerCase().includes(query) ||
            track.artist.toLowerCase().includes(query) ||
            track.album.toLowerCase().includes(query)
        );
        setFilteredTracks(filtered);
      }
    }
  }, [searchQuery, tracks]);

  const handleTrackPress = (track) => {
    play(track);
  };

  const renderTrack = ({ item }) => {
    const isCurrentTrack = currentTrack?.id === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.trackItem, isCurrentTrack && styles.activeTrack]}
        onPress={() => handleTrackPress(item)}
      >
        {item.artwork_url ? (
          <Image
            source={{ uri: item.artwork_url }}
            style={styles.albumArt}
          />
        ) : (
          <View style={[styles.albumArt, styles.albumArtPlaceholder]}>
            <Text style={styles.albumArtIcon}>🎵</Text>
          </View>
        )}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.album}
          </Text>
        </View>
        {/* <Text style={styles.trackDuration}>{formatDuration(item.duration)}</Text> */}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading tracks</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tracks, artists, albums..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Recently Uploaded */}
      <Text style={styles.sectionTitle}>
        {searchQuery ? 'Search Results' : 'Recently Uploaded'}
      </Text>

      <FlatList
        data={filteredTracks}
        renderItem={renderTrack}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={refetch}
      />
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
  },
  searchContainer: {
    padding: 16,
    paddingTop: 12,
  },
  searchInput: {
    backgroundColor: '#282828',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  albumArt: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  albumArtPlaceholder: {
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumArtIcon: {
    fontSize: 20,
  },
  activeTrack: {
    // backgroundColor: '#44698bff',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: '#b3b3b3',
  },
  trackDuration: {
    fontSize: 14,
    color: '#b3b3b3',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
