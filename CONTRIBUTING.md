# Contributing to SongJump

Thanks for your interest in contributing.

SongJump is still experimental and evolving, so contributions, ideas, and bug reports are welcome.

## Ways to Contribute

You can help by:

- fixing bugs
- improving track matching
- improving CLI usability
- adding support for new platforms (e.g. Apple Music)
- improving documentation
- improving error handling and logging

If you're unsure whether something fits the project, open an issue first so we can discuss it.

## Development Setup

Requirements:

- Node.js 18+
- Python 3.8+

Clone the repository:

```bash
git clone https://github.com/<username>/songjump.git
cd songjump
```

### Backend Setup

```bash
cd backend
npm install
npx prisma migrate dev    # Creates SQLite database
npm start
```

The backend uses SQLite by default (auto-created at `prisma/dev.db`).
No PostgreSQL or environment variables required for development.

### Python Worker

```bash
cd python-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### CLI

```bash
cd cli
npm install
npm run build
npm link
```

## Local OAuth Development (Optional)

By default, the CLI uses the hosted OAuth proxy for Spotify authentication.

To test OAuth changes locally:

1. Create a Spotify Developer app at https://developer.spotify.com/dashboard
2. Add redirect URI: `http://localhost:3000/api/spotify/callback`
3. Create `oauth-proxy/.env.local`:
   ```
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ```
4. Run OAuth proxy locally:
   ```bash
   cd oauth-proxy
   npm install
   npm run dev    # Starts on port 3000
   ```
5. Update CLI config to use local proxy:
   ```bash
   # In ~/.songjump/config.json, set:
   # "oauthProxyUrl": "http://localhost:3000"
   ```

## Making Changes

1. Fork the repository
2. Create a new branch

```bash
git checkout -b feature/your-feature-name
```

3. Make your changes
4. Test the project locally
5. Commit and push

```bash
git commit -m "Add: short description of change"
git push origin feature/your-feature-name
```

6. Open a Pull Request

## Project Structure

```
songjump/
├── backend/           # Express API server
│   ├── prisma/        # Database schema (SQLite)
│   └── src/           # API routes and services
├── cli/               # TypeScript CLI
│   └── src/           # Commands and utilities
├── python-service/    # FastAPI worker for YouTube Music
└── oauth-proxy/       # Hosted Spotify OAuth (Vercel)
```

## Guidelines

- Keep changes focused and small when possible
- Add comments where behavior may not be obvious
- Avoid committing secrets or `.env` files
- Test changes locally before submitting a PR

## Ideas for Future Work

Some areas that could be improved:

- reverse transfers (YouTube → Spotify)
- Apple Music support
- better track matching heuristics
- batch playlist transfers
- optional web interface

## Questions

Open an issue or start a discussion if you have questions.
