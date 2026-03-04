"""Test the full transfer flow directly with the Python service."""
import json
import requests

# Load browser auth headers
with open("browser.json") as f:
    auth_headers = json.load(f)

# Test transfer with one track
test_payload = {
    "authHeaders": json.dumps(auth_headers),
    "playlistName": "SongJump Test Playlist",
    "playlistDescription": "Testing playlist transfer from Spotify",
    "tracks": [
        {
            "spotifyTrackId": "test123",
            "title": "Blinding Lights",
            "artists": "The Weeknd",
            "album": "After Hours"
        }
    ]
}

print("Testing playlist transfer...")
print(f"Creating playlist: {test_payload['playlistName']}")
print(f"With {len(test_payload['tracks'])} track(s)")

try:
    response = requests.post(
        "http://localhost:8000/transfer",
        json=test_payload,
        timeout=60
    )
    
    if response.ok:
        result = response.json()
        print(f"\nSuccess!")
        print(f"YouTube Playlist ID: {result['youtubePlaylistId']}")
        print(f"YouTube Playlist URL: {result['youtubePlaylistUrl']}")
        print(f"Tracks found: {result['successCount']}/{len(test_payload['tracks'])}")
        
        for track in result['results']:
            status = "✓" if track['status'] == 'FOUND' else "✗"
            print(f"  {status} {track['title']} by {track['artist']} - {track['status']}")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"Failed: {e}")
