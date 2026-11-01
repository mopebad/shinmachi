# Shinmachi / 新町

A dense, fictional Tokyo-inspired neighborhood built with Three.js, TypeScript and Vite. Walk the commercial street, lantern alley, residential lane, and station forecourt while pedestrians, left-hand traffic, and an elevated commuter train move through the district.

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
- 1: commercial street; 2: lantern alley; 3: station square; 4: aerial overview; 5: residential lane. The location selector provides the same shortcuts.
- Scrub the time slider or use Play/Pause. When playing, one real second advances 3.6 simulated minutes. Traffic and signals continue moving when the time-of-day clock is paused.
- Use `?seed=1234` in the URL to vary parcels, archetypes and materials. Default seed `8412` is the reviewed benchmark.
- Sound starts on the first scene click or **Enable sound**. M mutes/unmutes; the volume slider controls the master mix. Audio fades out when the page is hidden. Headphones help with positional traffic, crossing chirps, train rumble, restaurant murmur and vending/vent hums.

## Functioning neighborhood systems

Vehicles use left-hand lanes on both streets, with separate north/south and east/west green phases, amber, all-red clearance, and an exclusive pedestrian phase. Curved left turns merge into the correct lane; right turns are not implemented. Occupancy interlocks hold conflicting traffic red while a crossing or the junction is still occupied. Pedestrians use a validated sidewalk graph and four marked crossings, separate crossing lanes, wait behind curbs, and visit shop thresholds or the station.

Density targets change by time of day. People retire via destinations and cars leave at district boundaries, rather than entire populations instantly appearing/disappearing when the clock is scrubbed. Shops, cafes, offices, residential windows and 24-hour convenience stores have different lighting schedules. The passing commuter train does not run between 01:00 and 05:00.

Street-facing rooms have visible depth, counters, stools/tables, stocked shelves, lobby fixtures, ceiling lights and lightweight staff/patron silhouettes. Audio is original procedural synthesis, not downloaded recordings. It is an initial soundscape, not natural recorded dialogue or a final mastered mix.

The station remains an exterior landmark; shops are not player-enterable. Collisions cover building/station/rail-pier footprints and selected key props, not every object or dynamic agent. Walking NPCs have local separation and simple graph routes, not full-life routines. Rain/wet-road reflections, train boarding/stops, right turns, full crowd avoidance and map streaming remain future work.

See [ROADMAP.md](./ROADMAP.md) for architecture, completed features, validation results and remaining milestones; [ASSETS.md](./ASSETS.md) records asset provenance.
