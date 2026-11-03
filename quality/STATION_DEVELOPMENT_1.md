# Station Development 1 — architecture and physical connectivity

> Subsequent [Station Development 2](./STATION_DEVELOPMENT_2.md) implements actual NPC traversal on this architecture, includes forecourt paving in the surface contract and closes its small sidewalk gap. This document and its images/measurements remain the historical architecture milestone; its original pending-navigation statements describe that stage.

Completed 3 November 2026. Scope: one coherent elevated Shinmachi Station, its rendered architecture and spatial contract. The incoming signage/convenience-store work and unrelated simulation systems were preserved. No passenger AI, boarding, stopping logic or timetable work is included.

## Audit before changes

The existing railway has a single straight track centered on **z = -57**, rails at z = -57.75 / -56.25, rail-head elevation **y = 7.02**. The unchanged four-car train occupies about **52.1 m** and has a door sill at **y = 7.455**. Its alignment and movement are retained.

The old station was decorative: its platform was about 29 m long and 1.6 m deep, with top y = 7.34; stairs, intermediate heights and platform access did not form a continuous route. The south viaduct parapet and maintenance rails separated the stairs from the platform. One large two-dimensional station collision rectangle also prevented entry. The existing forecourt top is y = 0.115, and the original station NPC destination is (19, -48).

Reviewed [StationDetails.ts](../src/world/generation/StationDetails.ts), [RailwayDetails.ts](../src/world/generation/RailwayDetails.ts), [NeighborhoodGenerator.ts](../src/world/generation/NeighborhoodGenerator.ts), [Navigation.ts](../src/world/simulation/Navigation.ts), [PlayerController.ts](../src/world/controls/PlayerController.ts), [types.ts](../src/world/types.ts), [CommuterRail.ts](../src/world/simulation/CommuterRail.ts), and the architecture/roadmap/visual review documents before rebuilding.

## Completed architecture

The passenger route now runs continuously from the existing street and forecourt into a sheltered unpaid concourse, through three correctly aligned gate lanes, along paid circulation, up a return stair with rest landings, through an open upper landing and onto the platform. Ticket machines and a staff counter face the unpaid side. Walls, glazing, plinths, entrance beam, roofs and ceiling panels explain the lower station enclosure.

| Element | Actual rendered dimensions / coordinates |
| --- | --- |
| Ground concourse | x = 9.6–25.6; z = -53.1–-46.4; top y = 0.115 m |
| Gate lanes | Centers x = 10.95, 12.30, 13.60; z = -48.45; widths 1.05 / 0.90 / 0.90 m |
| Stair flights | 42 equal risers, 174.76 mm rise, 310 mm going, 1.80 m width; split 10 + 11 + 11 + 10 |
| Rest landings | x = 18.3–19.8, 1.50 m long; levels y = 1.862619 and 5.707381 m |
| Return landing | x = 23.21–25.21; z = -53.1–-49; level y = 3.785 m; 2 m turn depth |
| Upper landing | x = 13.2–15.2; z = -53.1–-51.3; level y = 7.455 m |
| Platform | x = 8–61.5; z = -55.5–-47.7; 53.5 × 7.8 m; top y = 7.455 m |
| Platform edge | z = -55.5; approximately 65 mm horizontal clearance from the unchanged door envelope |
| Canopy | x = 7.8–61.7; z = -55.3–-47.4; roof y = 10.91–11.05 m |

Four platform slab pieces leave a real stairwell opening. Inclined stair waist slabs, handrails, rest supports, return-landing legs, concrete columns/footings, longitudinal girders and crossheads support the architecture. The upper exit stays open while stairwell, track, rear and end guards protect drops. Tactile strips, contrasting stair nosings, benches, canopy beams/gussets, suspended linear fixtures and measured bilingual directions complete the platform.

The original entrance typography is retained on the rebuilt entrance beam. New station directions use the existing measured-sign helpers; the corrected district signage pipeline is unchanged. Review found a forecourt tree overlapping ticketing, missing intermediate stair rests and a low platform sign; these were corrected. Platform boards now clear the circulation headroom, and the upper-landing direction has a readable reverse face. Global lighting/weather and HUD layout are unchanged.

Only the south parapet and maintenance guard segments within the new platform frontage were opened. Track, train, north parapet, existing catenary and railway supports stay on their original alignment. Existing catenary masts are exported as obstacles without rendering duplicates. One forecourt tree was repositioned within the station square, retaining generation RNG consumption. The platform/roof stop short of the nearest existing building at x ≈ 62.14.

## Spatial contract and future navigation

[StationLayout.ts](../src/world/generation/StationLayout.ts) is the browser-independent source for rendered floors/treads/landings and structural obstacle bounds. [District.station](../src/world/types.ts) exposes:

- Dimensioned entrance, unpaid/paid circulation, ticket approach, upper landing and platform waiting areas.
- Three gate records, all four stair flights with their tread surfaces, rest/return landings, platform slabs and track-edge warning metadata.
- Named 3D nodes, typed walk/gate/stair connections and a continuous journey through each flight.
- Height-bearing obstacle bounds for walls, gates, supports, guards, ticket machines, benches and retained catenary masts.

[The exported JSON](./station1-spatial.json) and [plan/section diagram](./station1-layout.svg) are generated directly from this contract. Waiting areas are semantic regions, not a completed navigation mesh; future navigation must subtract structural obstacles and use surface elevation, rather than treating these rectangles as universally clear.

Player walking now follows the station's surfaces with bounded step changes and height-aware local collisions. The complete route is walkable up and down. Outside the station, the original eye height, building collisions and camera presets are preserved. Fly mode remains available. This is authored surface support, not a general gravity/physics system.

Existing city NPCs retain their original flat navigation, the original exterior station reservation and destination (19, -48) in the unpaid concourse. Separate player collision bounds allow actual station access; existing street-layer obstacles appended after generation are copied into that list before controller creation. A browser assertion checks that no existing city obstacle is lost. [Navigation.ts](../src/world/simulation/Navigation.ts), traffic logic and NPC routines were not changed. The next task can consume this contract for multi-level NPC navigation.

## Actual rendered review

All images below are actual 1920 × 1080 browser canvas captures at seed 8412, with paired camera/time/render metadata. The diagram is explicitly a source-derived debug projection, not a scene screenshot.

| Review view | Evidence and inspection |
| --- | --- |
| Street entrance | [Before](./captures/station1-entrance-before.png), [completed daylight](./captures/station1-entrance-after.png), [night](./captures/station1-entrance-night-after.png): sheltered street connection, retained legible station header and open entrance |
| Concourse | [View](./captures/station1-concourse-after.png): ticketing to the right, gate approach to the left, sheltered continuous floor |
| Fare gates | [View](./captures/station1-gates-after.png): three clear lanes, real paid circulation behind them, directions and suspended mounting rods |
| Stairs and rests | [Lower flight](./captures/station1-stairs-after.png), [rest](./captures/station1-rest-after.png), [return landing](./captures/station1-landing-after.png), [upper landing](./captures/station1-upper-landing-after.png): continuous flights, supported turns, real deck opening and guards |
| Platform | [Day](./captures/station1-platform-after.png), [night](./captures/station1-platform-night-after.png): retained rail alignment, edge screens/tactile strip, waiting space, benches and structural canopy |
| Exterior/supports | [View](./captures/station1-exterior-after.png), [railway preset](./captures/station1-railway-after.png): connected lower/upper volumes, carried platform extension and preserved railway |
| Debug connectivity | [SVG plan and section](./station1-layout.svg), [PNG](./captures/station1-layout.png): same coordinates/elevations as geometry, stair flights shown on their parallel lanes |

## Validation

Required commands all passed:

```text
npm.cmd run check
npm.cmd test          # 28 tests pass, including four station contract/route regressions
npm.cmd run build
```

Tests verify exact repeated risers and rests, train-sill/platform alignment and length, continuous reversible route support sampled every 25 mm, body clearance, a real stairwell opening, guarded drops, finite station bounds and connected metadata. Existing tests retain camera, simulation, route, signage and asset coverage.

[Browser measurements](./station1-measurements.json) record the actual player controller traversing the complete route both ways in 2,795 update ticks without intermediate teleports, 64 upward rays against rendered geometry with minimum sampled headroom **2.890 m**, all eight camera starts clear, no overlap with existing building footprints, three loaded GLBs and zero failed shader links. A fresh page reload also produced no page exceptions.

A fresh 600-second generated-world run recorded **0 pedestrian wall hits, 0 unmarked road samples, 0 pedestrian/vehicle overlaps and 114 vehicle exits**. Train movement remains the existing passing service.

At the station preset, 20:30, damp reflections enabled, a 5,001.0 ms sample at **1920 × 1080 / pixel ratio 1** recorded 1,198 frame intervals, **239.55 aggregate FPS**, 4.2 ms median, 4.3 ms p95/p99 and 8.3 ms worst on the available RTX 5070 Ti / ANGLE / VS Code Electron browser. This is browser frame timing, not isolated GPU timing or a before/after performance gain. Shared CityBatch instancing and existing material families are used; no real lights, dependencies or global rendering features were added. Vite's existing large Three.js chunk warning remains nonfatal.

## Remaining limitations and blockers

No implementation blocker remains for this architectural scope. The reference photo service returned HTTP 429 for a Commons image; official maps and alternate credible photographs supplied usable evidence. [Reference provenance and license status](../references/station/README.md) distinguish downloaded/inspected sources and reference-only copyrighted material.

- Passenger AI, multi-level NPC pathfinding, gate validation, boarding, train stops and detailed schedules are not implemented.
- Gate furniture and platform safety screens are static. There are no operating gate flaps or platform doors.
- The existing fictional single-track railway is retained. The layout is not a complete replica of either reference station.
- A wide gate is provided, but lifts, escalators and a complete step-free route are pending.
- Surface/obstacle metadata prepares future navigation; it does not provide a navmesh, dynamic crowd avoidance or general rigid-body physics.
- Geometry and circulation were validated on the existing default seed 8412. Arbitrary future district grammars will need their own placement checks.
