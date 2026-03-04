# YTMusic Transfer Service

Python microservice for transferring playlists to YouTube Music using [ytmusicapi](https://ytmusicapi.readthedocs.io/).

## Setup

### 1. Install Python dependencies

```bash
cd python-service
pip install -r requirements.txt
```

### 2. Set up YouTube Music authentication

This service uses browser authentication (no Google Cloud OAuth required).

1. Open YouTube Music in your browser and ensure you're logged in
2. Open Developer Tools (F12) → Network tab
3. Filter by `/browse`
4. Click on any request and copy the request headers
5. Save them as JSON (the frontend will handle this)

### 3. Run the service

```bash
# Development
uvicorn main:app --reload --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Health Check

```
GET /health
```

### Transfer Playlist

```
POST /transfer
Content-Type: application/json

{
  "authHeaders": "<JSON string of browser headers>",
  "playlistName": "My Playlist",
  "playlistDescription": "Transferred from Spotify",
  "tracks": [
    {
      "spotifyTrackId": "abc123",
      "title": "Song Title",
      "artists": "Artist Name",
      "album": "Album Name",
      "isrc": "USRC12345678"
    }
  ]
}
```

Response:

```json
{
  "youtubePlaylistId": "PLxxxxxxx",
  "youtubePlaylistUrl": "https://music.youtube.com/playlist?list=PLxxxxxxx",
  "results": [
    {
      "spotifyTrackId": "abc123",
      "title": "Song Title",
      "artist": "Artist Name",
      "status": "FOUND",
      "ytVideoId": "dQw4w9WgXcQ",
      "error": null
    }
  ],
  "successCount": 1,
  "failureCount": 0
}
```

## Track Status Values

- `FOUND` - Track was found on YouTube Music and added to playlist
- `NOT_FOUND` - Track search returned no results
- `FAILED` - Error occurred while processing track

## Environment Variables

| Variable | Default | Description                |
| -------- | ------- | -------------------------- |
| `PORT`   | `8000`  | Port to run the service on |
