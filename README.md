# Shinmachi / 新町

A dense, fictional Tokyo-inspired neighborhood built with Three.js, TypeScript and Vite. Walk the commercial street, lantern alley, residential lane, and station forecourt while pedestrians, left-hand traffic, and a detailed elevated commuter train move through the district. The default evening view looks toward a fictional orange lattice broadcast tower, with optional after-rain street reflections.


The latest [visual review](./VISUAL_REVIEW.md) ranks ten reference discrepancies and records the three corrective improvements with actual before/after captures. Contact shading is enabled by default; add `?ao=0` to disable its extra render pass on slower hardware. No camera controls or simulation routes are replaced.

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

Density targets change by time of day. People retire via destinations and cars leave at district boundaries, rather than entire populations instantly appearing/disappearing when the clock is scrubbed. Shops, cafes, offices, residential windows and 24-hour convenience stores have different lighting schedules. The passing commuter train does not run between 01:00 and 05:00.

Street-facing rooms have visible depth, counters, stools/tables, stocked shelves, lobby fixtures, ceiling lights and lightweight staff/patron silhouettes. Audio is original procedural synthesis, not downloaded recordings. It is an initial soundscape, not natural recorded dialogue or a final mastered mix.

The station remains an exterior landmark; shops are not player-enterable. Collisions cover building/station/rail-pier footprints and selected key props, not every object or dynamic agent. Walking NPCs have local separation and simple graph routes, not full-life routines. Rainfall/weather audio, train boarding/stops, right turns, full crowd avoidance and map streaming remain future work. Station stairs and platform details are visual; player access remains exterior-only.

Traffic sound now uses four stable spatial vehicle voices with separate quiet engines and tire hiss, distance fade to silence at 32 m, and a reduced background mix. Sound still uses original procedural synthesis rather than recorded Tokyo audio.

See [VISUAL_PLAN.md](./VISUAL_PLAN.md) for the photographic direction and implementation plan. See [ROADMAP.md](./ROADMAP.md) for architecture, completed features, validation results and remaining milestones; [ASSETS.md](./ASSETS.md) records asset provenance.
