"""
YouTube Music service for playlist transfer operations.
Uses ytmusicapi with browser authentication headers.
"""

import json
import logging
from typing import Optional
from dataclasses import dataclass

from ytmusicapi import YTMusic

logger = logging.getLogger(__name__)


@dataclass
class TrackResult:
    """Result of attempting to match and add a track."""
    spotify_track_id: str
    title: str
    artist: str
    status: str  # FOUND, NOT_FOUND, FAILED
    yt_video_id: Optional[str] = None
    error: Optional[str] = None


class YTMusicService:
    """Service for interacting with YouTube Music via ytmusicapi."""

    def __init__(self, auth_headers: str):
        """
        Initialize YTMusic client with browser auth headers.
        
        Args:
            auth_headers: JSON string of browser request headers
        """
        self.ytmusic = YTMusic(auth=auth_headers)

    def create_playlist(
        self,
        title: str,
        description: str = "",
        privacy_status: str = "PUBLIC"
    ) -> str:
        """
        Create a new playlist on YouTube Music.
        
        Args:
            title: Playlist title
            description: Playlist description
            privacy_status: PRIVATE, PUBLIC, or UNLISTED
            
        Returns:
            Playlist ID string
            
        Raises:
            Exception if playlist creation fails
        """
        result = self.ytmusic.create_playlist(
            title=title,
            description=description,
            privacy_status=privacy_status
        )
        
        # create_playlist returns string ID on success, dict on error
        if isinstance(result, dict):
            error_msg = result.get("error", "Unknown error creating playlist")
            raise Exception(f"Failed to create playlist: {error_msg}")
        
        logger.info(f"Created playlist '{title}' with ID: {result}")
        return result

    def search_track(
        self,
        title: str,
        artist: str,
        album: Optional[str] = None,
        isrc: Optional[str] = None
    ) -> Optional[str]:
        """
        Search for a track on YouTube Music.
        
        Args:
            title: Track title
            artist: Artist name(s)
            album: Optional album name for better matching
            isrc: Optional ISRC code (not directly searchable but could help)
            
        Returns:
            videoId if found, None otherwise
        """
        # Build search query: "artist title"
        query = f"{artist} {title}"
        
        try:
            results = self.ytmusic.search(query, filter="songs", limit=5)
            
            if not results:
                logger.debug(f"No results for query: {query}")
                return None
            
            # Return the first song result's videoId
            for result in results:
                if result.get("resultType") == "song" and result.get("videoId"):
                    logger.debug(f"Found match for '{query}': {result['videoId']}")
                    return result["videoId"]
            
            # If no songs, try first result with videoId
            if results[0].get("videoId"):
                return results[0]["videoId"]
                
            return None
            
        except Exception as e:
            logger.error(f"Search failed for '{query}': {e}")
            return None

    def add_tracks_to_playlist(
        self,
        playlist_id: str,
        video_ids: list[str]
    ) -> bool:
        """
        Add multiple tracks to a playlist.
        
        Args:
            playlist_id: YouTube Music playlist ID
            video_ids: List of video IDs to add
            
        Returns:
            True if successful
        """
        if not video_ids:
            logger.info("No tracks to add to playlist")
            return True
            
        result = self.ytmusic.add_playlist_items(
            playlistId=playlist_id,
            videoIds=video_ids,
            duplicates=True  # Allow duplicates
        )
        
        # Returns status string on success, dict on error
        if isinstance(result, dict) and "error" in result:
            raise Exception(f"Failed to add tracks: {result['error']}")
        
        logger.info(f"Added {len(video_ids)} tracks to playlist {playlist_id}")
        return True


def transfer_playlist(
    auth_headers: str,
    playlist_name: str,
    playlist_description: str,
    tracks: list[dict]
) -> dict:
    """
    Execute full playlist transfer to YouTube Music.
    
    Args:
        auth_headers: JSON string of browser auth headers
        playlist_name: Name for the new playlist
        playlist_description: Description for the playlist
        tracks: List of track dicts with keys:
            - spotifyTrackId: Spotify track ID
            - title: Track title
            - artists: Artist name(s) as string
            - album: Optional album name
            - isrc: Optional ISRC code
            
    Returns:
        Dict with:
            - youtubePlaylistId: Created playlist ID
            - youtubePlaylistUrl: URL to the playlist
            - results: List of TrackResult dicts
            - successCount: Number of tracks found
            - failureCount: Number of tracks not found
    """
    service = YTMusicService(auth_headers)
    
    # Step 1: Create the playlist
    playlist_id = service.create_playlist(
        title=playlist_name,
        description=playlist_description,
        privacy_status="PUBLIC"
    )
    
    # Step 2: Search for each track
    results: list[TrackResult] = []
    found_video_ids: list[str] = []
    
    for track in tracks:
        spotify_id = track.get("spotifyTrackId", "")
        title = track.get("title", "")
        artist = track.get("artists", "")
        album = track.get("album")
        isrc = track.get("isrc")
        
        try:
            video_id = service.search_track(
                title=title,
                artist=artist,
                album=album,
                isrc=isrc
            )
            
            if video_id:
                results.append(TrackResult(
                    spotify_track_id=spotify_id,
                    title=title,
                    artist=artist,
                    status="FOUND",
                    yt_video_id=video_id
                ))
                found_video_ids.append(video_id)
            else:
                results.append(TrackResult(
                    spotify_track_id=spotify_id,
                    title=title,
                    artist=artist,
                    status="NOT_FOUND"
                ))
                
        except Exception as e:
            logger.error(f"Error processing track {title}: {e}")
            results.append(TrackResult(
                spotify_track_id=spotify_id,
                title=title,
                artist=artist,
                status="FAILED",
                error=str(e)
            ))
    
    # Step 3: Add all found tracks to playlist
    if found_video_ids:
        service.add_tracks_to_playlist(playlist_id, found_video_ids)
    
    # Build response
    success_count = sum(1 for r in results if r.status == "FOUND")
    failure_count = len(results) - success_count
    
    return {
        "youtubePlaylistId": playlist_id,
        "youtubePlaylistUrl": f"https://music.youtube.com/playlist?list={playlist_id}",
        "results": [
            {
                "spotifyTrackId": r.spotify_track_id,
                "title": r.title,
                "artist": r.artist,
                "status": r.status,
                "ytVideoId": r.yt_video_id,
                "error": r.error
            }
            for r in results
        ],
        "successCount": success_count,
        "failureCount": failure_count
    }
