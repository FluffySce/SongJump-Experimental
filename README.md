# SongJump

SongJump is a command line tool and backend system that transfers Spotify playlists to YouTube Music.

The project demonstrates integration between multiple services using a Node.js API server, a Python worker service, and a TypeScript CLI client.

The system authenticates with Spotify, retrieves playlist metadata, matches tracks against YouTube Music, and recreates the playlist automatically.

---

## Overview

Typical workflow:

songjump login  
songjump yt-auth  
songjump transfer <spotify-playlist-url>

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

SongJump uses a service-based architecture.

CLI Client (TypeScript)  
 │  
 ▼  
Express API (Node.js)  
 │  
 ▼  
Python Worker (FastAPI)  
 │  
 ▼  
YouTube Music

### Responsibilities

CLI

- user interface
- command parsing
- credential storage
- communication with backend API

Express API

- Spotify OAuth authentication
- playlist retrieval
- transfer orchestration
- job tracking and persistence

Python Worker

- YouTube Music operations
- playlist creation
- track matching
- playlist population

---

## Tech Stack

CLI  
TypeScript, Commander

API Server  
Node.js, Express

Worker Service  
Python, FastAPI, ytmusicapi

External APIs  
Spotify Web API  
YouTube Music

Database  
PostgreSQL

Authentication  
OAuth2 (Spotify), JWT

---

## Key Features

- Spotify OAuth authentication (PKCE)
- CLI-based playlist transfer
- automated track matching
- detailed transfer statistics
- credential caching for repeated use
- separation of API and worker services

---

## Example Usage

Authenticate with Spotify:

songjump login

Configure YouTube Music session:

songjump yt-auth

Transfer a playlist:

songjump transfer https://open.spotify.com/playlist/<playlist-id>

Example result:

Transfer Complete

Playlist: My Playlist  
Total tracks: 81  
Transferred: 80  
Failed: 1  
Success rate: 98.7%

---

## Project Structure

songjump/

cli/  
TypeScript CLI client

backend/  
Express API server

backend/src/modules/  
auth  
spotify  
youtube  
transfer

python-service/  
FastAPI worker service

README.md

---

## Running Locally

Requirements

Node.js 18+  
Python 3.8+  
PostgreSQL  
Spotify Developer credentials

Clone the repository:

git clone https://github.com/<username>/songjump  
cd songjump

Start the services:

Backend API  
cd backend  
npm start

Python worker  
cd python-service  
uvicorn main:app --reload --port 8000

CLI  
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

This authentication step is completed once using the `songjump yt-auth` command.

---

## License

MIT
