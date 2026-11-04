# Shinmachi — architecture and development roadmap

## Direction

A compact, metre-scale, Tokyo-inspired neighborhood that rewards exploration at pedestrian eye level. Pursue the photographic Tokyo evening references through coherent construction, materials, light, audio, density and polish while retaining a compact real-time environment. This is a fictional district, not a geographically accurate reconstruction of Tokyo.

## Latest bounded delivery: functional passenger boarding and alighting

[Station Development 3C](./quality/STATION_DEVELOPMENT_3C.md) replaces timed platform visits with real outbound boarding/riding and inbound alighting/city reentry. Six doorway queues, alighting priority, twelve standing positions and passenger/external door interlocks keep physical transfers synchronized with the authoritative train. A generated-world run completes 24 boardings, 48 alightings and 80/80 journeys after closure, with no unsafe crossings/departures or collisions. Ten actual captures, 55 tests, TypeScript checks and the production build pass; empty/max-load services drain and frame-partition replay is exact.

## Previous bounded delivery: clear platform boarding access

[Station 3B.5](./quality/STATION_DEVELOPMENT_3B_5.md) replaces the continuous track-facing screen with open usable frontage, preserving stair, rear and end guards. Six physical waiting-to-sill approaches have matched elevations, normal 55 mm gaps and clear pedestrian volumes. Door records now report conditional physical access while NPC boarding remains disabled for Station 3C. Eight actual captures, nine arrival/departure cycles, 49 tests, TypeScript checks and production build pass; the existing station regression still completes 35/35 visitors after closure.

## Previous bounded delivery: functional train doors

[Station Development 3B](./quality/STATION_DEVELOPMENT_3B.md) adds genuine sliding doors and carriage apertures synchronized with train operation, full-open dwell, departure warnings, closed-door interlocks and obstruction recovery. Nine generated-world cycles and seven actual captures validate the new doors; 44 tests, TypeScript checks and the production build pass. Existing station pedestrians still complete all 35 visits after closure. Boarding, alighting and platform-screen operation remain pending.

## Previous bounded delivery: accurate station stopping

[Station Development 3A](./quality/STATION_DEVELOPMENT_3A.md) adds deterministic approach, smooth braking, accurate platform stopping, configurable dwell and departure. The three-car train fits the unchanged platform; 12 generated-world arrivals have zero stopping error, and the Station Development 2 pedestrian regression still completes all 35 visits after closure. All 37 tests, TypeScript checks and the production build pass. Boarding, alighting and door animation remain pending.

## Previous bounded delivery: station passenger navigation

[Station Development 2](./quality/STATION_DEVELOPMENT_2.md) adds real city-population station visits through connected 3D lanes, exclusive fare gates, both stair directions, platform waiting and public-sidewalk reentry. The actual generated-world run completed 27 visits in 1,200 open seconds and all 35 started visits after closure, with no invalid moves, gate conflicts, passenger overlaps or street-safety failures. All 31 tests, TypeScript checks and the production build pass; a live NPC journey and optional navigation overlay were captured and inspected. Train boarding, stops and schedules remain outside this task.

## Station architecture milestone

[Station Development 1](./quality/STATION_DEVELOPMENT_1.md) completed a continuous, player-walkable street → sheltered concourse → gates → four stair flights/rests → elevated platform. One source contract supplies rendered surfaces, obstacles, entrances, gates, landings, waiting areas and navigation links. Its 28-test architecture evidence is retained; the subsequent passenger milestone above extends that contract. The original track/train, corrected signage, convenience store and broader systems are preserved. This does not start unrelated roadmap work.

## Latest visual correction

The unfinished signage/convenience-store continuation is now delivered. [The scoped handoff](./quality/KONBINI_REVIEW.md) records the preserved incoming refactor, actual-aspect measured Japanese signs, one authored 青空マート branch, reference provenance, 24 passing tests, actual day/night browser images and generated-world/performance results. This completes that bounded task; it does not start Pass 2 or change the broader sequence below.

[VISUAL_REVIEW.md](./VISUAL_REVIEW.md) ranks ten observed discrepancies against the three reference photographs using immersion, street visibility, feasibility and estimated rendering cost. Its top three are implemented: anatomically proportioned clothed people with connected/grounded joints, bounded half-resolution contact occlusion, and layered urban massing/window occupancy with nearer office setbacks. All 20 tests and the production build pass; actual before/after images and measured rendering cost are recorded in the review. The eight presets, routes, traffic, schedules, audio and elevated train remain functional. Other visual gaps remain open rather than being described as completed.

## Production delivery sequence

The attached production brief supersedes the earlier small evening pass. Current delivery is **Pass 1**, focused on an authored nightlife street rather than a UI redesign. Audit and contracts: [ARCHITECTURE.md](./ARCHITECTURE.md). Reference analysis: [VISUAL_TARGETS.md](./VISUAL_TARGETS.md). Actual results and known issues: [QUALITY_REPORT.md](./QUALITY_REPORT.md). Asset provenance: [ASSET_MANIFEST.md](./ASSET_MANIFEST.md).

1. **Pass 1 delivered:** twelve authored nightlife frontages, theatre marquee and layered signs, original imported/instanced GLB lanterns/condensers/lamps, business-specific interiors, contextual exhaust, more selective reflections, twelve actual alley destinations, connected limb/camera fixes, eight compatible presets, fixed-view 1080p captures and raw frame measurements. Sixteen tests and the production build pass; the 600-second generated-world run retained safe traffic/path behavior.
2. **Pass 2 next:** higher-quality rigged people and animations, additional facade/roof/corner archetypes, richer vehicles and detailed reusable interiors. Extend the original GLB/Blender-compatible source pipeline; retain spatial contracts.
3. **Pass 3:** contact shading, exposure/material refinement, localized atmosphere, actual rainfall/runoff/drying and low/high graphics settings.
4. **Pass 4:** deterministic functional at-grade railway crossing on a real route, road/pedestrian interlocks, station stops/events and walkable elevations. The elevated line remains separate.
5. **Pass 5:** broader NPC routines/entry/exit/social behavior, destination traffic and mastered source-specific sound with licensed recordings where useful.
6. **Pass 6:** more varied skyline layers, believable background districts/road continuity and stronger individual district identity.
7. **Pass 7:** integrated regression/capture review, performance optimization, accessibility and final polish.

The original seven presets retain their transforms; **8 / Yoto nightlife street** is added and is the current starting view. The reference crossing is not delivered in Pass 1. Subsequent Station Development 1 adds player access, while boarding remains pending.

## Photographic direction and execution

See [VISUAL_PLAN.md](./VISUAL_PLAN.md) for the reference analysis, ordered implementation plan, acceptance criteria and production limits.

### Reference-driven evening pass (November 2026)

- Added a distant, layered skyline and original open-lattice Akane broadcast tower; default view is the tower avenue at 20:30. New railway approach and tower locations preserve the five original shortcuts and add keys 6/7.
- Four-car stainless commuter train with green stripes, illuminated passenger-window textures, hand straps, doors, destination displays, bogies, roof vents, pantographs and end lights. The existing passing-train/service-hours model remains authoritative.
- Added elevated maintenance paths, guardrails, underside bracing, catenary hangers and porcelain insulators. At-grade crossing barriers remain deferred until a real ground-level route has safety interlocks.
- Replaced stretched sign use with four aspect-appropriate atlas layouts: wide, square, portrait and narrow portrait. Station lettering/map/route boards are drawn at their final physical proportions.
- Opened the station's previously solid facade into a shallow concourse, cleared the conflicting apartment wall from its forecourt, and added ticket-machine/gate details, visible return stairs, a furnished platform, canopy and lights. This historical pass was exterior-only; subsequent [Station Development 1](./quality/STATION_DEVELOPMENT_1.md) replaces its disconnected architecture with continuous player access. Boarding remains pending.
- Added local aggregate/grout/weathering maps with aligned colour, bump and roughness channels; darker unoccupied windows, window reveals and restrained evening light. Original material and texture generation remain deterministic.
- Added optional after-rain surfaces with one 768px planar reflection and a procedural broken-puddle mask, plus dry/reflection-off controls. This adds a second scene render when enabled; it is not rainfall or screen-space reflection.
- Added lighting presets, adjustable lens, collapsible controls and H to hide controls, with subtle display-space grain/vignette.
- Reworked traffic audio: four stable vehicle voice assignments, independently offset noise, separate filtered tire and engine voices, quiet idle, distance attenuation with a 32m cutoff, smoothed handovers, reduced background beds and default volume. Added four gain/distance regressions to the existing eight simulation tests.

Validation for this pass: type checking, 12 tests and production build passed; browser shader links succeeded; seven camera presets start outside collision envelopes. A new 600-second generated-district run recorded zero pedestrian wall hits and 128 vehicle exits. Reviewed tower/station/train/day/night views, dry/damp/reflection-off states, 03:00 train closure, audio activation and mute. See the execution results in [VISUAL_PLAN.md](./VISUAL_PLAN.md) for the measured audio evidence and practical limits.

## Completed milestones

### Neighborhood architecture overhaul

- Seeded dense commercial frontage, lantern alley, residential lane, cross avenue, station forecourt and elevated railway. The default visual benchmark is seed `8412` with 57 buildings.
- Five reusable building archetypes: izakaya, narrow retail, apartment, office and convenience store. Variable parcels/heights/setbacks, framed windows, balconies/laundry, exterior stairs, roof tanks, antennas, HVAC, drainage pipes and layered signage.
- Japanese sign atlas and locally generated concrete/tile/paving/asphalt/glass textures; world-space surface UVs prevent stretched tiles. No remote image/font dependencies.
- Raised sidewalks and flush residential lane, tactile strips, gutters, manholes, zebra crossings, stop bars, guardrails, bollards, convex mirror, triangular stop sign and small coin parking.
- Utility poles, transformers, sagging cables, vending machines, tube-frame bicycles, planters, trash cage, parcel lockers, compact parked cars and a recognizable station entrance.
- ACES rendering, sRGB output, environment illumination, cached directional shadows, sky/sun/stars, haze/fog and restrained bloom. Walk/free-flight controls and location presets.

### Direction upgrade — functioning city layer

- Corrected reversed lane handedness in the previous prototype. Both roads now use left-hand traffic with separate north/south and east/west phases and curved left turns.
- One shared 80-second signal state drives visible vehicle signals, pedestrian icons, movement permissions and crossing chirps. Amber/all-red buffers and occupancy interlocks protect slow-clearing traffic and crossing users.
- Explicit pedestrian graph connects main sidewalks, station, alleys, avenue pavements and the residential edge. Four tagged zebra crossings are the only routes across moving traffic. Building and selected prop bounds validate graph edges.
- Pedestrians wait behind curbs, align at stripe entrances, use separate directional crossing lanes, keep following space, locally separate and avoid the camera. Corridor recovery helps avoidance offsets clear roadside props.
- Long-run review exposed an opposing-stream deadlock. Corrected crossing entry/exit behavior and added a liveness regression: a collision-free but permanently stalled junction is not a passing result.
- Shared day-state and business-hours rules control sun/sky, sign emission, shop/interior lights, selected practical lights and office/home windows. Convenience stores stay open around the clock. Passing trains and station activity quiet between 01:00 and 05:00.
- Shallow, furnished street-facing interiors: restaurant counters/stools/bowls/pendants, cafe tables/chairs/cups, stocked retail shelves and apartment/office lobby fixtures. Lightweight staff and patron silhouettes add restrained motion.
- Rounded/capsule pedestrians with clothing/bag/hair/scale variation and articulated walking. Kei cars, compacts, taxis, delivery vans and small trucks have wheel/hub silhouettes, separate running/brake emission, left-turn indicators and a bounded nighttime headlight-beam pool.
- Hour-dependent population targets with gradual spawning/retirement and vehicle boundary exits. Shop visitors now pause at clear thresholds rather than disappearing through facade geometry.
- Original positional/zone Web Audio: traffic/tire/engine texture, distant murmur, restaurant/station activity, crossing chirps, passing train, vending and vent hum. User-gesture start, mute/volume controls and hidden-tab fading; no downloaded recordings.
- Kitchen exhaust steam, residential scooters and gutter-maintenance cones support specific locations. Residential preset/key 5 and zone-aware naming/audio distinguish quieter areas without increasing map size.

## Architecture

| Module | Responsibility |
| --- | --- |
| [main.ts](./src/main.ts) | World/HUD composition; development-only `window.__shinmachi` diagnostics. |
| [CityWorld.ts](./src/world/CityWorld.ts) | Render loop, clock, sky/lighting, postprocessing, audio/effects composition, presets and telemetry. |
| [types.ts](./src/world/types.ts) | District contract: bounds, doors, shopfronts, lamp positions, material channels and statistics. |
| [NeighborhoodGenerator.ts](./src/world/generation/NeighborhoodGenerator.ts) | Seeded parcels, streets, district identity, station/rail infrastructure, props and spatial metadata. |
| [BuildingKit.ts](./src/world/generation/BuildingKit.ts) | Local-coordinate archetypes, facade/roof kits and shallow furnished interiors. |
| [Materials.ts](./src/world/generation/Materials.ts) | Local textures, glass, sign atlas, business lighting channels and world-space UV extension. |
| [CityBatch.ts](./src/world/generation/CityBatch.ts) | Shared primitive instancing, merged sign quads with business attributes, cable lines. |
| [WorldRules.ts](./src/world/simulation/WorldRules.ts) | Shared signal phases, lane/turn geometry, business/service hours, day state, density and area classification. |
| [Navigation.ts](./src/world/simulation/Navigation.ts) | Validated pedestrian graph, tagged crossings and route search. |
| [CitySimulation.ts](./src/world/simulation/CitySimulation.ts) | Browser-independent deterministic agents, traffic interlocks, separation and gradual population changes. |
| [CityActivity.ts](./src/world/simulation/CityActivity.ts) | Instanced actor presentation, signal heads/icons, head/brake lights and passing train. |
| [CitySoundscape.ts](./src/world/audio/CitySoundscape.ts) | Spatial/zone mix, moving vehicle voices, hums, chirps and audio controls. |
| [CityBackdrop.ts](./src/world/generation/CityBackdrop.ts) | Distant skyline and original lattice tower. |
| [CommuterRail.ts](./src/world/simulation/CommuterRail.ts) | Permanently allocated detailed train presentation. |
| [StationDetails.ts](./src/world/generation/StationDetails.ts) | Station concourse/platform detail and aspect-correct wayfinding. |
| [SurfaceTextures.ts](./src/world/generation/SurfaceTextures.ts) | Deterministic material maps and sign layout atlas. |
| [StreetReflections.ts](./src/world/effects/StreetReflections.ts) | Bounded, road-masked planar reflections. |
| [AudioMix.ts](./src/world/audio/AudioMix.ts) | Pure distance/speed traffic mix and gain budget. |
| [StreetAtmosphere.ts](./src/world/effects/StreetAtmosphere.ts) | Bounded steam pool and scheduled interior silhouettes. |
| [PlayerController.ts](./src/world/controls/PlayerController.ts) | Input, smoothing, walking collision, free flight and safe mode changes. |
| [Hud.ts](./src/ui/Hud.ts) | Small exploration/time/audio control surface and telemetry. |

Generation emits plain spatial data alongside meshes. Simulation must consume that contract rather than infer rules from rendered geometry. The current map is one authored district grammar with seeded variation, not a general city-wide road generator. Navigation rejects obstructed edges; not every generated doorway is necessarily reachable.

## Validation and visual review

- Run `npm.cmd run check`, `npm.cmd test` and `npm.cmd run build`. Sixteen regression tests also run in GitHub CI.
- Tests cover left-hand lanes, continuous turn curves, conflicting-green/occupancy interlocks, crossing-only navigation, day state and business/service hours, deterministic updates, multi-cycle safety, junction liveness and vehicle footprint separation.
- Actual generated-world browser exercise: 600 simulated seconds across a morning-to-night density transition. The reviewed run had zero wall hits, zero unmarked-road steps and zero pedestrian/vehicle footprint overlaps; vehicle exits continued and longest crossing clearance was about 12 seconds.
- Verified all five presets outside collision bounds. Checked daylight/night sun states and cafe/restaurant/convenience schedules at 00:00, 03:00, 08:00, noon, evening and 22:00.
- Browser audio activation produced a running context with 17 mixed voices and nonzero output; mute faded measured output close to zero. This verifies operation, not subjective speaker/headphone mastering.
- Street-level screenshots reviewed during day/evening/night and at restaurant, alley and residential viewpoints. Review refinements included deadlock prevention, stripe-entry alignment, near-camera avoidance, scheduled practicals, brake/headlight contrast and softer steam.
- The Three.js vendor bundle remains slightly above Vite's default 500 kB minified advisory (about 128 kB gzip). This is a non-fatal size warning, not a compile error.

## Next milestones

- [ ] Protected right turns, delivery pull-ins, richer parking and destination-based traffic. Only straight/left movements are implemented now.
- [ ] More complete crowd avoidance/social groups, richer animation/poses and higher-quality character assets. Current local separation is deliberately lightweight, not a full crowd solver.
- [ ] Per-tenant hours, window occupancy and physical shutter/door animations; genuine NPC entry/exit. Current visits stop at thresholds; rooms are not player-enterable.
- [x] Station architectural continuity, player stairs/platform access and explicit multi-level spatial metadata. See [Station Development 1](./quality/STATION_DEVELOPMENT_1.md).
- [x] Multi-level NPC station visits: city approach, reserved gate passage, stair ascent/descent, platform waiting and public reentry. See [Station Development 2](./quality/STATION_DEVELOPMENT_2.md).
- [x] Accurate station stopping, dwell and departure with compatible train/platform geometry. See [Station Development 3A](./quality/STATION_DEVELOPMENT_3A.md).
- [x] Functional train doors with authoritative animation, warning/closing states and departure interlocks. See [Station Development 3B](./quality/STATION_DEVELOPMENT_3B.md).
- [x] Open platform frontage and clear conditional approaches to all six train doors, with retained fall guards and truthful access metadata. See [Station 3B.5](./quality/STATION_DEVELOPMENT_3B_5.md).
- [x] Real NPC boarding, moving-train occupancy, prioritized alighting, station/city reentry and passenger departure interlocks. See [Station Development 3C](./quality/STATION_DEVELOPMENT_3C.md).
- [ ] Richer timetables, detailed passenger interiors and further transport choices. The existing service remains one train on its original alignment.
- [ ] Collision for every prop and dynamic actor, general walkable elevations/physics. The station now has authored surface support and height-aware local obstacles; the wider city retains footprint collision.
- [ ] Soundscape mastering and optional attributed high-quality recordings; genuine conversational ambience. Current voices are unintelligible procedural texture, not natural recorded speech.
- [ ] Rainfall, weather sound, dynamic water accumulation and seasonal variation. Static after-rain road reflections and dry/damp controls are implemented; weather simulation is not.
- [ ] More architectural silhouettes and authored district identity: tiled roofs, corner lots, utility yards, station clusters, shrines and office zones.

## Longer-term city systems

- Road graph/parcel generation, additional district templates, chunk-level instancing/culling, LOD and streaming.
- NPC homes/workplaces/schedules, persistence, destinations, transport choices and save/replay support.
- Additional rail routes, buses, delivery schedules and coordinated crossings.
- Accessibility, remappable/touch controls, photo mode, ambience authoring and world-editing tools.

## Performance guardrails

- Measure generation, agent CPU work, draw calls, triangles, GPU lighting, memory and load time separately.
- Bound real lights and audio voices; prefer shared geometry/instancing and atlas emission. Cache static shadows; moving actors currently use contact shadows instead of dynamic shadow maps.
- Keep steam, interior animation and headlights pooled. Avoid scaling the map before chunk-level culling/LOD; current static batches span the compact district.
- Do not claim hardware-independent frame rates. HUD readings describe the local browser, not an integrated-GPU benchmark.
