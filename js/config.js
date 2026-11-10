/*
  SITE SETTINGS

  SPOTIFY_CLIENT_ID — turns on the "Connect Spotify" button (lists the visitor's own playlists).
  Pasting a Spotify / YouTube link works without this.

  How to get one (free, ~5 minutes):
    1. Go to https://developer.spotify.com/dashboard and log in.
    2. "Create app". Name: Leh Chalo Ustaad. Tick "Web API".
    3. Redirect URIs — add BOTH (exactly, with the trailing slash):
         http://127.0.0.1:5173/                (for testing on your computer)
         https://YOUR-SITE.netlify.app/        (your live site)
       Spotify does not accept "localhost" — test at http://127.0.0.1:5173/ instead.
    4. Save, open the app's Settings, copy the Client ID and paste it below.
    5. While the app is in "Development mode", only people you add under
       User Management (max 25) can log in. Apply for an extension to open it to everyone.
*/
const SPOTIFY_CLIENT_ID = '';
