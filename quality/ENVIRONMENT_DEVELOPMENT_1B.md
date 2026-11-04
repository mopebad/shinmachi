# Environment Development 1B — railway corridor and station district

Implemented and reviewed 4 November 2026. [Open the before/after viewer](./RAIL_DISTRICT_REVIEW.html), [platform comparison](./captures/rail-district-platform-day-after.png), [district overview](./captures/rail-district-overview-day-after.png), or [actual arriving-train sightline](./captures/rail-district-arrival-night-after.png).

## Result and baseline verification

The railway now sits between a row of fourteen narrow mixed-use buildings, four under-viaduct premises and two compact buildings beside the western service court. Five facade families provide recessed windows, tile/render/brick/office finishes, balconies, exterior stairs, different roof equipment and occupied-window patterns. The station frontage gains three parked bicycles, a small wayfinding totem and a real local-area map beside the ticket machines. Existing entrance signs, gates, stair openings, platform and operating door approaches are retained.

[Skyline Development 1A](./SKYLINE_DEVELOPMENT_1A.md) was verified in the running application before editing: 376 background buildings in seven families, 119/168/89 in its three depth layers, and the 333 m landmark at X −32 / Z −1050, yaw 0.2827433 rad. These values remain unchanged. The original district's 57 buildings, business destinations, vehicles and population seed are preserved; this pass adds 20 scenic parcels, making 77 near-field buildings. New premises do not create extra NPC destinations or claim to have simulated interiors.

The [baseline](./rail-district-before-measurements.json) exposed several specific problems:

| Region | Finding and correction |
|---|---|
| Opposite the platform | A broad unoccupied strip exposed coarse background offices. A staggered row of 2–6-storey parcels now provides a close urban edge, with finished rear/side elevations. |
| Main-road crossing | The centre pier was already omitted, leaving a 32 m gap between supports at X −17 and 15. New piers at ±7.8 and actual steel portal beams shorten and explain this span. |
| Residential-road crossing | A former pier at X 31 occupied the road at X 30. It is replaced by supports at 26.4 and 33.6, outside the road reservation. |
| Viaduct underside | Crossheads did not reach the new edge-girder axes. Their depth is now 5.3 m; beams meet the caps and slab. Drainage, conduit and equipment attach to the structure. |
| Under-track/under-platform spaces | Four small premises occupy available bays, avoiding piers, station supports and circulation. They have shallow displays/counters, canopies, exhausts and original Japanese signs. |
| Western empty plot | The first review still showed excessive asphalt. Two 3/4-storey parcels now define a service court, with clear end access and paved tenancy aprons. |
| Forecourt | The entrance stays open. Bicycles occupy a separate pocket, and the small station map uses actual local road/rail coordinates. |

## Spatial contract

Measurements come from current [StationLayout](../src/world/generation/StationLayout.ts), [RailGeometry](../src/world/simulation/RailGeometry.ts) and generated bounds. The new pure [RailDistrictLayout](../src/world/generation/RailDistrictLayout.ts) defines parcels, protected space, support locations and obstacle metadata together.

| Element | Authoritative dimensions / reservation |
|---|---|
| Track and viaduct | Track Z −57; railhead Y 7.02. Existing detailed deck X −71…71, Z −60.25…−53.75; deck underside 5.75, top 6.65. |
| Station platform | X 8…61.5, front Z −55.5, rear Z −47.7, floor Y 7.455. Existing station spatial contract is byte-equivalent after JSON serialization. |
| Complete train sweep | Conservative box X −151…221, Z −58.65…−55.35, Y 6.98…11.05. Includes the full three-car movement, projecting details and pantograph margin. No new part enters it. |
| Main-road reservation | X ±5.9 at the crossing, including the sidewalk envelope. Portal support centres ±7.8; lowest flange is approximately 4.905 m above ground. The nominal web bottom is 4.95 m. |
| Residential-road reservation | X 27.5…32.5; support centres 26.4/33.6. Lowest flange approximately 5.055 m. |
| Support construction | Eleven columns, 1.2 × 2.6 m in plan, with 1.9 × 3 m footing reservations and 3.8 × 5.3 × 0.8 m caps. Maximum centre spacing 16 m. Two edge beams per portal meet the caps. |
| North-side service lane | Z −64.9…−62.3, clear width 2.6 m; breaks remain at both existing road crossings. Buildings face this lane and the restricted railway side is fenced. It is scenic/manual exploration space, not an added NPC route. |
| North parcels | Two strips X −70…−9 and 9…70; fronts around Z −66.45…−66.70, widths about 5.4–8.6 m, depths 5.8–7.5 m, separated by service gaps. No overlap with existing reservations. |
| Under-rail premises | Centres X −41.3/−24.6 at front Z −53.8 and X 43.2/55.1 at front Z −48.8; widths 6.8–7 m, depth 4 m. Roof/exhaust geometry remains below the deck/platform. |
| Western court parcels | Centres (−34, −41.8) and (−24, −41.8), footprints approximately 6.2 × 6 and 6 × 5.8 m. Rear windows face the rail service court; fronts and end gaps connect to the city-side open space. |

Gutters feed branches under the deck, downpipes fixed to piers and ground drains. Cable troughs have brackets. Three louvred electrical cabinets sit beside piers. Pier jackets, fences and a visibly closed maintenance gate establish restricted space; the fence has a real gap at the residential road. Existing upper maintenance walks, rail guards, catenary and station fall barriers remain in place.

New low objects are reserved in both player and NPC collision lists. The eight old pier bounds are replaced by eleven footing bounds. Other original bounds survive. NPC obstacles increase from 169 to 204 and player obstacles from 127 to 162; the original 350 navigation nodes and 478 directed edges remain identical. Ticket-wall poster projections are checked against their existing host wall. Exterior building stairs are scenic, closed-access structures, separate from the functioning station stairs.

## Implementation

- [RailDistrict](../src/world/generation/RailDistrict.ts) builds real instanced geometry using the existing materials, measured sign atlas and frontage kit. Back/side windows and roof fixtures are present in world space. No image manipulation, camera-facing skyline facade or new runtime image service is used.
- [NeighborhoodGenerator](../src/world/generation/NeighborhoodGenerator.ts) integrates the plan and collision reservations, replaces the conflicting support and retains every original parcel RNG draw. The new layout uses an independent seeded stream.
- The authoritative train operation, door, passenger, gate, stair, traffic, business and audio modules are unchanged. No new functional railway, road, NPC route or interior system is introduced.
- [Focused regression tests](../tests/rail-district.test.mjs) cover deterministic parcels/exclusions across five seeds, support/portal clearances, identical navigation and actual passenger exchanges against the new collision reservations.

## Actual browser review and refinement

Nine pairs of 1920 × 1080 WebGL PNGs were captured through the existing development capture endpoint. Each PNG has adjacent JSON containing camera position/quaternion/FOV, simulation time, train state, people, vehicles, lighting, weather and rendering settings. [Capture validation](./rail-district-capture-audit.json) confirms these conditions **and all actor/rail snapshots** match before and after.

All pairs use seed 8412, simulation clock 300 seconds, After Rain wetness 0.64, reflections and contact shading. Night is 20:30; day is 13:00. Camera transforms were locked before integration and never moved to conceal an implementation defect.

| View | Eye → target; FOV | Captures |
|---|---|---|
| Platform, day/night | (42, 9.16, −50.3) → (12, 10, −75); 64° | [Before](./captures/rail-district-platform-day-before.png) / [after](./captures/rail-district-platform-day-after.png) |
| Railway approach camera | (−48, 12.2, −63) → (35, 8.5, −53); 64° | [Before](./captures/rail-district-approach-night-before.png) / [after](./captures/rail-district-approach-night-after.png) |
| Street beside railway | (4.65, 1.82, −43) → (−18, 4.7, −57); 68° | [Before](./captures/rail-district-rail-street-night-before.png) / [after](./captures/rail-district-rail-street-night-after.png) |
| Station entrance, day/night | Existing preset 03, (17, 1.82, −39) → (19, 3.4, −49); 56° | [Before](./captures/rail-district-entrance-day-before.png) / [after](./captures/rail-district-entrance-day-after.png) |
| Overview, day/night | (65, 68, 10) → (4, 5, −60); 65° | [Before](./captures/rail-district-overview-day-before.png) / [after](./captures/rail-district-overview-day-after.png) |
| Hero Street | Existing preset 09, (4.7, 1.82, 43) → (−1, 5, −25); 60° | [Before](./captures/rail-district-hero-night-before.png) / [after](./captures/rail-district-hero-night-after.png) |

The fixed approach comparison is an observation camera beside the line; the frozen clock-300 train is running away from the station. A separate [arrival capture](./captures/rail-district-arrival-night-after.png) records the actual `APPROACHING` train at 4 m/s from just ahead of its cab. Its adjacent JSON records its distinct timestamp; it is explicitly a supplemental image, not a matched comparison. Further supplements show the [north lane](./captures/rail-district-north-lane-night-after.png), [under-rail frontage](./captures/rail-district-under-rail-day-after.png) and [forecourt](./captures/rail-district-forecourt-day-after.png).

Visual inspection led to fewer repetitive roof tanks, different plant/antenna/chimney arrangements, wider switchback stair bays with the ground room kept out of them, the actual area guide, the two western court parcels and paved shop aprons. The geometry review also corrected the side-road fence gap, crosshead depth, maintenance-gate bounds and small fittings extending outside obstacle reservations.

## Correctness and performance

`npm.cmd run check`, `npm.cmd test` and `npm.cmd run build` pass: **75/75 tests**, including existing station, train, door, boarding, pedestrian, traffic and collision regressions. The build retains the existing Three.js core chunk-size advisory; it completes successfully.

The [actual generated-geometry audit](./rail-district-geometry-audit.json) checks 5,549 parts including sign quads and revised piers, finite positive instance transforms, the complete train sweep, road clearance volumes, and 18,477 pedestrian body samples along all original graph edges and all six door approaches. It reports zero train, road or route intersections, zero unreserved low parts, zero shader-link errors and zero asset errors. Low-part bounds use 5 mm numerical tolerance. The six doorways retain a 55 mm platform gap and effectively zero sill-height error.

The [generated-world browser regression](./rail-district-passenger-audit.json) runs two independent 900-second evening services, each followed by a 900-second service-closure drain:

| Load | Arrivals / departures | Boarded / alighted | Station journeys completed | Minimum elevated separation | Vehicle exits |
|---|---:|---:|---:|---:|---:|
| Six arriving riders | 6 / 6 | 12 / 36 | 54 / 54 | 0.56016 m | 217 |
| Twelve arriving riders, demand 0.8 | 5 / 5 | 13 / 60 | 79 / 79 | 0.56002 m | 217 |

Both runs report zero unsafe departures/crossings, invalid positions, passenger overlaps, capacity violations, gate conflicts, wall hits or pedestrian/vehicle overlaps. All boarded riders are delivered, every admitted journey drains, and no passenger or reservation remains stranded. Full-load capacity refusals count retry ticks, not unique rejected people.

At the fixed station camera and 1323 × 804, [before](./rail-district-before-measurements.json) versus [after](./rail-district-after-measurements.json) draw calls are **423 → 563 (+33.1%)**, triangles **3,590,059 → 3,823,396 (+6.5%)**, including existing rendering passes. The new context batch contains approximately 78.6k triangles. Geometry uses shared low-detail primitives and material/shape instancing; it adds no dynamic lights, shadow maps or high-resolution external assets.

The 30-sample synchronous composite wall-time measurement was 3.7 → 5.3 ms median and 4.3 → 7.8 ms p95. Host/browser timing is variable. A separate [eight-pair alternating isolation measurement](./rail-district-performance.json), retaining revised piers in both variants, measured 3.8/5.5 ms wall medians and 6.33/10.76 ms reported GPU-query medians with context hidden/visible. This is an isolation comparison, not a reconstruction of the historic baseline; GPU timer samples are noisy and should not be treated as a stable hardware cost.

The [live frame sample](./rail-district-frame-timing.json) recorded 490 frames in 5.0094 seconds: 97.8 aggregate FPS, 8.4 ms median and 16.8 ms p95, at 1323 × 777, DPR 1, RTX 5070 Ti. Simulation and train movement were running. This is one desktop sample, not a minimum-FPS guarantee or a directly comparable pre-edit frame benchmark.

## References, reproduction and limits

[Research and photograph credits](./references/rail-district/README.md) include licensed Shimbashi/Hamamatsucho photographs, JR East concrete-structure references, the Tamachi–Shinagawa geographic context and GO TOKYO's under-rail commercial reference. They informed the fictional district's parcels and construction language; historic brick arches, official logos and advertisements were not copied.

Open `http://127.0.0.1:5173/?view=2&seed=8412&review=1`, keep the tab visible, and use the [browser helper](../tools/rail-district-browser-checks.mjs):

```js
const rail = await import('/tools/rail-district-browser-checks.mjs');
await rail.audit();
await rail.captureSet('after');
await rail.validateCaptures();
await rail.performanceReview();
await rail.exchange();
window.__shinmachi.setReviewPaused(false);
```

Reload the review URL before replaying to clock 300. `captureSet('before')` must not be run against the revised world: the saved baseline belongs to the original geometry. Supplemental cameras and their complete conditions are preserved in their adjacent capture JSON.

Remaining weaknesses: some pre-existing office backs still have large plain walls; the wide overview retains recognisable repeated older roof/window kits. The service lane is deliberately quiet and dark at night, with no new simulated pedestrians or shop activity. Scenic shop rooms are shallow displays rather than detailed interiors. New context uses near-field instancing/frustum culling rather than a new per-building distance LOD system; draw-call reduction through shared city-wide material batching would be a useful focused optimisation. Further parcel individuality and restrained service lighting would improve the corridor more than adding more towers or unrelated props.
