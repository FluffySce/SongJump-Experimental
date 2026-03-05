# SongJump

SongJump is a command-line tool that transfers Spotify playlists to YouTube Music.

The project demonstrates a multi-service architecture integrating the Spotify Web API with YouTube Music using a Node.js API server, a Python worker service, and a TypeScript CLI client.

---

## Example

Run the following commands:

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

## Usage

Authenticate with Spotify:

    songjump login

Configure YouTube Music session:

    songjump yt-auth

Transfer a playlist:

    songjump transfer <spotify-playlist-url>

Optional:

    songjump transfer <playlist-url> --open

---

## Project Structure

    songjump
    │
    ├── cli
    │   └── TypeScript CLI client
    │
    ├── backend
    │   └── Express API server
    │       └── modules
    │           ├── auth
    │           ├── spotify
    │           ├── youtube
    │           └── transfer
    │
    ├── python-service
    │   └── FastAPI worker for YouTube Music
    │
    └── README.md

---

## Running Locally

Requirements

- Node.js 18+
- Python 3.8+
- PostgreSQL
- Spotify Developer credentials

Clone the repository:

    git clone https://github.com/<username>/songjump
    cd songjump

Start services.

Backend API:

    cd backend
    npm start

Python worker:

    cd python-service
    uvicorn main:app --reload --port 8000

CLI:

    cd cli
    npm link

Run the CLI:

    songjump login
    songjump yt-auth
    songjump transfer <spotify-playlist-url>

---

## Notes on YouTube Music Authentication

YouTube Music does not provide a public API for playlist creation.

SongJump uses browser session headers extracted from an authenticated YouTube Music session together with the ytmusicapi library to perform operations.

This authentication step is completed once using:

    songjump yt-auth

---

## License

MIT
