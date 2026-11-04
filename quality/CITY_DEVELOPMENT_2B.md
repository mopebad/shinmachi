# City Development 2B — neighborhood identities

Implemented and reviewed on 4 November 2026, seed **8412**. Open the [nine-pair WebGL comparison viewer](./NEIGHBORHOOD_REVIEW.html), or inspect the [residential before](./captures/neighborhood-residential-day-before.png) / [after](./captures/neighborhood-residential-day-after.png), [Hero Street](./captures/neighborhood-hero-night-after.png) and [overview](./captures/neighborhood-overview-day-after.png).

## Verified starting point and spatial analysis

Code and rendered-world inspection confirm Skyline 1A's 376 background buildings and fixed 333 m landmark at X −32, Z −1050, plus Railway Environment 1B's twenty scenic parcels, supported elevated structure, maintenance surfaces and clear station approaches. Those systems remain in place. The generated near field contains 77 buildings, including the railway parcels.

No separate later implementation of a “connected secondary-street expansion” was found. The actual existing residential lane at X 30 and Lantern Alley at Z −25 already connect to the main street and avenue at Z 12. This milestone uses those streets, rather than assuming undocumented roads or expanding the map.

The strongest deficiencies were repeated commercial-looking apartment fronts, shop signs on housing, interchangeable backland offices, repetitive roof tanks, weak residential thresholds and an activity lookup too coarse to express the alley/residential contrast. Existing Hero Street shops and the twelve authored restaurant/theatre frontages were already stronger and were retained.

Coordinates below describe identity cores; they overlap deliberately and blend rather than forming navigation barriers. X increases east; more-negative Z is toward the railway.

| Area | Existing world-space core, metres | Character |
|---|---|---|
| Shinmachi-dori | X −21…21, Z −51…67 | Mixed-age retail, convenience store, bright commercial frontage and offices above. |
| Station quarter | X −71…71, Z −75…−47; forecourt extension X 8…26, Z −52…−38 | Commuter entrance, existing service shops, railway utilities and compact offices. |
| Higashi residential lane | X 22…44, Z −46…64 | Thirteen smaller residences/apartments facing the existing X 30 lane, restrained signs and illumination. Commercial character continues through the avenue crossing. |
| Yoto / Lantern Alley | X −23…23, Z −28…−22 | Existing narrow restaurant/bar/theatre cluster, warmer entrances and evening activity. |

[Neighborhoods.ts](../src/world/Neighborhoods.ts) provides one normalized world-space lookup for all consumers. Five-to-six-metre transition bands and a wider avenue transition prevent abrupt activity/audio changes. Backland parcels receive coherent office construction families without pretending that every lot is a new simulated destination.

## Rendered changes

[NeighborhoodArchitecture.ts](../src/world/generation/NeighborhoodArchitecture.ts) replaces **32 existing building presentations**: thirteen homes and nineteen offices. Four housing families comprise rendered walk-ups, brown tile apartments with balconies, small two-storey pitched-roof residences and renovated apartments with asymmetric bays. Their default distribution is 2 / 4 / 3 / 4. Office families use postwar, renovated and ceramic-panel construction with distinct window rhythm, piers, glazing and tenant directories.

Recessed ground-floor entries retain the existing threshold coordinates. Front walls have real pane openings; upper floors have recessed windows, varied balcony treatments, framed glazing and coherent service arrangements. Residential mailboxes, meters, restrained planting, drainage elbows and plaques fit inside reserved footprints. Some lobbies and entry fixtures use existing scheduled emissive materials. Side/rear walls are finished, while roof plant, antennas and occasional tanks vary. No point lights or shadow maps were added.

The refined pass corrected projecting mailbox/directory mounts, narrow office glazing, corner rear wings and roof-equipment placement. New plaques name the residences rather than advertising unrelated shops. Existing Japanese atlas measurement and typography remain authoritative. Main commercial storefront geometry, business identities, signage and convenience-store detail are preserved; their roof occupation is less uniform. Existing railway frontage, bicycle pockets and the twelve restaurant-alley entrances remain intact.

The generator consumes its original random draws before selecting the new independent parcel-hash variation. Changes to facade detail therefore do not shuffle subsequent lots. Materials and instanced batch geometry are reused. Buildings remain in their original lots; default building count stays 77.

### Corrected placement contradictions

The audit exposed eight pre-existing parcel conflicts. Two east-lane apartment rear wings near the avenue now use 5.2 m depth instead of 9 m. Six backland office lots retain valid smaller frontage strips inside their original reserved envelopes. These include offices at approximately (−56.26, −49.60) and (62.24, −58.55), which intruded into the rail-side maintenance envelope. The latter becomes a narrow three-storey service office rather than an eleven-storey body crossing the line. Other trims resolve neighboring building/corner overlaps.

The rail reservation is Z −61.6…−52.3, including maintenance space beyond the moving train. Corrected rendering, player collision bounds and frontage metadata agree. All original business/NPC entrance points, station metadata, lamps, **350 navigation nodes and 478 directed edges** remain unchanged. Exact old/new dimensions and eight adjustments are recorded in the [geometry audit](./neighborhood-geometry-audit.json), whose historical `railCorrections` field includes all eight corrections.

## Existing activity integration

Existing destination selection uses bounded district preferences: retail on the main corridor, commuter/office purposes near the station, quieter residential visits and a smooth evening restaurant preference. Optional existing frontage activities are less frequent on housing streets. These are multipliers on existing choices; no new pedestrian AI, admission rule, global population budget, route or reservation mechanism was introduced.

The existing soundscape uses the same continuous residential weight to reduce the city and distant wash near homes. There are no new audio sources or architecture changes. Existing business-hour lighting schedules remain in force; residential windows use lower occupancy than offices and retail. The restaurant alley retains its existing business categories and hours.

## Actual WebGL validation

All nine before/after pairs use 1920 × 1080, DPR 1, seed 8412, simulation clock 300, After Rain wetness 0.64, reflections and contact shading. Each camera position, quaternion, FOV, time and render condition matches its baseline, as confirmed by the [capture audit](./neighborhood-capture-audit.json). Agents use revised destination preferences, so their positions are allowed to differ. These are actual scene renders, not altered images.

| Capture | Time | Result reviewed |
|---|---|---|
| Hero Street | 20:30 | Existing commercial quality preserved; roof and surrounding office variation. |
| Commercial corridor | 13:00 | Continuous retail frontage and varied roof occupation. |
| Station frontage | 20:30 | Clear entrance, bicycle pocket, neighboring residential/office identity. |
| Residential lane | 13:00 and 20:30 | Four distinguishable housing families, real entry recesses, restrained signs/windows. |
| Restaurant alley | 13:00 and 20:30 | Preserved independent frontages and warm evening character. |
| Residential/alley junction | 13:00 | Connected physical transition; moving pedestrians partly obscure the fixed street view. |
| Elevated overview | 13:00 | Different building scales and rooflines within existing parcels; remaining backland weaknesses visible. |

The first implementation was captured separately, inspected and refined before final captures. The [viewer validation](./neighborhood-viewer-validation.json) decoded all eighteen final comparison images at their full dimensions; its report, audit and reference links also returned successfully. Primary reference photographs, official neighborhood guides and municipal planning context informed the work; see [sources and licensing](./references/neighborhoods/README.md). No reference photographs became game assets.

## Correctness and reproducibility

- `npm.cmd run check`, `npm.cmd test` (**81 tests**) and `npm.cmd run build` pass. Six new focused tests cover blended district assignments, activity weights, housing families, valid parcel corrections, retained navigation/door approaches and frame-rate-independent simulation. Existing station, passenger, door, train, traffic, signage and collision suites remain included.
- The browser audit checks **10,370 new/changed instanced parts**, 136,002 triangles and **17,711 navigation body samples**, using a 0.25 m pedestrian radius and 1.75 m height. No sampled train-envelope, road-volume, pedestrian-route or unreserved ground-part intersections were found. All shader programs link and loaded assets report no errors. This is a bounds/sample audit, not a claim of exhaustive triangle-level physics for every legacy prop.
- A fresh seed-8412 generation exactly reproduces parcel metadata, colliders, doors and all instanced transform/color buffers: [geometry replay](./neighborhood-geometry-replay.json). The background skyline/tower metadata is unchanged.
- Two actual generated-world simulations each ran 900 open seconds plus 600 seconds at 03:00 for closure, at deterministic 30 Hz: [complete state audit](./neighborhood-simulation-audit.json).

| Browser simulation | Day 13:00 | Evening 20:30 |
|---|---:|---:|
| Train arrivals / departures | 6 / 6 | 7 / 7 |
| Boarded and delivered | 10 | 4 |
| Alighted | 24 | 35 |
| Completed / admitted station journeys | 38 / 38 | 45 / 45 |
| Completed frontage activities | 101 | 132 |
| Vehicle exits | 169 | 204 |
| Mean people in residential area | 0.34 | 0.43 |
| Mean people in restaurant-alley area | 3.04 | 4.41 |

Both runs recorded zero invalid positions, unsafe crossings/departures, passenger overlaps, capacity violations, gate conflicts, wall hits, vehicle overlaps or ordinary-city road steps. Minimum sampled ordinary-city separation was 0.515 m. All admitted journeys drained, gate reservations cleared and trains parked after service closure. These density samples describe the tested populations; they do not isolate the district preference change from the existing time-of-day demand system.

## Rendering measurements

The [fixed Hero render samples](./neighborhood-after-measurements.json) use 1323 × 804, DPR 1, eight warmups and thirty synchronous composite renders with `gl.finish`. Compared with the [baseline](./neighborhood-before-measurements.json):

| Metric | Before | After |
|---|---:|---:|
| Composite draw calls | 1,272 | 1,275 |
| Composite triangles | 4,962,814 | 4,842,962 |
| Median render wall time | 11.7 ms | 13.7 ms |
| P95 render wall time | 28.5 ms | 15.5 ms |

Draw calls increase by three (0.24%); submitted triangles decrease 2.41%. These include existing rendering passes and actors whose routes may differ. Wall timings mix CPU/GPU work and host scheduling; their spread does not establish a speedup or a GPU-only cost. No extra material families, lights or distance-detail architecture were required.

[Visible five-second live samples](./neighborhood-frame-timing.json), RTX 5070 Ti at 1323 × 777 / DPR 1, measured 102.6 FPS Hero Street and 112.9 FPS residential, with median 8.4 ms and P95 12.6 / 12.5 ms frame intervals. These are hardware-specific live samples, not matched before/after benchmarks. The production build retains the existing Three.js chunk-size advisory.

## Reproduction

Start the existing Vite task and load `http://127.0.0.1:5173/?view=8&seed=8412&review=1`. In the browser console:

```js
const review = await import('/tools/neighborhood-browser-checks.mjs');
await review.captureSet('after');
await review.audit();
await review.replayGeometry();
await review.validateCaptures();
await review.exercise();
window.__shinmachi.setReviewPaused(false);
```

Keep the tab visible for timing. Start from a fresh review URL for `captureSet`, which advances the authoritative simulation to clock 300. Preserve original `before` captures. Capture JSON contains exact camera/render settings and simulation state. The comparison viewer is a separate review page and does not change the game HUD.

## Remaining weaknesses

Residential activity remains sparse because the preserved graph has few local destinations; this pass does not invent home interiors or routines. One evening station journey took 962.7 simulated seconds under the existing route/admission/wait budgets, although all completed. Future service-demand tuning should address that separately.

Some older side/rear walls and background kits still repeat, and broad backland asphalt/service surfaces remain apparent from the overview. Nighttime housing is intentionally quieter and can look dark. The Hero Street change is modest because its established frontage was preserved; the largest visual improvement is on the residential lane and backland office parcels. District identity does not make scenic premises fully simulated or add new distance LOD. Further work should refine these remaining rear/service edges and local destinations within the existing map, while preserving the validated circulation.
