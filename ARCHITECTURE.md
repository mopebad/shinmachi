# Architecture

## Yoto After Dark

[YotoVenueLayout.ts](./src/world/generation/YotoVenueLayout.ts) owns the basement surfaces, eighteen treads, retaining/furniture boxes and acoustic positions. [YotoArchitecture.ts](./src/world/generation/YotoArchitecture.ts) renders that contract inside the retained nightlife layer. The player controller delegates locally to these surfaces without changing station or NPC traversal. Both ground layers contain the actual shaft opening. A reserved rear service gap protects alternate-seed parcels without changing their legacy random draw counts.

[VenueMusic.ts](./src/world/audio/VenueMusic.ts) streams two locally bundled CC BY 4.0 recordings into the existing master chain; [VenueMusicMix.ts](./src/world/audio/VenueMusicMix.ts) supplies shared room/stair/portal gain and filtering. Existing unlock, mute, business schedules, volume and recording controls remain. [The current report](./quality/NIGHTLIFE_DEVELOPMENT_3A.md) includes 87 passing tests, actual video/audio, measured rendering cost and limitations. Earlier statements that all shops are player-inaccessible describe historical milestones; the Yoto foyer and basement are now enterable, while private upper tenants remain offstage.

## Station Development 3C

[RailPassengers.ts](./src/world/simulation/RailPassengers.ts) integrates real inbound/outbound journeys with the existing station visitor pool, six door queues, alighting priority, atomic transfer-path reservations and a twelve-position standing capacity. [RailPassengerGeometry.ts](./src/world/simulation/RailPassengerGeometry.ts) constrains movement to supported platform routes, real door anchors/sills and each carriage's floor. [StationTraffic.ts](./src/world/simulation/StationTraffic.ts) replaces timed platform returns with train-dependent boarding and reuses its gate/stair/exit routes for alighters and service-closure returns. Moving riders retain carriage-local positions until off-map destination completion.

[TrainOperation.ts](./src/world/simulation/TrainOperation.ts) holds dwell/closing/departure for unfinished transfers; [TrainDoors.ts](./src/world/simulation/TrainDoors.ts) combines independent passenger and external obstruction sources without bypassing closed-door limits. All updates run at the existing deterministic 30 Hz rate. [HumanPresentation.ts](./src/world/simulation/HumanPresentation.ts) uses the same people and geometry for street, station, transfer and riding states. Two compact circulation reservation corrections prevent high-load junction gridlocks. [The handoff](./quality/STATION_DEVELOPMENT_3C.md) records 55 passing tests, exact frame-partition replay, maximum-load closure drainage, ten actual captures and a generated-world run with 24 boardings, 48 alightings and 80/80 completed journeys. Older milestone sections below are historical.

## Station 3B.5

The usable platform frontage is open, with short guarded end returns and retained stair, rear and end barriers. [StationLayout.ts](./src/world/generation/StationLayout.ts) supplies solid obstacle boxes separately from the platform-edge navigation hazard and tactile/safe-waiting dimensions. [StationBoardingAccess.ts](./src/world/simulation/StationBoardingAccess.ts) validates a supported waiting-to-sill approach for each of the six doors, including body clearance, matched elevations and the normal 55 mm gap. [TrainDoors.ts](./src/world/simulation/TrainDoors.ts) reports physical `passengerAccess` only during an aligned stationary full-open hold, with `npcBoardingEnabled: false`. [StationNavigation.ts](./src/world/simulation/StationNavigation.ts) exports disabled future approaches without adding active boarding edges.

[The current handoff](./quality/STATION_DEVELOPMENT_3B_5.md) records six doorway close-ups, preserved guards, zero body/mesh obstructions, nine arrival/departure cycles, 49 passing tests and the retained 35/35 pedestrian closure result. It supersedes 3B's static-screen limitation. The train/door state machine and interlocks are preserved; boarding remains pending Station 3C. Earlier milestone descriptions below are historical.

## Station Development 3B

[TrainDoors.ts](./src/world/simulation/TrainDoors.ts) adds authoritative individual door state, closed confirmations, guarded opening/obstruction inputs and world-space doorway/boarding-anchor records. [TrainOperation.ts](./src/world/simulation/TrainOperation.ts) now includes opening, full-open dwell, departure warning and closing before its existing departure preparation; every door must be confirmed closed before motion. The hollow carriage shell has real apertures, thresholds and externally sliding glazed leaves. [TrainDoorPresentation.ts](./src/world/simulation/TrainDoorPresentation.ts) reads fractions and warning-lamp state into bounded shared instance pools without visual timers.

[The handoff](./quality/STATION_DEVELOPMENT_3B.md) records nine generated-world door cycles, the blocked-close recovery, seven actual captures, 44 passing tests and the unchanged 35/35 pedestrian closure result. Platform screens remain static and explicitly block future passenger access; no boarding or announcements are implemented. Earlier sections retain their historical milestone boundaries.

## Station Development 3A

[TrainOperation.ts](./src/world/simulation/TrainOperation.ts) owns the deterministic 30 Hz approach, braking, exact stop, configurable dwell, departure preparation, acceleration and running sequence. Cubic speed ramps have continuous position, velocity and acceleration. A three-car, 39.125 m consist fits the preserved platform's 51.5 m usable frontage at x = 34.75, z = -57; [RailGeometry.ts](./src/world/simulation/RailGeometry.ts) supplies the geometry used by the actual train meshes and stopping envelope. Continuous reversals beyond the district replace the old position wrap, and service closure drains an admitted journey before parking. Presentation and train audio read that authoritative state.

[The handoff](./quality/STATION_DEVELOPMENT_3A.md) records geometry, timing, service semantics, 37 passing tests, 12 generated-world arrivals, 11 actual scene captures and the repeated Station Development 2 pedestrian validation. Existing gates, stairs, waiting destinations, shops and traffic retain their behavior. Doors, boarding, alighting and timetables remain pending. Earlier station sections below describe their historical delivery boundaries.

## Station Development 2

[StationNavigation.ts](./src/world/simulation/StationNavigation.ts) extends the existing graph with directed 3D station links derived from the station surfaces, gates, treads, landings and waiting regions. Nodes carry Y; edges carry traversal type, speed, phase, flight/gate identity and reservation resources. A separate forecourt exit reconnects to the existing public sidewalk. [StationTraffic.ts](./src/world/simulation/StationTraffic.ts) runs deterministic station errands inside the same 30 Hz CitySimulation step: pavement approach, entrance, reserved gate, paid circulation, stair ascent, reserved waiting destination, descent, exit gate and public reentry. Gate/turn ownership, bounded demand, service hours and closure draining are explicit; no separate passenger population is spawned.

Pedestrians now have authoritative X/Y/Z. Street heights retain their existing curb/alley rules. [HumanPresentation.ts](./src/world/simulation/HumanPresentation.ts) reads that position, while [StationPose.ts](./src/world/simulation/StationPose.ts) places feet on real treads with connected two-bone legs. Existing city exterior routes retain their footprint reservation; station travelers validate height-bearing obstacles/surfaces. The existing forecourt paving is part of the shared contract, with one narrow apron correcting its gap to the sidewalk. Rail/traffic logic, buildings, stores, signs, lighting, audio and HUD are unchanged.

[The handoff](./quality/STATION_DEVELOPMENT_2.md) records 31 passing tests, 35 completed generated-world visits, actual live-journey images, measured waits and limits. [StationNavigationDebug.ts](./src/world/simulation/StationNavigationDebug.ts) supplies an optional development overlay with live paths, state labels, waiting slots and gate ownership. Boarding, train stops and timetables remain pending.

## Station Development 1

[StationLayout.ts](./src/world/generation/StationLayout.ts) now owns the station's metre-scale surfaces, structural bounds, gates, four stair flights/rests, named 3D nodes, circulation/waiting regions, platform edge and explicit connections. [StationDetails.ts](./src/world/generation/StationDetails.ts) renders that same contract. The retained track center is z = -57; the 53.5 m platform top is y = 7.455, matching the unchanged train door sill. [The plan/section](./quality/station1-layout.svg) and [exported spatial data](./quality/station1-spatial.json) derive directly from source.

Generation provides separate player collision bounds and `District.station`; obstacles appended by the existing street layer are copied into the player list before controller creation. [PlayerController.ts](./src/world/controls/PlayerController.ts) follows authored station surfaces with bounded step changes and height-aware local obstacles, making the complete street-to-platform route walkable in both directions. This architecture milestone initially retained flat NPC navigation; Station Development 2 above supplies actual passenger traversal. Railway movement, camera presets, traffic, signage/store work, global lighting and HUD retain their existing behavior. [The architecture handoff](./quality/STATION_DEVELOPMENT_1.md) preserves its dimensions, references, captures and original validation boundary.

## Completed signage/store continuation

[SignCatalog.ts](./src/world/generation/SignCatalog.ts) owns stable business identities and store notices; [SignLayout.ts](./src/world/generation/SignLayout.ts) supplies browser-independent dimensions, packing, measured text placement and bounded emission; [SignTextures.ts](./src/world/generation/SignTextures.ts) rasterizes actual-aspect faces after [CityBatch.ts](./src/world/generation/CityBatch.ts) records their metre sizes. Each page remains a merged mesh with the existing per-vertex business/schedule attributes. Nightlife signs also use measured fitting and exact ratios, with flat instanced face geometry.

[ConvenienceStore.ts](./src/world/generation/ConvenienceStore.ts) authors one existing branch. The generator flags the first positive-X main-street convenience parcel south of z=20.5 without consuming RNG; [BuildingKit.ts](./src/world/generation/BuildingKit.ts) reserves the deeper room inside that parcel. Other parcels, collision metadata, door coordinates, camera presets and simulation systems retain their contracts. Fixtures and packages use shared instanced batches with no added real lights. [The handoff](./quality/KONBINI_REVIEW.md) records validation, allocation cost, scope and limitations.

## Production audit and immediate scope

The current delivery is production **Pass 1**, focused on Reference A and a substantially richer nightlife street. The existing project is retained. The initial checkpoint is `e1d972b`; the earlier playable simulation and evening world are preserved there.

The baseline already had a seeded metre-scale district, five building archetypes, instanced actors, tested left-hand traffic and pedestrian signal rules, business schedules, a passing elevated train, spatial procedural audio, day/night lighting and masked planar road reflections. It lacked detailed hero props, varied alley businesses, a strong nightlife focal point and a reliable full-resolution capture workflow. The prior smoothed HUD FPS was unsuitable as benchmark evidence.

## Runtime responsibilities

| Module | Responsibility |
| --- | --- |
| [main.ts](./src/main.ts) | Compose world and HUD; expose development diagnostics. |
| [CityWorld.ts](./src/world/CityWorld.ts) | Render loop, schedules, lights, camera presets, composition, actual-canvas captures and raw frame measurements. |
| [NeighborhoodGenerator.ts](./src/world/generation/NeighborhoodGenerator.ts) | Seeded roads, parcels, original building kit, station, railway, props and shared spatial metadata. |
| [BuildingKit.ts](./src/world/generation/BuildingKit.ts) | Existing general-purpose architectural archetypes and shallow rooms. |
| [Materials.ts](./src/world/generation/Materials.ts), [SurfaceTextures.ts](./src/world/generation/SurfaceTextures.ts) | Shared PBR channels, aligned world UVs, surface maps and sign atlas. |
| [CityBatch.ts](./src/world/generation/CityBatch.ts) | Instanced primitives, sign quads and cable lines. |
| [NightlifeStreet.ts](./src/world/generation/NightlifeStreet.ts) | Authored alley facades, business-specific furniture, layered signs, service infrastructure, practicals, exhaust positions and shop thresholds. |
| [NightlifeMaterials.ts](./src/world/generation/NightlifeMaterials.ts) | Weathered masonry, timber, cloth and metal; aspect-correct original signs with bounded day/night emission. |
| [NightlifeAssets.ts](./src/world/generation/NightlifeAssets.ts) | GLTFLoader, material-wise flattening, shared instancing, load status and original GLB light channels. |
| [CityBackdrop.ts](./src/world/generation/CityBackdrop.ts) | Distant skyline, road continuation and fictional Akane broadcast tower. |
| [StationDetails.ts](./src/world/generation/StationDetails.ts), [RailwayDetails.ts](./src/world/generation/RailwayDetails.ts) | Existing static station and elevated railway environments. |
| [CitySimulation.ts](./src/world/simulation/CitySimulation.ts) | Browser-independent deterministic 30 Hz movement, route permissions, interlocks and population changes. |
| [WorldRules.ts](./src/world/simulation/WorldRules.ts), [Navigation.ts](./src/world/simulation/Navigation.ts) | Signals, business/service rules, lanes and validated pedestrian graph. |
| [CityActivity.ts](./src/world/simulation/CityActivity.ts), [CommuterRail.ts](./src/world/simulation/CommuterRail.ts) | Actor/signal presentation and passing elevated train. |
| [CitySoundscape.ts](./src/world/audio/CitySoundscape.ts), [AudioMix.ts](./src/world/audio/AudioMix.ts) | Gesture-activated spatial ambience and bounded distance/speed vehicle mix. |
| [StreetAtmosphere.ts](./src/world/effects/StreetAtmosphere.ts) | Pooled source-bound steam and scheduled shop staff/patrons. |
| [StreetReflections.ts](./src/world/effects/StreetReflections.ts) | One 768px planar reflection, masked to broken patches on roads. |
| [PlayerController.ts](./src/world/controls/PlayerController.ts) | Walk/fly input and footprint collisions. |

## Shared scene contract

Generation emits a scene group, collision bounds, doors, shopfronts, lamps, material channels and statistics. The nightlife layer augments this contract **before** simulation, actor presentation and shop atmosphere are constructed. Its visible facades, staff positions, exhaust sources, collisions and threshold destinations use the same transforms.

Alley thresholds have explicit approach coordinates and an alley tag. Navigation links them to the same-side alley graph, preserving marked crossings as the only connections across moving road traffic. Visits stop outside the room; the player does not gain interior access in this pass.

The principal arterial remains near x = 0, the alley near z = -25, the elevated line near z = -57, and the compact playable district around 150 m across. All eight presets are defined in the exported camera data; the original seven retain their transforms. Nightlife is preset 8.

## Hybrid asset pipeline

[build-nightlife-assets.mjs](./tools/build-nightlife-assets.mjs) authors three original, metre-scale GLBs using lathed profiles, rounded housings, extruded fan blades, tubes and metal rings. `npm.cmd run assets:build` exports and reloads them, checks their geometry, and records measured dimensions. They can be opened in Blender as ordinary glTF assets.

Runtime loading flattens compatible model primitives by material, then instances repeated placements. The three prop families contribute twelve material batches rather than a scene node/draw call for every fan ring or lantern rib. Materials and geometry remain shared; luminous channels follow the street's opening/day state. No remote asset server or font service is required.

## Bottlenecks and limits

- Planar reflection performs a second scene render. Added hero geometry and PBR texture families increase its cost as well as the primary view's cost.
- The bounded practical light set still influences many material shaders. More point lights should not be the default method for increasing richness.
- General district primitive batches span the compact map; per-building culling/streaming and distant actor LOD remain future work.
- Actor meshes remain stylized and are a major visual gap at close range. They require a dedicated character and animation pass.
- The railway is elevated and passing-only. Station stairs/platforms support player walking and basic NPC round-trip visits; ground-level crossing interlocks, station stops and boarding are pending.
- Steam is tinted billboard geometry, not volumetric fluid simulation. Wet roads use an approximation, not fully rough ray-traced reflection. Rainfall and drying are pending.
- Shop thresholds are functional destinations; door entry/exit, per-tenant occupancy and player-enterable rooms are pending.

## Validation boundary

Tests cover actual source behavior, imported GLB validity, the first-teleport camera regression and safe alley destination links. Browser review must still inspect the rendered world. The development capture endpoint stores actual 1920 × 1080 canvas output and metadata; raw rAF sampling reports median, p95/p99 and aggregate FPS separately from the HUD display.

See [VISUAL_TARGETS.md](./VISUAL_TARGETS.md), [QUALITY_REPORT.md](./QUALITY_REPORT.md), [ASSET_MANIFEST.md](./ASSET_MANIFEST.md) and [ROADMAP.md](./ROADMAP.md).

## Subsequent visual correction

[HumanGeometry.ts](./src/world/simulation/HumanGeometry.ts) supplies metre-scale tailored lofts and anatomical heads. [HumanPresentation.ts](./src/world/simulation/HumanPresentation.ts) instances them using the same deterministic pedestrian state; [CharacterPose.ts](./src/world/simulation/CharacterPose.ts) supplies connected joints and ground contact. The simulation's X/Z footprints and routes are unchanged.

[ContactShading.ts](./src/world/effects/ContactShading.ts) adds half-resolution GTAO before bloom. It excludes transparent effects, sky and the planar reflector from normal/depth rendering and restores visibility afterward. It adds a geometry pass; disable it with `?ao=0` or the development world method. It is not a replacement for physically complete local shadows.

[SkylineLayout.ts](./src/world/generation/SkylineLayout.ts) generates protected background parcels, consumed by the existing backdrop renderer. Five massing families, grouped occupancy and cross-street layers replace the former identical slab grid. Higher office roofs in the existing building kit receive setbacks without changing footprint metadata or RNG draw counts. [VISUAL_REVIEW.md](./VISUAL_REVIEW.md) records measured cost and limitations.

## Authored environment pilot

[AUTHORING.md](./AUTHORING.md) documents the shared asset registry, versioned scene/prefab data, generated-anchor adapter and development-only transform/light editor. Shindo equipment/furniture and two Yoto storefronts now use this layer while existing generation, navigation, collision reservations and simulation remain authoritative. [Working evidence](./quality/WORKFLOW_2_REVIEW.html) includes matching views and saved-edit persistence.
