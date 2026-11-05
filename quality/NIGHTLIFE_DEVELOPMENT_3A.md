# Nightlife Development 3A — Yoto After Dark

Implemented 4 November 2026. [Actual WebGL gallery and walk/audio recording](./YOTO_REVIEW.html). Primary review: seed **8412**, **21:00**, existing **08 / Yoto nightlife street** preset. No NPC customer AI, new district or road was added.

## Audit and architectural decisions

The existing twelve authored frontages, theatre marquee, original lantern/condenser/lamp GLBs, measured Japanese signs, exterior business destinations and detailed shallow rooms were retained. Their strongest existing features were the theatre focal point, lanterns, services and differing furniture plans. Repeated tall upper floors, identical front framing/awnings, blocked player access and the absence of recorded music were the main gaps.

The original fixed camera remains eye (−18.8, 1.82, −25), target (16, 3.8, −25), FOV 58°. [Before](./captures/yoto3a-street-before.png) / [after](./captures/yoto3a-street-after.png) and the corresponding daytime pair share simulation clock 300 and identical actor/train state, exposure, After Rain wetness 0.64, reflections and contact shading. [The comparison audit](./yoto3a-capture-audit.json) verifies these conditions.

The west half now includes selected two-storey-scale bars instead of uniformly tall frontage shells. 月影 / Tsukikage has a distinct small-bar identity, larger glazing bays and a shallower cloth hood; the café has metal glazing and its own turntable/speaker. Ramen retains a working counter and noren. Layered small signs, renovation patches, mounted boxes, conduits and lower-wall wear belong to actual facades. Blade heights now follow the lower roofs instead of projecting indiscriminately above them. The alley was already physically narrow; no extra NPC passage was invented.

The east half retains larger entertainment buildings and gains the authored **Yoto Building** at X 18.14, Z −27.55. Its rendered frontage is **4.68 m wide**, trimmed inside the old 5.4 m reservation to clear the neighboring residence. A 9.9 m roofline contains three above-ground floors; rooftop plant projects above the roof. Actual shallow upper rooms have slabs, side/rear walls, glazing, tables/chairs and private interior doors. Their signs agree with the following directory:

| Floor | Tenant | Player access |
|---|---|---|
| B1 | 深度 / SHINDO electronic music bar | Real connected stair and room. |
| 1F | 夜灯亭 / Yototei kitchen and foyer | Small ground-floor foyer; kitchen counter blocks service space. |
| 2F | 余白 / Yohaku listening room | Rendered private offstage tenant; not enterable in this milestone. |
| 3F | 音庭 / Otoniwa karaoke | Rendered private offstage tenant; not enterable in this milestone. |

Stacked blade signs, recessed room fronts, small fascia panels, directory, stair placard, fixing brackets, drainage and plant use real world-space geometry. The established measured-aspect typography pipeline remains in use. There is no fictitious 5F, billboard replacement or fake entrance to a solid player-accessible wall.

## Real basement spatial contract

[YotoVenueLayout.ts](../src/world/generation/YotoVenueLayout.ts) owns the floor/step surfaces, retaining walls, furniture obstacles, NPC reservation and acoustic positions. [YotoArchitecture.ts](../src/world/generation/YotoArchitecture.ts) renders those dimensions. The existing [player controller](../src/world/controls/PlayerController.ts) gains one optional local support/body contract; station traversal remains authoritative outside it.

- Street entry center: **(19.5, 0.115, −27.35)**.
- Shaft clear width: **1.8 m**, X 18.6…20.4, Z −27.6…−32.64.
- **18 treads**, each 0.28 m going and 0.17 m rise: total descent **3.06 m**.
- Basement floor: **Y −2.945**, X 17.5…20.4, Z −39…−32.64: **18.44 m² gross clear floor rectangle** before furniture.
- Ceiling underside: **Y −0.42**, giving **2.525 m** floor-to-ceiling clearance.
- Existing rail and station foundations are well north of this room. Adjacent generated ground footprints remain outside the shaft and its side service gap.

The ground slab and the backdrop's otherwise hidden underlying terrain both have the same actual shaft cutout. The rear shaft is open above; the covered street entrance opens into the descending stair. Retaining side walls prevent falls and lateral movement into the ground. A continuous handrail, recessed step lamps and metal nosings explain the route. The original opaque frontage footprint remains an NPC reservation, while the player uses the real doorway/walls instead of that blanket rectangle. NPCs still stop at the exterior thresholds.

The compact room has a bar and three stools, bottle shelves with shaped amber/green bottles and labels, a small standing/table corner, vinyl crates, twin decks and mixer, speaker cabinets, acoustic wall treatment, ventilation and a closed service door. A propped-open acoustic door leaf sits beside the bottom entrance, clear of the aisle. The player can walk along the counter and return by the same stairs. Furniture and wall boundaries are active player obstacles. No traversal teleport, decorative-only staircase or elevator shortcut is used.

The new frontage exposed an existing overlap with the back of a main-street building. That lot now ends at X 15.5, leaving 0.3 m to the new frontage at X 15.8, as well as clearing the shaft. Its street entrance and original depth-dependent RNG draw count are preserved. Default seed 8412 shortens one rear building depth; deeper alternate-seed parcels use the same reservation. [Seed validation](./yoto3a-seed-validation.json) records the tested adjustments, and the spatial audit compares the declared correction with the original bounds rather than claiming every collider is unchanged.

## Recorded music and acoustic behavior

Two complete MP3 recordings are bundled locally: **“EDM Detection Mode”** for SHINDO and **“Backbay Lounge”** for the café/listening frontage, both by **Kevin MacLeod (incompetech.com), CC BY 4.0**. Exact author-source URLs, ISRC, file sizes, original hashes, licence and attribution are in [provenance](../public/assets/music/provenance.json). [Music credits](../public/assets/music/CREDITS.html) are accessible beside the sound controls and on a room placard. The recordings are unchanged; the game applies playback gain, filtering, panning and looping. These are musical recordings, not Tokyo field recordings or synthesized placeholder patterns.

[VenueMusic.ts](../src/world/audio/VenueMusic.ts) streams local HTML media into the existing Web Audio master/compressor/analyser/recording chain, avoiding large decoded PCM allocations. Each recording starts once after the existing audio unlock gesture and keeps its playback position during movement, muting, business closure and return. No runtime CDN, microphone, Spotify or YouTube is used.

[VenueMusicMix.ts](../src/world/audio/VenueMusicMix.ts) shares the real shaft/room coordinates. Exterior music uses an entrance-positioned HRTF panner and bounded distance attenuation; off-axis wall transmission is much quieter and low-passed. Descending the stairs increases gain and bandwidth. Inside, the same recorded stream feeds the stereo master directly; distant venues fade out. Existing mute, volume, hidden-page attenuation and restaurant opening schedules apply. A closed-portal acoustic input is tested, but the rendered venue door is held open; interactive door closing is not implemented.

[Actual playback measurements](./yoto3a-playback-test.json) confirm both tracks decoded, remained playing and had one start each. Target SHINDO gain rises from approximately **0.017 exterior / 0.085 halfway down / 0.25 inside**, with low-pass cutoffs **2,100 / 3,975 / 17,500 Hz**, versus **320 Hz** through a wall. Mute reached RMS below 0.000001 in the first playback run. Measured RMS includes existing city sound and changing musical content, so it is a functional observation rather than a controlled loudness comparison.

The [actual walkthrough](./captures/yoto3a-walk-sequence.mp4) records street → entrance → descent → bar → turn → ascent → street in approximately sixteen seconds. Its [position/audio trace](./captures/yoto3a-walk-sequence.json) records continuous track time and the real walking controller. The synchronized [48 kHz PCM sidecar](./captures/yoto3a-walk-sequence.wav) independently preserves the sound; [PCM analysis](./yoto3a-pcm-audit.json) records measured peak/RMS and clipping.

## Visual review and corrections

The [gallery](./YOTO_REVIEW.html) contains twelve finished views: fixed night/day comparisons, east entertainment street, intimate west alley, stacked facade, marked entrance, staircase, interior, bar counter, inside looking back out, dry street and overhead placement. Wet night is the fixed primary view. Every PNG has adjacent camera/render/state JSON; new spaces have finished views rather than fabricated “before” interiors.

The [viewer validation](./yoto3a-viewer-validation.json) decodes all fourteen gallery images, seeks three actual MP4 frames, loads the PCM sidecar and checks its local report/asset links. The final video is 15.62 seconds at 1322 × 776; its synchronized audio is 15.66 seconds at 48 kHz, with zero clipped samples.

First-pass review led to lower blade placement, corrected 1F/2F/3F assignments, less uniform west-side frames/curtains/hoods, shaped bottles, more readable tenant identity and removal of the second hidden terrain slab. The overhead view exposes the actual small rear shaft and neighboring parcels. No global bloom, camera concealment or screenshot manipulation was used.

[Research and rights](./references/yoto/README.md) distinguish Golden Gai's intimate low-rise premises, Omoide's warm counter alleys and Kabukicho's stacked entertainment buildings. Original materials carry contextual patching, grain, roughness and wear; this is an authored real-time environment, not scan-based photorealism.

## Validation and performance

`npm.cmd run check`, `npm.cmd test` (**87 tests**) and `npm.cmd run build` pass. Six new tests exercise the actual controller's descent/return and blocking, tread/ceiling support, alternate-seed service clearance, acoustic transitions/closure and recording hashes/credits. Existing station, train, passenger, traffic, signage, vehicle and neighborhood suites remain included.

The [actual browser spatial audit](./yoto3a-spatial-audit.json) checks 504 newly attributed instanced parts / 15,992 triangles against existing navigation body samples and a 250-sample actual-controller descent. It also checks above-ground venue parts against the other building reservations. It records zero building, route, head-volume or train-envelope intersections, the declared rear-lot correction, unchanged doors/station/navigation, no shader-link or asset errors, and a successful return to the street. Maximum player elevation step is 0.17 m. The shaft ray hits a tread at Y −0.735 rather than the former terrain slab.

The [generated-world regression](./yoto3a-simulation-audit.json) uses the current actual bounds for 600 open seconds at 21:00 plus a 600-second 03:00 closure drain, at 30 Hz. It completes **36/36 station journeys**, four train arrivals/departures, ten boardings/deliveries, twenty alightings and 130 vehicle exits. Invalid positions, unsafe crossings/departures, overlaps, capacity violations, gate conflicts, wall hits and vehicle overlaps are zero; all gate reservations clear and the train parks after closure.

| Comparable fixed daytime Yoto render, 1323 × 804 / DPR 1 | Before | After |
|---|---:|---:|
| Composite draw calls | 790 | 856 |
| Composite triangles | 4,388,952 | 4,407,636 |
| Median synchronous render wall time | 5.2 ms | 6.8 ms |
| P95 wall time | 7.7 ms | 7.3 ms |

[Before](./yoto3a-before-measurements.json) / [after](./yoto3a-after-measurements.json) measure thirty composite renders after eight warmups with `gl.finish`; this includes CPU/GPU work and host scheduling, not isolated GPU timing. Draw calls rise 8.35% and triangles 0.43%; median wall time rises 1.6 ms in this short sample. Two bounded non-shadowed practical lights are added; shared instancing/materials and the original GLB pipeline remain. No new global renderer or audio architecture, model package, shadow map or transparency layer stack is introduced. The existing Three.js build chunk-size advisory remains.

[Five-second visible live samples](./yoto3a-frame-timing.json), RTX 5070 Ti, 1323 × 777 / DPR 1, measured **132.5 FPS** on the night street (median 8.3 ms, P95 8.4 ms) and **239.8 FPS** in the basement (median 4.2 ms, P95 4.3 ms). These are hardware-specific graphics samples, not matched before/after FPS evidence or isolated GPU measurements; sound was unlocked separately for the playback test.

## Reproduce and explore

Start the existing Vite development task. Use `http://127.0.0.1:5173/?view=7&seed=8412&review=1` for frozen review. Import [yoto-browser-checks.mjs](../tools/yoto-browser-checks.mjs) and call `audit()`, `captureSet('after')`, `validateCaptures()` and `simulationTest()`. Preserve the original before captures. Enable sound with the existing button, then use `playbackTest()` and `recordWalk()` with the shared tab visible. `captureSet` requires a fresh page and advances to clock 300; `recordWalk` resumes the live simulation.

For ordinary play, load `?view=7&seed=8412`, select 21:00 and enable sound. The marked **B1 深度** entrance is at the east end on the north side of the alley, near X 19.5, Z −27.5. Walk forward down the stairs; use normal WASD to explore and return. No interaction key or teleport is needed.

## Remaining limitations

The venue is an intimate three-stool music bar, not a large dance club. Upper tenants and most old restaurants remain private/exterior-visible; only the new foyer and basement gain player access. No bartender/customer AI or new character models are added. The acoustic model is a small authored portal/zone model, not general ray-traced sound propagation; the door is propped open, with no interactive animation. MP3 looping uses the browser's normal loop behavior; a fully seamless DJ mix is not claimed.

Some old upper facades, rear surfaces and shelf arrangements still repeat. Materials remain procedural and stylized; wear is restrained rather than dense decal coverage. The rear shaft is open above and has plain service walls. Close inspection could benefit from better upholstery, more varied record sleeves and further authored wood/metal surfacing. These are visible quality limits, not hidden behind fog or unimplemented room claims.
