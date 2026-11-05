# Shinmachi / 新町

A dense, fictional Tokyo-inspired neighborhood built with Three.js, TypeScript and Vite. Walk the commercial street, lantern alley, residential lane, and station forecourt while pedestrians, left-hand traffic, and a detailed elevated commuter train move through the district. The default evening view looks toward a fictional orange lattice broadcast tower, with optional after-rain street reflections.

The latest [Shindo listening-bar polish](./quality/SHINDO_3C.md) adds a coherent modern identity, refined materials, curated bar details, compact monitors, playback-driven records/meters and improved room acoustics. Drop tracks into [the local music folder](./public/assets/audio/nightlife/shindo/README.md) and use **SHINDO music** in the controls. [Actual comparisons, eight final views and a motion clip](./quality/SHINDO_3C_REVIEW.html) show the result. TypeScript, 91 tests and production build pass. The preceding [3B pass](./quality/SHINDO_3B.md) enclosed the stairs and expanded the basement to 37.42 m².

The preceding [Yoto After Dark pass](./quality/NIGHTLIFE_DEVELOPMENT_3A.md) retains the authored alley and adds a continuously walkable basement music bar, a coherent three-floor entertainment frontage, more individual small-bar architecture and two locally bundled licensed music recordings with spatial filtering. Select **08 / Yoto nightlife street**, set 21:00 and enable sound; the **B1 深度** entrance is at the east end on the north side. The [actual WebGL/video/audio viewer](./quality/YOTO_REVIEW.html) contains matched night/day comparisons and a recorded walk down the stairs and back. Its milestone suite passed 87 tests. [Music credits](./public/assets/music/CREDITS.html) identify both Kevin MacLeod recordings under CC BY 4.0.

The preceding [neighborhood pass](./quality/CITY_DEVELOPMENT_2B.md) distinguishes the commercial corridor, station quarter, residential lane and restaurant alley through shared district metadata, four housing families, three office families, restrained residential signage and gentle activity/audio preferences. Thirty-two existing building presentations are replaced and eight pre-existing parcel conflicts corrected within their original lots. The [nine-pair comparison viewer](./quality/NEIGHBORHOOD_REVIEW.html) includes fixed day/night WebGL captures, with spatial, deterministic replay and passenger regressions; its milestone suite passed 81 tests. Select **05 / Residential lane** to see the clearest architectural change.

The preceding [railway environment pass](./quality/ENVIRONMENT_DEVELOPMENT_1B.md) embeds the station in twenty additional compact parcels, with under-rail premises, road portals, supported girders, drainage, maintenance access and a clear station forecourt. The [comparison viewer](./quality/RAIL_DISTRICT_REVIEW.html) includes nine matching WebGL before/after pairs and finished-scene close-ups. All existing routes and railway state machines are preserved; its milestone suite passed 75 tests.

The preceding [skyline pass](./quality/SKYLINE_DEVELOPMENT_1A.md) places the 333 m Akane landmark in a distant urban precinct and adds 376 background buildings in seven families, with block-based massing, roof detail, varied window occupancy and kilometre-scale aerial perspective. Eight fixed-camera before/after pairs, licensed Tokyo references and rendering measurements are included. The playable district and all simulation routes are preserved.

The [living-city behavior pass](./quality/LIVING_CITY_BEHAVIOR.md) adds persistent pedestrian/driver identities, distance-driven planted-foot walking, safe frontage activities, loose companions and conversations, bounded individual driving, authoritative lights and reactive spatial synthesis. It includes actual WebGL recordings with sound and state traces, 68 passing tests and a generated-city closure/separation audit. Delivery/taxi curb stops remain unavailable because this road graph has no connected loading bay.


The latest [vehicle pass](./quality/HERO_STREET_2A_VEHICLES.md) adds fourteen original Japanese and German-inspired traffic archetypes, detailed wheels/glazing/panels, deterministic family selection and occasional premium/JDM traffic. The report includes real before/after hero captures, day/night family close-ups, dimensions and measured rendering cost. The preceding [hero street pass](./quality/HERO_STREET_DEVELOPMENT_1.md) improves the Shinmachi-dori shop row, facade individuality, convenience store and wet-road response. Select **09 / Shinmachi Hero Street**, or open `http://127.0.0.1:5173/?view=8&seed=8412` for the fixed 20:30 reference. The earlier [visual review](./VISUAL_REVIEW.md) remains available. Contact shading is enabled by default; add `?ao=0` to disable its extra render pass on slower hardware. Existing camera presets and simulation routes are preserved.

## Production Pass 1

The default view is now **8 / Yoto nightlife street**: an authored commercial alley with a theatre marquee, twelve distinct frontages, original GLB props and furnished rooms. Keys 1-7 preserve their previous viewpoints. The new shop thresholds participate in the existing navigation and business-hour rules; rooms remain exterior-only.

Run `npm.cmd run assets:build` to regenerate the original lantern, condenser and wall-lamp GLBs. See [ARCHITECTURE.md](./ARCHITECTURE.md), [VISUAL_TARGETS.md](./VISUAL_TARGETS.md), [QUALITY_REPORT.md](./QUALITY_REPORT.md), [ASSET_MANIFEST.md](./ASSET_MANIFEST.md), and the [capture guide](./quality/README.md). The quality report includes actual before/after 1080p captures and measured browser frame intervals.

## Start locally

Use Node.js 22.6 or newer (validated locally with Node 25.9; CI uses Node 22). From this directory:

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

Open <http://127.0.0.1:5173/>. On macOS/Linux, use `npm` instead of `npm.cmd`. The Windows form avoids PowerShell execution-policy restrictions on `npm.ps1`. A VS Code task named **Shinmachi: dev server** is also available.

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1
```

The production build is emitted to `dist`. Preview normally uses port 4173. No external image or font services are required. Serve the application through Vite or a static server; do not open the HTML through `file://`.

## Explore

- Click the scene to capture the mouse; Escape releases it. Drag-look remains available when pointer lock is unavailable.
- WASD moves. Walk speed is 2.7 m/s; Shift runs at 5 m/s.
- F switches to flight; V returns to walking. In flight, Space rises and Shift descends.
- 6: Akane tower avenue; 7: railway approach. H hides/restores controls. The lens slider adjusts the field of view from 35 to 80 degrees.
- After hours, Blue hour and Daylight presets set the clock; Street surface switches dry/after-rain, and Road reflections can be disabled to reduce rendering work.
- 1: commercial street; 2: lantern alley; 3: station square; 4: aerial overview; 5: residential lane. The location selector provides the same shortcuts.
- Scrub the time slider or use Play/Pause. When playing, one real second advances 3.6 simulated minutes. Traffic and signals continue moving when the time-of-day clock is paused.
- Use `?seed=1234` in the URL to vary parcels, archetypes and materials. Default seed `8412` is the reviewed benchmark.
- Sound starts on the first scene click or **Enable sound**. M mutes/unmutes; the volume slider controls the master mix. Audio fades out when the page is hidden. Headphones help with positional traffic, crossing chirps, train rumble, restaurant murmur and vending/vent hums.

## Functioning neighborhood systems

Vehicles use left-hand lanes on both streets, with separate north/south and east/west green phases, amber, all-red clearance, and an exclusive pedestrian phase. Curved left turns merge into the correct lane; right turns are not implemented. Occupancy interlocks hold conflicting traffic red while a crossing or the junction is still occupied. Pedestrians use a validated sidewalk graph and four marked crossings, separate crossing lanes, wait behind curbs, and visit shop thresholds or the station.

Density targets change by time of day. People retire via destinations and cars leave at district boundaries, rather than entire populations instantly appearing/disappearing when the clock is scrubbed. Shops, cafes, offices, residential windows and 24-hour convenience stores have different lighting schedules. The three-car commuter train approaches, stops, opens its platform-side sliding doors, dwells, warns, closes and departs only after every door is secured. Between 01:00 and 05:00, admitted services finish and park beyond the district. See [Station Development 3B](./quality/STATION_DEVELOPMENT_3B.md) for door operation, measurements and captures, and [3A](./quality/STATION_DEVELOPMENT_3A.md) for the stopping geometry.

Street-facing rooms have visible depth, counters, stools/tables, stocked shelves, lobby fixtures, ceiling lights and lightweight staff/patron silhouettes. City/traffic ambience is original procedural synthesis; Yoto venue music uses the two credited local recordings. This remains an initial soundscape rather than natural recorded dialogue or a final mastered mix.

The station has connected player access and real NPC rail journeys through reserved fare gates, stairs and platform waiting areas; the Yoto foyer and basement bar are player-enterable, while other shops remain exterior-visible. [Station Development 3C](./quality/STATION_DEVELOPMENT_3C.md) adds prioritized alighting, physical boarding through open doors, twelve standing positions, moving-train occupancy and city reentry. Unfinished transfers and doorway occupancy hold the train safely; its open platform, guards and tactile warnings are retained. Collisions cover building/station/rail-pier footprints, passenger exchange paths and selected key props, not every city object or dynamic actor. Walking NPCs have local separation and simple graph routes, not full-life routines. Rainfall/weather audio, right turns, full crowd avoidance and map streaming remain future work.

Traffic sound now uses four stable spatial vehicle voices with separate quiet engines and tire hiss, distance fade to silence at 32 m, and a reduced background mix. Sound still uses original procedural synthesis rather than recorded Tokyo audio.

See [VISUAL_PLAN.md](./VISUAL_PLAN.md) for the photographic direction and implementation plan. See [ROADMAP.md](./ROADMAP.md) for architecture, completed features, validation results and remaining milestones; [ASSETS.md](./ASSETS.md) records asset provenance.
