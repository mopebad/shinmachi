# SHINDO local music

Drop tracks directly into this folder. MP3, WAV, OGG and M4A work when supported by your browser; AAC/FLAC decoding also depends on the browser. MP3 is the simplest choice.

Open **SHINDO music** in the in-game controls. Use the track selector, Previous, Play/Pause and Next. **Refresh tracks** rescans the folder in the Vite dev server. The playlist is naturally sorted by filename; prefix names with `01`, `02`, etc. to control its order. Tracks advance automatically and loop through the list.

If the folder is empty, the bundled, credited Kevin MacLeod sample plays. Your files remain local and are ignored by Git. After adding files for a production version, run `npm.cmd run build` again; the build creates a static playlist and copies the audio.

Music follows the existing venue acoustics: quiet/muffled outside, fuller down the stairs, stereo inside. Sound must be enabled once by clicking Play or Enable sound. Master sound volume still applies. Pausing the venue player survives global mute/unmute.

Shindo 3C also remembers the selected track and paused state across reloads. The listening console shows the current filename/title; record rotation and small level meters follow real playback. Inside, speaker-position cues and a short room response accompany the stereo mix while street ambience fades.

In Shindo 3D, approach the selector cabinet at the back of the room. Look at a Previous / Play-Pause / Next button and press **E**, or click the physical button while the pointer is released. These controls work with the HUD hidden (**H**). They require a clear view within 1.85 m; the music panel above remains the fallback for selecting any track or refreshing the folder.
