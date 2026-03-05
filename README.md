# SongJump

Transfer Spotify playlists to YouTube Music from the command line.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/<username>/songjump
cd songjump

# Start backend (Terminal 1)
cd backend
npm install
npx prisma migrate dev
npm start

# Start Python worker (Terminal 2)
cd python-service
pip install -r requirements.txt
uvicorn main:app --port 8000

# Install CLI (Terminal 3)
cd cli
npm install && npm run build && npm link

# Use it
songjump login                              # Authenticate with Spotify
songjump yt-auth                            # Set up YouTube Music
songjump transfer <spotify-playlist-url>    # Transfer a playlist
```

**No Spotify developer account required** — authentication is handled by a hosted OAuth service.

**No database setup required** — uses SQLite (auto-created on first run).

---

## Example Output

```
songjump transfer https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M

  ✓ Fetched Spotify playlist
  ✓ Found 50 tracks
  ✓ Created playlist: Today's Top Hits
  ✓ Added 48 tracks

  Transfer Complete!

  Playlist:      Today's Top Hits
  Total tracks:  50
  Transferred:   48
  Failed:        2
  Success rate:  96.0%
```

---

## Requirements

- Node.js 18+
- Python 3.8+

That's it. No PostgreSQL, no Spotify API keys, no environment variables.

---

## Architecture

```
CLI (TypeScript)
     │
     ▼
Express API (Node.js + SQLite)
     │
     ▼
Python Worker (FastAPI + ytmusicapi)
     │
     ▼
YouTube Music
```

| Component     | Purpose                                        |
| ------------- | ---------------------------------------------- |
| CLI           | Command interface, credential storage          |
| Express API   | Playlist fetching, transfer orchestration      |
| Python Worker | YouTube Music operations via ytmusicapi        |
| OAuth Proxy   | Hosted service handling Spotify authentication |

---

## Commands

| Command                          | Description                         |
| -------------------------------- | ----------------------------------- |
| `songjump login`                 | Authenticate with Spotify           |
| `songjump logout`                | Clear stored credentials            |
| `songjump yt-auth`               | Set up YouTube Music authentication |
| `songjump transfer <url>`        | Transfer a Spotify playlist         |
| `songjump transfer <url> --open` | Transfer and open YouTube Music     |

---

## YouTube Music Authentication

YouTube Music doesn't have a public API. SongJump uses browser session headers with the `ytmusicapi` library.

When you run `songjump yt-auth`, you'll be guided to:

1. Open YouTube Music in your browser
2. Open DevTools → Network tab
3. Copy specific headers from a request
4. Paste them into the CLI

This only needs to be done once. Headers are stored locally for future transfers.

---

## Tech Stack

- **CLI**: TypeScript, Commander
- **API Server**: Node.js, Express, Prisma
- **Worker**: Python, FastAPI, ytmusicapi
- **Database**: SQLite
- **Auth**: Spotify OAuth (PKCE), JWT

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup with local OAuth configuration.

---

## License

MIT
