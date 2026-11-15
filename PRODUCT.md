# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
A single listener (the owner) with about 30 Spotify playlists plus Liked Songs, using it on desktop and phone (installable PWA). May be shared with others later; not a requirement now.

## Product Purpose
Spotify makes it hard to remember what each playlist holds and where a song lives. The tracker syncs the user's library after a Spotify login and lets them find any song fast, see what every playlist contains, group playlists into their own folders, track what changed between syncs, browse and read lyrics, and jump into the exact song in Spotify.

## Positioning
A cross-playlist memory of the user's own library: every song knows every playlist it is in, and every sync leaves a change log. Spotify's own app shows neither.

## Operating Context
Logs in with Spotify (PKCE, read-only scopes). Data is cached in the browser (IndexedDB). Lyrics come from LRCLIB. Spotify's API does not expose playlist folders, so folders are in-app collections, populated by a paste importer.

## Capabilities and Constraints
- Sync playlists, Liked Songs, tracks; incremental by snapshot id; activity diff log.
- Search across songs, artists, albums, playlists; duplicates (songs in 2+ playlists).
- Collections (user folders) with paste import. Demo mode must never write to real data.
- Open in Spotify (web URL and spotify: URI). Responsive web plus PWA.
- Tracks of playlists the user does not own may be unreadable (shown as Limited).

## Brand Commitments
None beyond the name "SpotTracker". Brand mark is an in-house four-bar equaliser; the Spotify logo is not used.

## Evidence on Hand
Real library data arrives only after login. No testimonials or external claims exist; none should be invented.

## Product Principles
- Finding a song is the fastest path; everything else supports it.
- Every sync should visibly answer "what changed?".
- The user's folders and data stay in their browser.
- Motion should orient (where did this come from, where did it go) as well as delight.

## Accessibility & Inclusion
Respect reduced-motion preferences. Keyboard reachable controls.
