import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text, Platform, View } from 'react-native';
import { LibraryProvider, PlayerProvider, UserProvider, DownloadProvider } from './src/contexts';
import HomeScreen from './src/screens/HomeScreen';
import PlaylistsScreen from './src/screens/PlaylistsScreen';
import MiniPlayer from './src/screens/MiniPlayer';

const Tab = createBottomTabNavigator();

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
                  component={PlaylistsScreen}
                  options={{
                    tabBarIcon: ({ color }) => <PlaylistIcon color={color} />,
                  }}
                />
        </Tab.Navigator>
        <MiniPlayer/>
      </View>
    </NavigationContainer>
  );
}

export default function App() {
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
