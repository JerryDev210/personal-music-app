import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { useLibrary } from '../hooks/useLibrary';
import { usePlayer } from '../hooks/usePlayer';
import { formatDuration } from '../utils/formatters';
import IconMenu from '../../assets/icons/menu.png';
import IconLike from '../../assets/icons/like.png';
import IconAdd from '../../assets/icons/add.png';
import IconAddQueue from '../../assets/icons/add_queue.png';
import IconShare from '../../assets/icons/share.png';
import IconTimer from '../../assets/icons/timer.png';
import IconClose from '../../assets/icons/close.png';

export default function HomeScreen() {
  const { tracks, loading, error, refetch } = useLibrary();
  const { play, currentTrack, isPlaying } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const slideAnim = useRef(new Animated.Value(100)).current;

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

  const handleOptionsPress = (track) => {
    setSelectedTrack(track);
    setShowOptions(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 90,
    }).start();
  };

  // top of component
const listenerIdRef = useRef(null);
const hidingRef = useRef(false);

useEffect(() => {
  return () => {
    if (listenerIdRef.current != null) {
      slideAnim.removeListener(listenerIdRef.current);
      listenerIdRef.current = null;
    }
  };
}, [slideAnim]);

const closeModal = () => {
  hidingRef.current = false;

  // attach listener (only once per close)
  if (listenerIdRef.current == null) {
    listenerIdRef.current = slideAnim.addListener(({ value }) => {
      if (!hidingRef.current && value >= 59.4) {   // reaching 60
        hidingRef.current = true;

        // remove listener BEFORE setting value (avoids loops)
        slideAnim.removeListener(listenerIdRef.current);
        listenerIdRef.current = null;

        // stop current spring instantly
        slideAnim.stopAnimation(() => {
          slideAnim.setValue(60);  // final position
          setShowOptions(false);   // hide instantly
        });
      }
    });
  }

  // run the spring close
  Animated.spring(slideAnim, {
    toValue: 60,
    useNativeDriver: true,
    damping: 20,        // controls "bounce / smoothness"
    stiffness: 130,      // controls "speed"
    overshootClamping: true,
    restDisplacementThreshold: 0.5,
    restSpeedThreshold: 0.5,
  }).start();
};



  const handleOptionSelect = (action) => {
    closeModal();
    
    if (!selectedTrack) return;
    
    switch (action) {
      case 'liked':
        console.log('Add to liked:', selectedTrack.title);
        // TODO: Implement add to liked
        break;
      case 'playlist':
        console.log('Add to playlist:', selectedTrack.title);
        // TODO: Implement add to playlist
        break;
      case 'queue':
        console.log('Add to queue:', selectedTrack.title);
        // TODO: Implement add to queue
        break;
      case 'share':
        console.log('Share:', selectedTrack.title);
        // TODO: Implement share
        break;
      case 'timer':
        console.log('Set timer');
        // TODO: Implement timer
        break;
    }
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
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => handleOptionsPress(item)}
        >
          <Image source={IconMenu} style={styles.menuIcon} />
        </TouchableOpacity>
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

      {/* Options Modal */}
      <Modal
        visible={showOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
          >
            <Animated.View 
              style={[
                styles.modalContent,
                {
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              {/* Track Info Header */}
              <View style={styles.modalHeader}>
                {selectedTrack?.artwork_url ? (
                  <Image
                    source={{ uri: selectedTrack.artwork_url }}
                    style={styles.modalArtwork}
                  />
                ) : (
                  <View style={[styles.modalArtwork, styles.albumArtPlaceholder]}>
                    <Text style={styles.albumArtIcon}>🎵</Text>
                  </View>
                )}
                <View style={styles.modalTrackInfo}>
                  <Text style={styles.modalTrackTitle} numberOfLines={1}>
                    {selectedTrack?.title}
                  </Text>
                  <Text style={styles.modalTrackArtist} numberOfLines={1}>
                    {selectedTrack?.album}
                  </Text>
                </View>
              </View>

              {/* Separator */}
              <View style={styles.modalSeparator} />

              {/* Options */}
              <View style={styles.modalOptions}>
                <TouchableOpacity 
                  style={styles.modalOption}
                  onPress={() => handleOptionSelect('liked')}
                >
                  <Image source={IconLike} style={styles.optionIcon} />
                  <Text style={styles.modalOptionText}>Add song to liked</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalOption}
                  onPress={() => handleOptionSelect('playlist')}
                >
                  <Image source={IconAdd} style={styles.optionIcon} />
                  <Text style={styles.modalOptionText}>Add song to playlist</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalOption}
                  onPress={() => handleOptionSelect('queue')}
                >
                  <Image source={IconAddQueue} style={styles.optionIcon} />
                  <Text style={styles.modalOptionText}>Add song to queue</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalOption}
                  onPress={() => handleOptionSelect('share')}
                >
                  <Image source={IconShare} style={styles.optionIcon} />
                  <Text style={styles.modalOptionText}>Share this song</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalOption}
                  onPress={() => handleOptionSelect('timer')}
                >
                  <Image source={IconTimer} style={styles.optionIcon} />
                  <Text style={styles.modalOptionText}>Set timer</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalOption, styles.modalCancelOption]}
                  onPress={closeModal}
                >
                  <Image source={IconClose} style={{
                    width: 22,
                    height: 22,
                    marginRight: 12,
                    tintColor: '#fff',
                  }} />
                  <Text style={styles.modalCancelText}>Close</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
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
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    width: 25,
    height: 25,
    // tintColor: '#b3b3b3',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#282828',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    // paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  modalArtwork: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  modalTrackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  modalTrackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  modalTrackArtist: {
    fontSize: 14,
    color: '#b3b3b3',
  },
  modalSeparator: {
    height: 1,
    backgroundColor: '#404040',
    marginHorizontal: 16,
  },
  modalOptions: {
    paddingTop: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    tintColor: '#fff',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#fff',
  },
  modalCancelOption: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '600',
  },
});
