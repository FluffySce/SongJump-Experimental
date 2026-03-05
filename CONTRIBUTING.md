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

If you’re unsure whether something fits the project, open an issue first so we can discuss it.

## Development Setup

Requirements:

- Node.js 18+
- Python 3.8+
- PostgreSQL
- Spotify Developer credentials

Clone the repository:

```
git clone https://github.com/FluffySce/SongJump-Experimental.git
cd SongJump-Experimental
```

Install dependencies and configure environment variables before running the services.

Backend:

```
cd backend
npm install
npm start
```

Python worker:

```
cd python-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

CLI:

```
cd cli
npm install
npm run build
npm link
```

## Making Changes

1. Fork the repository
2. Create a new branch

```
git checkout -b feature/your-feature-name
```

3. Make your changes
4. Test the project locally
5. Commit and push

```
git commit -m "Add: short description of change"
git push origin feature/your-feature-name
```

6. Open a Pull Request

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

If you have questions or ideas, open an issue and we can discuss them there.

Thanks for helping improve SongJump.
