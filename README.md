# SpotTracker

Log in with Spotify and every playlist, liked song and track is synced into a fast, animated, responsive web app.
Browse and search everything, group playlists into your own collections (folders), read lyrics, open any song in Spotify,
and see an activity feed of what was added or removed between syncs.

## Run it

```bash
cd C:\Verdentra\spotify-tracker
npm install
npm run dev        # http://127.0.0.1:5173
```

Click **Try demo data** on the welcome screen to explore the UI without logging in.

## Connect your Spotify (one-time, ~2 minutes)

1. Open https://developer.spotify.com/dashboard and **Create app** (any name).
2. Under **Redirect URIs** add exactly: `http://127.0.0.1:5173/`
3. Tick **Web API**, save, then copy the **Client ID**.
4. Put it in `.env`: `VITE_SPOTIFY_CLIENT_ID=<your id>` and restart `npm run dev`.
5. In the app click **Continue with Spotify**. Sync starts automatically.

Login uses the PKCE flow, so there is no client secret and no backend. Tokens and the synced library stay in your browser
(localStorage and IndexedDB). Scopes are read-only: `user-library-read playlist-read-private playlist-read-collaborative`.

New Spotify apps are in *development mode*: only users you add under **User Management** in the dashboard (up to 25) can log in.

## Import your Spotify folders

Library → **Import folders**. Paste one folder per block, folder name ending in `:`, playlists indented underneath
(playlist names or `open.spotify.com/playlist/...` links; links match exactly, names match ignoring case/punctuation).
A preview shows what matched before anything is saved. Choose **Add to existing** or **Replace existing**.

## How sync works

- First sync reads all playlists plus Liked Songs. Later syncs only refetch playlists whose `snapshot_id` changed.
- Each re-sync diffs old and new tracks and records additions/removals in **Activity**.
- Sync runs on login, via **Sync now**, and when you return to the tab after 5+ minutes.

## Known limits

- **Folders:** Spotify's API does not expose its playlist folders, so collections are created in the app and stored locally.
- **Playlists you don't own:** Spotify may refuse to return tracks for other people's playlists. Those show a "Limited" badge.
- **Lyrics:** Spotify has no lyrics API. Lyrics come from [LRCLIB](https://lrclib.net), so some songs have none.
- **Open in Spotify:** the main button opens the web URL (which hands off to the app on most devices); *Play in app* uses the `spotify:` URI.

## Mobile

The layout is responsive (bottom navigation, bottom-sheet track view with swipe-down to close). For a phone, deploy the built
`dist/` over HTTPS (Netlify, Vercel, GitHub Pages), add that URL as a second redirect URI in the Spotify dashboard, and set
`VITE_SPOTIFY_CLIENT_ID` in the host's build environment. Spotify only allows `http` for loopback addresses.
