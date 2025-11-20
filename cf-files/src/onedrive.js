/**
 * OneDrive authentication and API helper for Cloudflare Worker
 */

// In-memory token cache (resets on worker cold start)
let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get Microsoft Graph API access token (app-only authentication)
 */
export async function getAccessToken(env) {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry > Date.now()) {
    return cachedToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${env.ONEDRIVE_TENANT_ID}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: env.ONEDRIVE_CLIENT_ID,
    client_secret: env.ONEDRIVE_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  
  // Cache token (expires in ~3600 seconds, refresh 60 seconds early)
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken;
}

/**
 * Get OneDrive download URL for streaming
 */
export async function getDownloadUrl(itemId, env) {
  const token = await getAccessToken(env);
  
  const itemUrl = `https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/items/${itemId}`;
  
  const response = await fetch(itemUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('File not found in OneDrive');
    }
    const error = await response.text();
    throw new Error(`Failed to get download URL: ${error}`);
  }

  const data = await response.json();
  const downloadUrl = data['@microsoft.graph.downloadUrl'];

  if (!downloadUrl) {
    throw new Error('Download URL not available');
  }

  return downloadUrl;
}
