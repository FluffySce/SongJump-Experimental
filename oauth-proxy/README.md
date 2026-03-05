# SongJump OAuth Proxy

Hosted OAuth proxy for SongJump CLI. Handles Spotify authentication so users don't need their own Spotify developer credentials.

## Deployment

1. Deploy to Vercel:

   ```bash
   cd oauth-proxy
   vercel
   ```

2. Set environment variables in Vercel Dashboard:
   - `SPOTIFY_CLIENT_ID` - Your Spotify app client ID
   - `SPOTIFY_CLIENT_SECRET` - Your Spotify app client secret

3. Update Spotify app settings:
   - Add redirect URI: `https://your-project.vercel.app/api/spotify/callback`

## Endpoints

### `GET /api/spotify/start`

Starts Spotify OAuth flow.

Query parameters:

- `cli_callback` (required) - URL to redirect after auth (e.g., `http://127.0.0.1:9876/callback`)

### `GET /api/spotify/callback`

OAuth callback handler. Exchanges code for tokens and redirects to CLI.

### `POST /api/spotify/refresh`

Refreshes an expired access token.

Body:

```json
{
  "refresh_token": "..."
}
```

Response:

```json
{
  "success": true,
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 3600,
  "expiresAt": 1234567890
}
```

## Local Development

```bash
npm install
npm run dev
```

Set environment variables in `.env.local`:

```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
```
