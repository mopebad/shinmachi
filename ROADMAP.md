# Shinmachi — architecture and development roadmap

## Direction

A compact, metre-scale, Tokyo-inspired neighborhood that rewards exploration at pedestrian eye level. Pursue the photographic Tokyo evening references through coherent construction, materials, light, audio, density and polish while retaining a compact real-time environment. This is a fictional district, not a geographically accurate reconstruction of Tokyo.

## Photographic direction and execution

See [VISUAL_PLAN.md](./VISUAL_PLAN.md) for the reference analysis, ordered implementation plan, acceptance criteria and production limits.

### Reference-driven evening pass (November 2026)

- Added a distant, layered skyline and original open-lattice Akane broadcast tower; default view is the tower avenue at 20:30. New railway approach and tower locations preserve the five original shortcuts and add keys 6/7.
- Four-car stainless commuter train with green stripes, illuminated passenger-window textures, hand straps, doors, destination displays, bogies, roof vents, pantographs and end lights. The existing passing-train/service-hours model remains authoritative.
- Added elevated maintenance paths, guardrails, underside bracing, catenary hangers and porcelain insulators. At-grade crossing barriers remain deferred until a real ground-level route has safety interlocks.
- Replaced stretched sign use with four aspect-appropriate atlas layouts: wide, square, portrait and narrow portrait. Station lettering/map/route boards are drawn at their final physical proportions.
- Opened the station's previously solid facade into a shallow concourse, cleared the conflicting apartment wall from its forecourt, and added ticket-machine/gate details, visible return stairs, a furnished platform, canopy and lights. Station access/boarding are still future simulation work; the player collision envelope remains exterior-only.
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

- Run `npm.cmd run check`, `npm.cmd test` and `npm.cmd run build`. Twelve regression tests also run in GitHub CI.
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
- [ ] Station stairs/platform access, train stops, boarding and richer timetable behavior. Current station is exterior-only and trains are passing sets within a coarse service window.
- [ ] Collision for every prop and dynamic actor, walkable stairs/elevations. Current player collision uses building/station/pier footprints and selected key props; it is not a full physics system.
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
