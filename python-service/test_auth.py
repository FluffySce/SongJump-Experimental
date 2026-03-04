from ytmusicapi import YTMusic

try:
    ytmusic = YTMusic("browser.json")
    playlists = ytmusic.get_library_playlists(limit=5)
    print("Authentication successful!")
    print(f"Found {len(playlists)} playlists:")
    for p in playlists:
        print(f"  - {p['title']}")
except Exception as e:
    print(f"Authentication failed: {e}")
