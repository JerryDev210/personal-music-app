import { corsResponse, errorResponse, successResponse } from './utils.js';
import { handleLibrary } from './handlers/library.js';
import { handleStream } from './handlers/stream.js';
import { handlePlaylists } from './handlers/playlists.js';

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse();
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // Track endpoints
      if (path === '/api/tracks' && method === 'POST') {
        return handleLibrary.createTrack(request, env);
      }

      if (path === '/api/tracks' && method === 'GET') {
        return handleLibrary.getAllTracks(request, env);
      }

      if (path.match(/^\/api\/tracks\/[^/]+$/) && method === 'GET') {
        const trackId = path.split('/').pop();
        return handleLibrary.getTrack(trackId, env);
      }
      if (path.match(/^\/api\/tracks\/[^/]+\/play$/) && method === 'POST') {
        const trackId = path.split('/')[3];
        return handleLibrary.incrementPlayCount(trackId, env);
      }
      if (path === '/api/albums' && method === 'GET') {
        return handleLibrary.getAllAlbums(request, env);
      }

      if (path.match(/^\/api\/albums\/[^/]+\/tracks$/) && method === 'GET') {
        const albumName = decodeURIComponent(path.split('/')[3]);
        return handleLibrary.getAlbumTracks(albumName, env);
      }

      if (path === '/api/artists' && method === 'GET') {
        return handleLibrary.getAllArtists(request, env);
      }

      if (path.match(/^\/api\/artists\/[^/]+\/tracks$/) && method === 'GET') {
        const artistName = decodeURIComponent(path.split('/')[3]);
        return handleLibrary.getArtistTracks(artistName, env);
      }

      if (path === '/api/search' && method === 'GET') {
        return handleLibrary.searchTracks(request, env);
      }

      if (path === '/api/stats' && method === 'GET') {
        return handleLibrary.getStats(env);
      }

      // Streaming endpoints
      if (path.match(/^\/api\/stream\/[^/]+$/) && method === 'GET') {
        const trackId = path.split('/').pop();
        return handleStream.streamTrack(trackId, request, env);
      }

      // Playlist endpoints
      if (path === '/api/playlists' && method === 'GET') {
        return handlePlaylists.getAllPlaylists(env);
      }

      if (path === '/api/playlists' && method === 'POST') {
        return handlePlaylists.createPlaylist(request, env);
      }

      if (path.match(/^\/api\/playlists\/[^/]+$/) && method === 'GET') {
        const playlistId = path.split('/').pop();
        return handlePlaylists.getPlaylist(playlistId, env);
      }

      if (path.match(/^\/api\/playlists\/[^/]+$/) && method === 'PUT') {
        const playlistId = path.split('/').pop();
        return handlePlaylists.updatePlaylist(playlistId, request, env);
      }

      if (path.match(/^\/api\/playlists\/[^/]+$/) && method === 'DELETE') {
        const playlistId = path.split('/').pop();
        return handlePlaylists.deletePlaylist(playlistId, env);
      }

      if (path.match(/^\/api\/playlists\/[^/]+\/tracks$/) && method === 'POST') {
        const playlistId = path.split('/')[3];
        return handlePlaylists.addTrackToPlaylist(playlistId, request, env);
      }

      if (path.match(/^\/api\/playlists\/[^/]+\/tracks\/[^/]+$/) && method === 'DELETE') {
        const [, , , playlistId, , trackId] = path.split('/');
        return handlePlaylists.removeTrackFromPlaylist(playlistId, trackId, env);
      }

      // Health check
      if (path === '/api/health' && method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Test OneDrive connection
      if (path === '/api/test/onedrive' && method === 'GET') {
        try {
          const { getAccessToken } = await import('./onedrive.js');
          const token = await getAccessToken(env);
          
          // Test API call to verify token works
          const response = await fetch(
            `https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/root`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          
          if (!response.ok) {
            const error = await response.text();
            return errorResponse(`OneDrive test failed: ${error}`, 500);
          }
          
          const data = await response.json();
          return successResponse({
            message: 'OneDrive connection successful!',
            drive: {
              id: data.id,
              driveType: data.driveType,
              owner: data.owner?.user?.displayName,
            },
          });
        } catch (error) {
          return errorResponse(`OneDrive test error: ${error.message}`, 500);
        }
      }

      // 404 Not Found
      return errorResponse('Endpoint not found', 404);

    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse(error.message || 'Internal server error', 500);
    }
  },
};