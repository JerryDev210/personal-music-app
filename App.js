import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text, Platform, View } from 'react-native';
import { LibraryProvider, PlayerProvider, UserProvider, DownloadProvider } from './src/contexts';
import { cleanupExpiredCache, evictLRUCache } from './src/services/cache';
import { CACHE_CONFIG } from './src/config/constants';
import HomeScreen from './src/screens/HomeScreen';
import PlaylistsScreen from './src/screens/PlaylistsScreen';
import PlaylistDetailScreen from './src/screens/PlaylistDetailScreen';
import MiniPlayer from './src/screens/MiniPlayer';

const Tab = createBottomTabNavigator();
const PlaylistStack = createStackNavigator();

// Playlist Stack Navigator
function PlaylistStackScreen() {
  return (
    <PlaylistStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#121212',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <PlaylistStack.Screen 
        name="PlaylistsList" 
        component={PlaylistsScreen} 
        options={{ title: 'Playlists' }}
      />
      <PlaylistStack.Screen 
        name="PlaylistDetail" 
        component={PlaylistDetailScreen}
        options={({ route }) => ({ title: route.params?.playlist?.name || 'Playlist' })}
      />
    </PlaylistStack.Navigator>
  );
}

function AppNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#121212',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            tabBarStyle: {
              backgroundColor: '#181818',
              borderTopColor: '#282828',
              paddingBottom: Platform.OS === 'ios' ? 0 : Math.max(8, insets.bottom),
              paddingTop: 8,
              height: Platform.OS === 'ios' ? 80 : 60 + insets.bottom,
            },
                    tabBarActiveTintColor: '#1DB954',
                    tabBarInactiveTintColor: '#b3b3b3',
                    tabBarLabelStyle: {
                      fontSize: 12,
                      fontWeight: '600',
                    },
                  }}
                >
                <Tab.Screen
                  name="Home"
                  component={HomeScreen}
                  options={{
                    tabBarIcon: ({ color }) => <HomeIcon color={color} />,
                  }}
                />
                <Tab.Screen
                  name="Playlists"
                  component={PlaylistStackScreen}
                  options={{
                    tabBarIcon: ({ color }) => <PlaylistIcon color={color} />,
                    headerShown: false
                  }}
                />
        </Tab.Navigator>
        <MiniPlayer/>
      </View>
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    // Initialize cache cleanup on app start (with slight delay to not block startup)
    const initializeCache = async () => {
      try {
        // Clean up expired cache entries
        await cleanupExpiredCache();
        
        // Enforce max cache size using LRU eviction
        const maxSizeBytes = CACHE_CONFIG.MAX_CACHE_SIZE_MB * 1024 * 1024;
        await evictLRUCache(maxSizeBytes, CACHE_CONFIG.PROTECTED_KEYS);
      } catch (error) {
        console.error('Error initializing cache cleanup:', error);
      }
    };

    // Run after 1 second to avoid blocking app startup
    const timer = setTimeout(initializeCache, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <UserProvider>
        <LibraryProvider>
          <PlayerProvider>
            <DownloadProvider>
              <AppNavigator />
            </DownloadProvider>
          </PlayerProvider>
        </LibraryProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}

// Simple icon components (using text icons for now)
const HomeIcon = ({ color }) => (
  <Text style={{ fontSize: 24, color }}>🏠</Text>
);

const PlaylistIcon = ({ color }) => (
  <Text style={{ fontSize: 24, color }}>📋</Text>
);
