# SongJump CLI

Transfer Spotify playlists to YouTube Music from the command line.

## Installation

```bash
cd cli
npm install
npm run link   # Builds and links globally
```

## Quick Start

```bash
# 1. Login with Spotify
songjump login

# 2. Set up YouTube Music authentication
songjump yt-auth

# 3. Transfer a playlist
songjump transfer https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
```

## Commands

### `songjump login`

Opens browser for Spotify OAuth. Stores JWT token locally.

### `songjump yt-auth`

Prompts you to paste YouTube Music browser headers from DevTools.

### `songjump transfer <spotify-playlist-url>`

Transfers a Spotify playlist to YouTube Music.

Example:

```bash
songjump transfer https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
```

Output:

```
✔ Transfer complete
✔ 38 songs added
✖ 4 songs not found

Playlist URL:
https://music.youtube.com/playlist?list=...
```

### `songjump logout`

Clears saved credentials.

## Configuration

Config is stored at `~/.songjump/config.json`.

## Requirements

- Node.js 18+
- SongJump backend running on `http://127.0.0.1:4000`
- SongJump Python service running on `http://localhost:8000`
