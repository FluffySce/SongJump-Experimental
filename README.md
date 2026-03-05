# SongJump

SongJump is a command-line tool that transfers Spotify playlists to YouTube Music.

It fetches playlists using the Spotify Web API and recreates them on YouTube Music using `ytmusicapi`.

The project demonstrates a multi-service architecture using:

- a TypeScript CLI
- a Node.js API server
- a Python worker service

---

## Example

Run:

    songjump login
    songjump yt-auth
    songjump transfer https://open.spotify.com/playlist/<playlist-id>

Example output:

    Fetched Spotify playlist
    Found 81 tracks
    Created YouTube Music playlist

    Transfer Complete
    Transferred: 80
    Failed: 1
    Success rate: 98.7%

---

## Architecture

SongJump separates responsibilities between a CLI interface, an API layer, and a worker service.

    CLI (TypeScript)
         │
         ▼
    Express API (Node.js)
         │
         ▼
    Python Worker (FastAPI)
         │
         ▼
    YouTube Music

### Components

CLI
- command interface
- credential storage
- communication with backend API

Express API
- Spotify OAuth authentication
- playlist retrieval
- transfer orchestration

Python Worker
- YouTube Music operations
- playlist creation
- track matching and insertion

---

## Tech Stack

CLI  
TypeScript, Commander

API Server  
Node.js, Express

Worker Service  
Python, FastAPI, ytmusicapi

Authentication  
Spotify OAuth (PKCE), JWT

Database  
PostgreSQL

External APIs  
Spotify Web API  
YouTube Music

---

## Features

- Spotify OAuth authentication
- CLI-based playlist transfer
- automated track matching
- transfer statistics and success metrics
- credential caching for repeat usage
- separation between API orchestration and worker logic

---

# Running Locally

## Requirements

Install the following:

- Node.js 18+
- Python 3.8+
- PostgreSQL
- Spotify Developer credentials

---

## 1. Clone the repository

    git clone https://github.com/<username>/songjump
    cd songjump

---

## 2. Database Setup

Start PostgreSQL and create a database:

    createdb songjump

---

## 3. Environment Setup

Copy the example environment file:

    cp backend/.env.example backend/.env

Fill in the required values:

    SPOTIFY_CLIENT_ID=
    SPOTIFY_CLIENT_SECRET=
    JWT_SECRET=
    DATABASE_URL=postgresql://localhost:5432/songjump

---

## 4. Run database migrations

    cd backend
    npx prisma migrate dev

---

## 5. Start backend API

    cd backend
    npm install
    npm start

The server will run on:

    http://localhost:4000

---

## 6. Start Python worker

Open another terminal:

    cd python-service
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

---

## 7. Install CLI

    cd cli
    npm install
    npm run build
    npm link

---

## 8. Use the CLI

Authenticate with Spotify:

    songjump login

Authenticate with YouTube Music:

    songjump yt-auth

Transfer a playlist:

    songjump transfer <spotify-playlist-url>

Optional:

    songjump transfer <playlist-url> --open

---

## Notes on YouTube Music Authentication

YouTube Music does not provide an official public API.

SongJump uses browser session headers together with the `ytmusicapi` library.

During `songjump yt-auth` you will be guided to extract the required headers from your browser once. These are stored locally for future transfers.

---

## License

MIT
