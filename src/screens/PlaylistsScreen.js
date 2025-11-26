import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { fetchPlaylists, createPlaylist } from '../services/playlists';
import { storeCachedData, getCachedData, removeData } from '../services/cache';
import { CACHE_KEYS, CACHE_TTL } from '../config/constants';
import { formatRelativeTime } from '../utils/formatters';
import { useLibrary } from '../hooks';

export default function PlaylistsScreen({ navigation }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [playlistName, setPlaylistName] = useState('');
  
  // Track selection
  const [selectedTrackIds, setSelectedTrackIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  
  const { tracks } = useLibrary();

  useEffect(() => {
    loadPlaylists();
    
    // Set header right button
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleCreatePlaylist}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>+</Text>
        </TouchableOpacity>
      ),
    });
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to load from cache first
      const cached = await getCachedData(CACHE_KEYS.PLAYLISTS, CACHE_TTL.LIBRARY);
      if (cached) {
        setPlaylists(cached);
        setLoading(false);
        // Fetch fresh data in background
        fetchFreshPlaylists();
        return;
      }

      // No cache, fetch from server
      await fetchFreshPlaylists();
    } catch (err) {
      console.error('Error loading playlists:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFreshPlaylists = async () => {
    try {
      const data = await fetchPlaylists();
      setPlaylists(data.playlists || []);
      // Save to cache
      await storeCachedData(CACHE_KEYS.PLAYLISTS, data);
    } catch (err) {
      console.error('Error fetching playlists:', err);
      if (playlists.length === 0) {
        throw err;
      }
    }
  };

  const handleCreatePlaylist = () => {
    setModalVisible(true);
    setCurrentStep(1);
    setPlaylistName('');
    setSelectedTrackIds([]);
    setSearchQuery('');
  };

  const handleNext = () => {
    if (playlistName.trim().length === 0) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const toggleTrackSelection = (trackId) => {
    setSelectedTrackIds(prev => {
      if (prev.includes(trackId)) {
        return prev.filter(id => id !== trackId);
      } else {
        return [...prev, trackId];
      }
    });
  };

  const handleCreate = async () => {
    if (selectedTrackIds.length === 0) {
      Alert.alert('Error', 'Please select at least one track');
      return;
    }

    try {
      setCreating(true);
      const newPlaylist = await createPlaylist(playlistName.trim(), selectedTrackIds);
      
      // Prepend new playlist to list
      setPlaylists(prev => [newPlaylist, ...prev]);
      
      // Clear cache
      await removeData(CACHE_KEYS.PLAYLISTS);
      
      // Close modal and reset
      setModalVisible(false);
      setCurrentStep(1);
      setPlaylistName('');
      setSelectedTrackIds([]);
      setSearchQuery('');
      
      Alert.alert('Success', 'Playlist created successfully!');
    } catch (error) {
      console.error('Error creating playlist:', error);
      Alert.alert('Error', error.message || 'Failed to create playlist');
    } finally {
      setCreating(false);
    }
  };

  const handlePlaylistPress = (playlist) => {
    // TODO: Navigate to playlist detail screen
    console.log('Playlist pressed:', playlist.name);
  };

  const renderPlaylist = ({ item }) => (
    <TouchableOpacity
      style={styles.playlistItem}
      onPress={() => handlePlaylistPress(item)}
    >
      {item.artwork_url ? (
        <Image
          source={{ uri: item.artwork_url }}
          style={styles.playlistArtwork}
        />
      ) : (
        <View style={styles.playlistArtwork}>
          <Text style={styles.playlistIconText}>🎵</Text>
        </View>
      )}
      <Text style={styles.playlistName} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading && playlists.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (error && playlists.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading playlists</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadPlaylists}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (playlists.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No playlists yet</Text>
        <Text style={styles.emptySubtext}>Create your first playlist to get started</Text>
      </View>
    );
  }

  const filteredTracks = tracks.filter(track => 
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={playlists}
        renderItem={renderPlaylist}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadPlaylists}
        numColumns={2}
      />

      {/* Create Playlist Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {currentStep === 1 ? (
              /* Step 1: Enter Playlist Name */
              <>
                <Text style={styles.modalTitle}>Create Playlist</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Playlist name"
                  placeholderTextColor="#666"
                  value={playlistName}
                  onChangeText={setPlaylistName}
                  maxLength={100}
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.nextButton]}
                    onPress={handleNext}
                    disabled={playlistName.trim().length === 0}
                  >
                    <Text style={styles.nextButtonText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* Step 2: Select Tracks */
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={handleBack}>
                    <Text style={styles.backButton}>← Back</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Select Songs</Text>
                  <View style={{ width: 60 }} />
                </View>

                <TextInput
                  style={styles.searchInput}
                  placeholder="Search tracks..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />

                <FlatList
                  data={filteredTracks}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.trackItem}
                      onPress={() => toggleTrackSelection(item.id)}
                    >
                      <View style={styles.checkbox}>
                        {selectedTrackIds.includes(item.id) && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                      {item.artwork_url ? (
                        <Image
                          source={{ uri: item.artwork_url }}
                          style={styles.trackArtwork}
                        />
                      ) : (
                        <View style={[styles.trackArtwork, styles.trackArtworkPlaceholder]}>
                          <Text>🎵</Text>
                        </View>
                      )}
                      <View style={styles.trackDetails}>
                        <Text style={styles.trackTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.trackArtist} numberOfLines={1}>
                          {item.artist}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  style={styles.trackList}
                />

                <View style={styles.bottomBar}>
                  <Text style={styles.selectedCount}>
                    {selectedTrackIds.length} song{selectedTrackIds.length !== 1 ? 's' : ''} selected
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.createButton,
                      (selectedTrackIds.length === 0 || creating) && styles.createButtonDisabled
                    ]}
                    onPress={handleCreate}
                    disabled={selectedTrackIds.length === 0 || creating}
                  >
                    {creating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.createButtonText}>Create</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  listContainer: {
    padding: 12,
    paddingBottom: 100,
  },
  playlistItem: {
    flex: 1,
    margin: 6,
    maxWidth: '50%',
  },
  playlistArtwork: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#282828',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  playlistIconText: {
    fontSize: 48,
  },
  playlistName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'left',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: '#1DB954',
    fontSize: 32,
    fontWeight: '300',
  },
  emptySubtext: {
    color: '#b3b3b3',
    fontSize: 14,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    color: '#1DB954',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#282828',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#282828',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#282828',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#1DB954',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  trackList: {
    maxHeight: 400,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#282828',
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1DB954',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#1DB954',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trackArtwork: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  trackArtworkPlaceholder: {
    backgroundColor: '#404040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackArtist: {
    color: '#b3b3b3',
    fontSize: 12,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  selectedCount: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  createButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 100,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#666',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
