# Architecture

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
- The railway is elevated and passing-only. Ground-level crossing interlocks, station stops, boarding and walkable platforms are pending.
- Steam is tinted billboard geometry, not volumetric fluid simulation. Wet roads use an approximation, not fully rough ray-traced reflection. Rainfall and drying are pending.
- Shop thresholds are functional destinations; door entry/exit, per-tenant occupancy and player-enterable rooms are pending.

## Validation boundary

Tests cover actual source behavior, imported GLB validity, the first-teleport camera regression and safe alley destination links. Browser review must still inspect the rendered world. The development capture endpoint stores actual 1920 × 1080 canvas output and metadata; raw rAF sampling reports median, p95/p99 and aggregate FPS separately from the HUD display.

See [VISUAL_TARGETS.md](./VISUAL_TARGETS.md), [QUALITY_REPORT.md](./QUALITY_REPORT.md), [ASSET_MANIFEST.md](./ASSET_MANIFEST.md) and [ROADMAP.md](./ROADMAP.md).
