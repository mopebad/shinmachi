# Shinmachi — architecture and development roadmap

## Direction

A compact, metre-scale, Tokyo-inspired neighborhood that rewards walking at eye level. Dense architecture and street atmosphere take precedence over map size. This is a fictional district, not a geographically accurate reconstruction of Tokyo.

## Completed: neighborhood overhaul

- Seeded, tightly packed commercial frontages; a narrower lantern alley; a residential lane; cross avenue; station forecourt and elevated railway. Default seed produces 57 buildings.
- Five reusable architectural kits: izakaya, narrow retail, apartment, office, convenience store. Variable parcels, heights, setbacks, materials, balconies, laundry, framed windows, projecting signs, stairs, downpipes, AC units, roof tanks, antennas, and HVAC.
- Recessed storefronts with doors, handles, shelves, bottles/cartons, striped awnings, noren, menu boards, lanterns, and crates. Alley bars have their own timber frontage kit.
- Locally generated tiled/concrete/asphalt/paving textures, glass variation, and one Japanese sign atlas. World-space surface UVs prevent stretched paving and oversized tiles. No runtime asset/font CDN.
- Metre-scale roads and raised sidewalks, tactile strips, gutters, manholes, zebra crossings, stop bars, signal heads, guardrails, bollards, convex mirror, inverted-triangle stop sign, and coin parking with parked kei cars.
- Utility poles, transformers, sagging overhead cables, vending machines, tube-frame bicycles, planters, modest trees, trash cage, parcel lockers, station benches, ticket machines and turnstile silhouettes.
- ACES filmic rendering, explicit sRGB output, environment illumination, directional shadows, sky gradient/sun/stars, atmospheric haze, restrained bloom, and bounded non-shadow-casting practical lights.
- Scrubbable and playable day/night cycle affecting sun position/color, ambient light, sky, haze, signs, windows, shop illumination and streetlights. Late-night shop lighting dims.
- Instanced pedestrians with walking animation, sidewalk routes, selected shop/station visits, and signal-gated road crossing. Visitors pause out of view at doorways; there are no furnished enterable interiors.
- Left-hand, opposite-direction vehicle lanes with following gaps, acceleration, stop lines, and pedestrian signal protection. Passing three-car commuter train.
- Hour-dependent pedestrian/car density, with morning/evening peaks and lower late-night activity.
- Smooth walking, building-footprint collision/sliding, free flight, safe return from flight, pointer lock plus drag-look fallback, and four location presets.
- Shared primitive geometry, instanced static kits/actors, merged atlas sign geometry, cached district shadows, capped pixel ratio, and split renderer/application bundles.

## Architecture

| Module | Responsibility |
| --- | --- |
| [main.ts](./src/main.ts) | Compose world and HUD. Development-only `window.__shinmachi` supports browser diagnostics without mounting another scene. |
| [CityWorld.ts](./src/world/CityWorld.ts) | Renderer, lighting/sky, postprocessing, simulation update, clock, presets, telemetry. |
| [types.ts](./src/world/types.ts) | Plain district contract: collision bounds, doorways, lamp positions, materials, statistics. |
| [NeighborhoodGenerator.ts](./src/world/generation/NeighborhoodGenerator.ts) | Seeded parcel layout, street kit, railway/station, props and district data. |
| [BuildingKit.ts](./src/world/generation/BuildingKit.ts) | Local-coordinate architectural archetypes and layered facade/roof details. |
| [Materials.ts](./src/world/generation/Materials.ts) | Reproducible RNG, local canvas surface textures, glass and Japanese sign atlas, world-space UV shader extension. |
| [CityBatch.ts](./src/world/generation/CityBatch.ts) | Shared geometry/material instancing, transformed kit parts, merged atlas quads, cable lines. |
| [CityActivity.ts](./src/world/simulation/CityActivity.ts) | Lightweight deterministic agent routes, crossing controller, lane traffic, animated instanced people/cars/train. |
| [PlayerController.ts](./src/world/controls/PlayerController.ts) | Input, smoothing, walking collision, free flight, safe teleporting. |
| [Hud.ts](./src/ui/Hud.ts) | Time, play/pause, exploration controls/presets, compact population/FPS readout. |

Generation returns plain spatial data alongside meshes. Future navigation, district, and routine systems should consume this contract instead of inferring their state from rendered geometry. The current layout is intentionally one hand-shaped district grammar with seeded variation, not a general road-graph generator.

## Validation and visual review

- `npm.cmd run check` and `npm.cmd run build`; editor diagnostics checked.
- Development server launched; browser inspected at pedestrian height during day and night, plus alley and station views.
- Review improvements: world-space texture scaling, revised sign typography/exposure, more varied merchandise/glass, pedestrian hair/proportions and distributed spawns, detailed alley bar frontages/lanterns, and reserved station forecourt with collision-free presets.
- Browser simulation exercise: 112 seconds in 0.1-second steps, covering two complete 52-second signal cycles. Zero red-signal pedestrian starts and zero cars in the crossing during pedestrian green; minimum same-lane car center spacing 4.4 m.
- Identical activity seeds produced identical initial agents. At 03:00 there were 10 pedestrians/1 car; at 08:00, 63 pedestrians/9 cars.
- All four default-seed presets checked outside building footprint collisions. Different seed layouts reproduce deterministically; retain the default seed as the visual benchmark.
- The engine vendor bundle is approximately 504 kB minified (128 kB gzip), slightly above Vite's default 500 kB advisory. This is a non-fatal size warning, not a build error.

## Next: fidelity and simulation depth

- [ ] Higher-fidelity character/vehicle silhouettes, avoidance/separation and less abrupt population changes.
- [ ] Connected navigation graph for all lanes/alleys; full cross-avenue traffic and turning rules. Current moving cars use the main street only.
- [ ] Proper station stairs/platform access, station stops, passenger boarding, and believable train schedules. Current train is a passing set; station is exterior-only.
- [ ] Per-business hours, varied window occupancy, richer shop-specific interiors/displays and opening/closing animations.
- [ ] World-collision for every prop, vehicle and agent; stairs and other walkable elevations. Current walking uses building/station/rail-pier footprint bounds only.
- [ ] Broader architectural silhouettes: tiled pitched roofs, curved corner lots, utility yards, distinct residential entrances and larger station architecture.
- [ ] Rain, wet-surface reflections, puddles and weather sound. Deliberately deferred to prioritize the street/architecture overhaul.

## Later: expandable city

- District road graph and parcel subdivision, authored district templates, hierarchical/chunked instancing, LOD/culling and streaming.
- NPC homes/workplaces, schedules, persistence, destinations, transport choices and save/replay support.
- Additional rail routes, buses, delivery traffic and coordination with crossings.
- Accessibility, remappable input, touch controls, audio ambience, photo mode, seasonal variation and authoring tools.

## Performance guardrails

- Profile CPU generation, per-frame agent work, draw calls, triangle count, GPU lighting cost, memory and load time separately.
- Keep the number of real lights bounded; use atlas emission for most signs. Static geometry shadows are cached and refreshed when time changes; moving agents currently do not cast dynamic shadows.
- Avoid expanding the map before adding chunk-level culling/LOD. Current static batches span the whole compact district.
- Do not claim an integrated-GPU frame-rate target without measuring on that hardware. The HUD reports local browser observations, not a hardware-independent benchmark.
