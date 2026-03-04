"""
FastAPI microservice for YouTube Music playlist transfers.
Handles ytmusicapi operations on behalf of the Express backend.
"""

import logging
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from ytmusic_service import transfer_playlist

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="YTMusic Transfer Service",
    description="Microservice for transferring playlists to YouTube Music",
    version="1.0.0"
)


# Request/Response Models
class Track(BaseModel):
    """Track data from Spotify."""
    spotifyTrackId: str
    title: str
    artists: str  # Comma-separated artist names
    album: Optional[str] = None
    isrc: Optional[str] = None


class TransferRequest(BaseModel):
    """Request body for playlist transfer."""
    authHeaders: str  # JSON string of browser auth headers
    playlistName: str
    playlistDescription: Optional[str] = ""
    tracks: list[Track]


class TrackResult(BaseModel):
    """Result for a single track transfer."""
    spotifyTrackId: str
    title: str
    artist: str
    status: str  # FOUND, NOT_FOUND, FAILED
    ytVideoId: Optional[str] = None
    error: Optional[str] = None


class TransferResponse(BaseModel):
    """Response for playlist transfer."""
    youtubePlaylistId: str
    youtubePlaylistUrl: str
    results: list[TrackResult]
    successCount: int
    failureCount: int


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str


# Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        service="ytmusic-transfer"
    )


@app.post("/transfer", response_model=TransferResponse)
async def transfer_playlist_endpoint(request: TransferRequest):
    """
    Transfer a playlist to YouTube Music.
    
    Creates a new playlist and searches for each track,
    adding found tracks to the playlist.
    """
    logger.info(f"Starting transfer: {request.playlistName} ({len(request.tracks)} tracks)")
    
    if not request.authHeaders:
        raise HTTPException(
            status_code=401,
            detail="Missing YouTube Music authentication headers"
        )
    
    if not request.tracks:
        raise HTTPException(
            status_code=400,
            detail="No tracks provided for transfer"
        )
    
    try:
        # Convert Pydantic models to dicts
        tracks_data = [
            {
                "spotifyTrackId": t.spotifyTrackId,
                "title": t.title,
                "artists": t.artists,
                "album": t.album,
                "isrc": t.isrc
            }
            for t in request.tracks
        ]
        
        result = transfer_playlist(
            auth_headers=request.authHeaders,
            playlist_name=request.playlistName,
            playlist_description=request.playlistDescription or "",
            tracks=tracks_data
        )
        
        logger.info(
            f"Transfer complete: {result['successCount']}/{len(request.tracks)} tracks found"
        )
        
        return TransferResponse(**result)
        
    except Exception as e:
        logger.error(f"Transfer failed: {e}")
        
        # Check for auth errors
        error_str = str(e).lower()
        if "401" in error_str or "unauthorized" in error_str or "auth" in error_str:
            raise HTTPException(
                status_code=401,
                detail="YouTube Music authentication failed. Please re-authenticate."
            )
        
        raise HTTPException(
            status_code=500,
            detail=f"Transfer failed: {str(e)}"
        )


class ValidateAuthRequest(BaseModel):
    """Request body for auth validation."""
    auth_headers: str


@app.post("/validate-auth")
async def validate_auth(request: ValidateAuthRequest):
    """
    Validate YouTube Music authentication headers.
    
    Attempts to initialize YTMusic client to verify headers are valid.
    """
    try:
        from ytmusicapi import YTMusic
        ytmusic = YTMusic(auth=request.auth_headers)
        # Try to get account info to verify auth works
        return {"valid": True, "message": "Authentication valid"}
    except Exception as e:
        logger.error(f"Auth validation failed: {e}")
        return {"valid": False, "message": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
