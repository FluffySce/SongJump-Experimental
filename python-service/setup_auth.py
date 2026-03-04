"""
Helper script to set up YouTube Music authentication.

Usage:
    python setup_auth.py
"""

import json
import sys
import subprocess

def main():
    print("=" * 60)
    print("YouTube Music Auth Setup")
    print("=" * 60)
    print()
    print("Choose a method:")
    print()
    print("1. Browser Headers (easiest - paste from DevTools)")
    print("2. Manual JSON (create browser.json yourself)")
    print()
    
    choice = input("Enter 1 or 2: ").strip()
    
    if choice == "1":
        browser_method()
    elif choice == "2":
        manual_method()
    else:
        print("Invalid choice. Running browser method...")
        browser_method()

def browser_method():
    """Use ytmusicapi CLI to setup browser auth"""
    print()
    print("=" * 60)
    print("Browser Header Setup")
    print("=" * 60)
    print()
    print("This will run: ytmusicapi browser")
    print()
    print("Steps:")
    print("1. Open https://music.youtube.com in Chrome (logged in)")
    print("2. Open DevTools (F12) → Network tab")
    print("3. Filter by '/browse'")
    print("4. Click Library to trigger a request")
    print("5. Right-click the request → Copy → Copy request headers")
    print("6. Come back here and paste when prompted")
    print()
    input("Press Enter when ready...")
    print()
    
    # Run the ytmusicapi CLI command
    try:
        result = subprocess.run(
            ["ytmusicapi", "browser", "--file", "browser.json"],
            check=True
        )
        
        print()
        print("=" * 60)
        print("SUCCESS!")
        print("=" * 60)
        print()
        print("Auth saved to: browser.json")
        
        # Show the contents
        try:
            with open("browser.json", "r") as f:
                print()
                print("Contents (copy for /api/youtube/auth):")
                print("-" * 60)
                print(f.read())
                print("-" * 60)
        except:
            pass
        
        # Validate
        validate_auth("browser.json")
        
    except subprocess.CalledProcessError as e:
        print(f"Error running ytmusicapi: {e}")
        print()
        print("Try running manually: ytmusicapi browser --file browser.json")
        sys.exit(1)
    except FileNotFoundError:
        print("ytmusicapi CLI not found. Falling back to Python method...")
        browser_method_python()

def browser_method_python():
    """Fallback: use Python API directly"""
    import ytmusicapi
    
    print()
    print("Paste your request headers below.")
    print("After pasting, press Enter twice (empty line) to finish:")
    print("-" * 60)
    
    lines = []
    while True:
        try:
            line = input()
            if line == "" and lines and lines[-1] == "":
                break
            lines.append(line)
        except EOFError:
            break
    
    headers_raw = "\n".join(lines).strip()
    
    if not headers_raw:
        print("No headers provided!")
        sys.exit(1)
    
    print()
    print("Processing headers...")
    
    ytmusicapi.setup(filepath="browser.json", headers_raw=headers_raw)
    
    print()
    print("Auth saved to: browser.json")
    
    with open("browser.json", "r") as f:
        print()
        print("Contents:")
        print("-" * 60)
        print(f.read())
        print("-" * 60)
    
    validate_auth("browser.json")

def manual_method():
    """Guide user to create browser.json manually"""
    print()
    print("=" * 60)
    print("Manual JSON Setup")
    print("=" * 60)
    print()
    print("Create a file called 'browser.json' with this format:")
    print()
    print('''{
    "Accept": "*/*",
    "Authorization": "SAPISIDHASH <timestamp>_<hash>",
    "Content-Type": "application/json",
    "X-Goog-AuthUser": "0",
    "x-origin": "https://music.youtube.com",
    "Cookie": "<your full cookie string>"
}''')
    print()
    print("To get these values from Chrome:")
    print("1. Go to https://music.youtube.com (logged in)")
    print("2. DevTools (F12) → Network → filter '/browse'")
    print("3. Click on a browse request")
    print("4. Look in 'Request Headers' section")
    print("5. Copy 'authorization' and 'cookie' values")
    print()
    
    input("Press Enter after creating browser.json...")
    
    try:
        validate_auth("browser.json")
    except FileNotFoundError:
        print("browser.json not found!")
        sys.exit(1)

def validate_auth(filepath):
    """Validate the auth file works"""
    print()
    print("Validating authentication...")
    
    try:
        from ytmusicapi import YTMusic
        yt = YTMusic(filepath)
        # Try a simple operation to verify
        yt.get_home(limit=1)
        print("✓ Authentication is valid!")
        print()
        print(f"Next: Use the contents of {filepath} with POST /api/youtube/auth")
    except Exception as e:
        print(f"✗ Validation failed: {e}")
        print()
        print("The auth might still work. Try using it.")

if __name__ == "__main__":
    main()
