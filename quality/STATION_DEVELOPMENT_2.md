# Station Development 2 — functional multi-level pedestrian navigation

Completed 3 November 2026. Existing city pedestrians now choose station visits, enter through real gate lanes, climb the four authored flights/rests, wait on the platform, descend, exit through the wide gate and rejoin the existing sidewalk graph. There is no passenger spawning on the platform, teleportation, train boarding or new railway operation.

## Implementation and contracts

Reviewed the [architecture handoff](./STATION_DEVELOPMENT_1.md), [plan/section](./station1-layout.svg), [StationLayout.ts](../src/world/generation/StationLayout.ts), [StationDetails.ts](../src/world/generation/StationDetails.ts), [Navigation.ts](../src/world/simulation/Navigation.ts), [CitySimulation.ts](../src/world/simulation/CitySimulation.ts), [CityActivity.ts](../src/world/simulation/CityActivity.ts), [WorldRules.ts](../src/world/simulation/WorldRules.ts), [PlayerController.ts](../src/world/controls/PlayerController.ts) and spatial/collision contracts before implementation.

The old pedestrian graph and renderer used X/Z only; its station destination ended in the unpaid concourse. [StationNavigation.ts](../src/world/simulation/StationNavigation.ts) now embeds directed station lanes into that same graph, using the station's gate dimensions, tread surfaces, landings, platform slabs, waiting regions and obstacle boxes. Nodes carry Y; station edges carry walk/stair/gate type, movement-speed factor, passenger state, flight/gate identity and reservation resources. The generated district has 248 station traversal edges, checked at 4,901 spatial samples on construction, and 13 valid waiting destinations. [The navigation export](./station2-navigation.json) records actual generated node IDs, links and complete visit paths.

Entry connects to the existing forecourt node (17, 0.115, -46), reached from existing sidewalks. Exit uses a separate paved forecourt point (14.2, 0.115, -45), linked to the existing east sidewalk at (4.55, 0.115, -46). This avoids opposing visitors meeting at one exact forecourt point. The exit connection is validated against existing city footprints; no street geometry or crossing permission changes were made.

The 1.35 m gap between the existing sidewalk edge and station forecourt was closed with a matching 1.35 × 2.2 m station apron, top Y = 0.115. Existing forecourt paving is now represented as two non-overlapping surfaces in the authoritative station contract and rendered from them. This is the only geometry correction: it keeps the approach supported instead of walking over lower asphalt. Platform, stairs, supports, railway, buildings and corrected signs retain their architecture-pass transforms/materials.

## Passenger lifecycle and schedules

[StationTraffic.ts](../src/world/simulation/StationTraffic.ts) runs inside the existing deterministic 30 Hz step. Its lifecycle is:

```text
public pavement → approaching → entering → gate-in → paid → ascending
→ platform → waiting → returning → descending → paid → gate-out
→ exiting → public pavement / ordinary city destination
```

Station trips are selected by the existing destination system between errands at public pavement nodes. Existing door/alley visits must clear before a station trip can be selected; this keeps unrelated crowded shop thresholds out of the station task. Initial and replacement pedestrians use the original city population pool and are never distributed into station interiors. A separate seeded station RNG preserves reproducibility without adding nondeterministic timing or random rendering paths.

Admission follows existing rail service hours and population targets. Capacity varies from two to eight active/reserved visits with the time-of-day population. New station visits stop from 01:00 to 05:00; existing visitors finish their connected return journey. A station visitor is not retired/despawned inside the station. A 90-second cooldown follows each visit, and normal city destinations resume after exit.

## Gates, circulation and congestion

- Gate 2 and gate 3 are entrance lanes; the existing wide gate is the exit lane. Every visitor aligns at the actual lane center and crosses its full depth before continuing.
- Gate ownership is exclusive and released only after the body clears the lane. Paid status commits after completing the inbound passage and clears after the outbound passage.
- FIFO reservations protect the compact paid junction, upper landing turn, platform east turn and individual waiting-area crossings. Resource acquisition is atomic; agents retain only resources required by their next traversal.
- A short forecourt entry reservation begins before the final approach reaches the shared entrance node. This prevents multiple street arrivals stacking at the entrance.
- Stair flows use opposite lateral lanes, 0.34 m from each flight center. Return landings also have distinct turn paths. Station movement follows validated links without random sideways avoidance into guards or voids.
- Local following maintains at least about 0.56 m between station passenger centers. One reserved destination per visitor keeps waiting positions at least 2.2 m apart, outside stair circulation and 1.35 m from the track edge.

The paid junction is deliberately metered conservatively; simultaneous gate throughput is limited by that shared compact space. Visitors can still independently occupy the concourse, opposing stair lanes and platform. Gate equipment remains static; no card authentication, payment or gate-flap animation is included.

## Stairs and presentation

The authoritative pedestrian state now includes Y. Fixed-step movement advances by bounded 3D distance along each edge, so both ascending and descending height changes are continuous. Ascending flight speed is 62% of the person's normal speed; descent is 70%; flat landings use ordinary walking speed. Individual tread centers and flight endpoints come from the existing 42-riser contract, including both rest landings and the return landing. Intermediate walking links are classified as landings rather than accidentally treated as stair flights.

[HumanPresentation.ts](../src/world/simulation/HumanPresentation.ts) uses the simulation's X/Y/Z directly. [StationPose.ts](../src/world/simulation/StationPose.ts) articulates feet against actual tread/landing heights and solves connected two-bone legs, retaining both 0.34 m limb lengths. Overlapping stance phases keep at least one foot planted; idle passengers stand immediately when reaching their waiting destination. Foot placement changes articulation, not the route or simulated body trajectory. Street foot-height rules now update simulation Y, retaining existing curb/alley behavior. Other pedestrians and the player are filtered by elevation for local avoidance, so an observer/passenger upstairs does not obstruct somebody below.

## Tests and actual generated-world evidence

Required commands passed:

```text
npm.cmd run check
npm.cmd test        # 31 tests pass
npm.cmd run build
```

[The new regressions](../tests/station-navigation.test.mjs) cover every entrance/waiting/return route, all four stair flights, paid-zone connectivity, exclusive gates, continuous displacement/elevation, tread contact, fixed limb lengths, passenger separation, platform safety, full lifecycle histories and city reentry. They run 600 active seconds plus a 600-second closure drain, check exact repeatability across additional seeds 42 and 193, and retain the existing pedestrian/vehicle, signal, crossing, asset, signage and camera tests.

[The actual generated district validation](./station2-measurements.json) used seed 8412 with real building/prop footprints and doors, for 1,200 open seconds at 18:30 followed by 600 seconds at 03:00:

| Measurement | Result |
| --- | ---: |
| Visits started / completed while open | 35 / 27 |
| Visits completed after closure | **35 / 35** |
| Visitors / reservations left after closure | **0 / 0** |
| Maximum concurrent interior visitors / waiting passengers | 7 / 4 |
| Failed visits / invalid station moves | **0 / 0** |
| Invalid positions / gate conflicts / passenger overlaps | **0 / 0 / 0** |
| Longest continuous movement wait / gate wait | 11.03 s / 11.03 s |
| Longest stair wait, including closure drain | 7.03 s |
| Longest whole visit, including exterior city approach | 402.20 s |
| Minimum station passenger separation | 0.5603 m |
| Maximum per-step total displacement / vertical displacement | 0.0450 m / 0.0236 m |
| Pedestrian wall hits / unmarked-road samples / vehicle overlaps | **0 / 0 / 0** |
| Vehicle exits during the open interval | 294 |

All eight original camera starts remain clear. Actual presentation matrices match authoritative X/Z to within 0.000003 m, with correct Y offsets. Downward rays checked 59 navigation support points against rendered opaque geometry; the maximum top difference was 0.021 m, including tactile/marking details. The browser reported zero page exceptions, zero failed shader links and three successfully loaded GLBs.

The integrated browser tab was hidden during the final run, so frame timing is explicitly unavailable; no new FPS claim is made. Actual canvas captures still render the real scene at 1920 × 1080. The production app adds no dependency, real light or shader system; instanced person/contact pools remain shared and bounded. The optional debug implementation is excluded from the production build. The existing large Three.js chunk advisory remains nonfatal.

## Observed live journey and captures

The capture tool follows **pedestrian 8, visit 4** in the actual running CityActivity simulation, rather than posing or replacing actors. It advances the same fixed-step state, changes only camera framing, and records phase, clock, position, paid status and gate ownership. That person starts at existing public node 48, enters through gate 3, waits 16.60 seconds on the platform, leaves through the wide gate and rejoins public node 247. The whole visit lasts 151.77 seconds. The JSON stores its full lifecycle and all 12 capture observations.

| Phase | Actual browser image |
| --- | --- |
| Entering the concourse | [Entrance](./captures/station2-entering.png) |
| Crossing a reserved entrance gate | [Gate passage](./captures/station2-gate-in.png), [ownership/path debug](./captures/station2-gate-debug.png) |
| Ascending the real stairs | [Lower flight](./captures/station2-ascending.png), [upper flight](./captures/station2-upper-stairs.png) |
| Idle platform waiting | [Waiting](./captures/station2-waiting.png), [waiting destinations/debug](./captures/station2-platform-debug.png) |
| Whole connected route | [Live navigation overlay](./captures/station2-network-debug.png) |
| Descending, with another visitor ascending | [Opposing stair flows](./captures/station2-descending.png) |
| Leaving the paid area | [Exit gate](./captures/station2-gate-out.png) |
| Exiting and resuming city life | [Exit](./captures/station2-exiting.png), [city reentry](./captures/station2-rejoined-city.png) |

All these images were visually inspected. Debug paths/labels intentionally draw through the canopy for overview inspection; the ordinary captures show the real opaque architecture and moving/idle pedestrians.

## Optional debug and reproduction

With the existing development server running, open `?stationDebug=1`, or toggle from its browser console:

```js
window.__shinmachi.activity.setStationDebug(true);  // false disables it
```

The overlay shows node connections, cyan walking links, orange stair links, yellow gate transitions, purple return paths, waiting rings, remaining passenger paths and live ID/state/paid labels. Gate markers are green when free and red when owned. It is optional, development-only, and adds no HUD controls.

Recreate the generated-world validation and live journey captures in the same Vite page:

```js
const review = await (await import('/tools/station2-browser-checks.mjs')).review();
console.log(JSON.stringify(review, null, 2));
```

Use a freshly loaded page for comparable initial state. [station2-validation.mjs](../tools/station2-validation.mjs) performs the bounded safety/liveness exercise on a CitySimulation using the actual generated bounds; [station2-browser-checks.mjs](../tools/station2-browser-checks.mjs) adds actual scene captures, rendered-surface checks, presentation checks and optional visible-tab timing.

## Remaining limits

No blocker remains for this functional-navigation scope. Train boarding, stopping, timetables, payment, operating gate flaps/platform doors, lifts and escalators are not implemented. The original passing train continues unchanged.

This is a bounded directed-lane station model with conservative junction reservations, not a general navmesh/crowd solver. Platform idling is a timed station visit, not a response to a train. Feet use procedural tread placement rather than a new imported character rig. Deliberately standing the player in a narrow passage can hold a queue until the player moves. Existing unrelated shop-threshold crowd behavior is unchanged; station trips begin only after returning to public pavement.
