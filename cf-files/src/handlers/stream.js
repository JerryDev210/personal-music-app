/**
 * Stream handler: Proxy audio from OneDrive with range support
 */

import { errorResponse } from '../utils.js';
import { getDownloadUrl } from '../onedrive.js';

export const handleStream = {
  /**
   * GET /api/stream/:trackId - Stream audio file from OneDrive
   */
  async streamTrack(trackId, request, env) {
    try {
      // Get track from database
      const track = await env.DB.prepare(`
        SELECT * FROM tracks
        WHERE id = ? AND is_deleted = 0
      `).bind(trackId).first();

      if (!track) {
        return errorResponse('Track not found', 404);
      }

      // Get OneDrive download URL
      const downloadUrl = await getDownloadUrl(track.onedrive_item_id, env);

      // Get range header from request (for seeking support)
      const rangeHeader = request.headers.get('Range');

      // Proxy request to OneDrive
      const headers = {};
      if (rangeHeader) {
        headers['Range'] = rangeHeader;
      }

      const response = await fetch(downloadUrl, { headers });

      if (!response.ok) {
        return errorResponse('Failed to stream audio from OneDrive', response.status);
      }

      // Increment play count (fire and forget)
      env.DB.prepare(`
        UPDATE tracks
        SET play_count = play_count + 1
        WHERE id = ?
      `).bind(trackId).run().catch(err => {
        console.error('Failed to increment play count:', err);
      });

      // Return proxied response with appropriate headers
      const responseHeaders = new Headers();
      
      // Copy important headers from OneDrive response
      ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges'].forEach(header => {
        const value = response.headers.get(header);
        if (value) {
          responseHeaders.set(header, value);
        }
      });

      // Add CORS headers
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', 'Range');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });

    } catch (error) {
      console.error('Error streaming track:', error);
      return errorResponse(error.message || 'Failed to stream track', 500);
    }
  },
};
