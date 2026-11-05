# SHINDO basement · Nightlife 3B

[Actual before/after and seven-view gallery](./SHINDO_REVIEW.html)

The stair now has a sealed rear closure, continuous sloping soffit, framed lower entrance, matching handrails and a paved threshold. The former opening toward the station is gone. Eighteen original steps remain, with over 2.5 m of ceiling clearance along the descent and inside the room.

The basement grows from **18.44 to 37.42 m² gross**: X 15.95–20.40, Z −41.05–−32.64, floor Y −2.945 m. It occupies the clear service strip and space below the station forecourt, clear of station footings and neighboring building footprints. Street entrances, station geometry, navigation reservations and business doors remain unchanged.

The interior adds a paneled walnut counter and brass foot rail, a staff aisle, three illuminated bottle shelves, sink/tap, fridge front, bar tools, upholstered benches, table lighting, vinyl decks, mixer, headphones, record storage, floor-standing speakers, acoustic panels, posters, signage and ceiling services. Warm bar lighting contrasts with the restrained cool listening area. Review refinements corrected the bench bases, rounded the close-range circular fittings and replaced the initial stepped ceiling presentation with a smooth soffit.

## Your music

Put tracks directly in [public/assets/audio/nightlife/shindo](../public/assets/audio/nightlife/shindo/README.md). Open **SHINDO music** in the game controls for track selection, Previous, Play/Pause, Next and Refresh tracks. MP3 is recommended; WAV, OGG, M4A, AAC and FLAC depend on the browser's decoder. Files sort naturally by name and advance automatically. The empty-folder fallback is the already credited Kevin MacLeod recording. Personal tracks are ignored by Git.

The Vite server scans the folder; production builds create a static playlist and copy the files. **Rebuild after adding production tracks.** Sound starts with a user gesture and retains the existing master volume, opening hours, muffled entrance/stair transition and interior stereo mix. Pausing survives global mute/unmute.

## Validation

- `npm.cmd run check`, all **89 tests**, and `npm.cmd run build` pass. The existing Three.js chunk-size advisory remains.
- Actual controller walk reaches the rear lounge and returns to the street; **66 rendered floor/headroom samples** pass. Collision, business-door and station contracts match the baseline; no shader or asset errors.
- Two temporary local MP3s decoded through the real player. Previous/next, automatic advance, pause and mute recovery pass; interior output was measurable and the full mix faded on leaving. Production copies matched source SHA-256 hashes. Test copies were removed and the empty-folder fallback rechecked.
- Seven final 1080p WebGL views were captured and inspected. Entrance, stair and overview comparisons retain the baseline camera, lens, seed 8412, 21:00, damp surface, reflections and simulation timestamp 744.767 s. The earlier interactive actor history differs; these are geometry comparisons.
- Final basement overview at 1323×804, DPR 1: **516 draw calls, 2.868 million submitted triangles**, composite render median **2.8 ms**, p95 **3.3 ms** over 30 samples after warmup. This includes CPU/GPU synchronization, not isolated GPU timing.

Remaining limits: simplified procedural surface wear and bottle labels, static furniture/audio gear, simple acoustic zones without room reverberation, and player-accessible interior circulation without seated venue NPCs.
