/**
 * Utility functions for Cloudflare Worker
 */

/**
 * Create a successful JSON response with CORS headers
 */
export function successResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  });
}

/**
 * Create an error JSON response with CORS headers
 */
export function errorResponse(message, status = 400) {
  return new Response(
    JSON.stringify({
      error: message,
      status,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      },
    }
  );
}

/**
 * Handle CORS preflight requests
 */
export function corsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Validate API key from request header
 */
export function validateApiKey(request, env) {
  const apiKey = request.headers.get('X-API-Key');
  
  if (!apiKey) {
    return { valid: false, error: 'Missing API key' };
  }
  
  if (apiKey !== env.API_KEY) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  return { valid: true };
}

/**
 * Parse JSON body from request
 */
export async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
}

/**
 * Get pagination params from URL
 */
export function getPaginationParams(url) {
  const limit = parseInt(url.searchParams.get('limit')) || 50;
  const offset = parseInt(url.searchParams.get('offset')) || 0;
  
  return {
    limit: Math.min(limit, 100), // Max 100 items
    offset: Math.max(offset, 0),
  };
}
