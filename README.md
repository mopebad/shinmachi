# Shinmachi / 新町

A dense, fictional Tokyo-inspired neighborhood built with Three.js, TypeScript and Vite. Walk the commercial street, lantern alley, residential lane, and station forecourt while pedestrians, left-hand traffic, and an elevated commuter train move through the district.

## Start locally

Use a recent Node.js installation (validated with Node 25.9). From this directory:

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

Open <http://127.0.0.1:5173/>. On macOS/Linux, use `npm` instead of `npm.cmd`. The Windows form avoids PowerShell execution-policy restrictions on `npm.ps1`. A VS Code task named **Shinmachi: dev server** is also available.

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1
```

The production build is emitted to `dist`. Preview normally uses port 4173. No external image or font services are required. Serve the application through Vite or a static server; do not open the HTML through `file://`.

## Explore

- Click the scene to capture the mouse; Escape releases it. Drag-look remains available when pointer lock is unavailable.
- WASD moves. Walk speed is 2.7 m/s; Shift runs at 5 m/s.
- F switches to flight; V returns to walking. In flight, Space rises and Shift descends.
- 1: commercial street; 2: lantern alley; 3: station square; 4: aerial overview. The location selector provides the same shortcuts.
- Scrub the time slider or use Play/Pause. When playing, one real second advances 3.6 simulated minutes. Traffic and signals continue moving when the time-of-day clock is paused.
- Use `?seed=1234` in the URL to vary parcels, archetypes and materials. Default seed `8412` is the reviewed benchmark.

The station is an exterior landmark, and storefronts are not enterable. Walking collisions cover building/station/rail-pier footprints, not every bicycle, pedestrian or vehicle. Agents use simple routes rather than full-life routines. Rain/reflections and map streaming remain future work.

See [ROADMAP.md](./ROADMAP.md) for architecture, completed features, validation results and remaining milestones; [ASSETS.md](./ASSETS.md) records asset provenance.
