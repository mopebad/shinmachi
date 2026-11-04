# Skyline Development 1A

The existing playable district is preserved. This pass changes the distant Akane/Tokyo Tower-inspired landmark and its surrounding scenery, using actual world-space geometry. Background streets and buildings do not register destinations, traffic, passengers or pedestrian routes.

## Existing scene and selected geography

The previous tower stood at **(-7, -214)**, with a **24 m** square base, no rotation and a highest beacon point of approximately **90.28 m**. The hero camera was only **257.27 m** away. Its clear base and approximately **19.38°** vertical angular span made it look like a small structure placed at the end of the street. The old independent background seed generated four spaced northern rows plus two eastern rows, leaving bare ground elsewhere. Broad window grids, repetitive silhouettes and large gaps weakened depth even though five nominal massing families already existed.

The final landmark stands at **(-32, -1050)**, rotated **16.2°**, with a **95 m** splayed-leg base, **333 m** antenna tip, main deck at **150 m** and upper deck at **250 m**. A conservative **134 × 134 m** axis-aligned precinct reserves all rotated foundation geometry. The actual paving square is 104 m wide, with a compact base/service structure. The hero camera is **1,093.62 m** away; the unobscured geometric angular height is **16.94°**. Buildings obscure the lower structure naturally. The coordinates remain identical for every camera, time and simulation frame.

This is coherent fictional geography, not a reconstruction of Shiba Park. [JNTO's tower description](https://www.japan.travel/en/spot/1709/) establishes the reference height/deck relationships, and [Minato's sightline study](https://visit-minato-city.tokyo/en/articles/487) demonstrates framed and interrupted landmark views. Three reusable photographs were automatically collected and visually inspected; [attributions, licences, geographic context and access limitations](./references/skyline/README.md) are retained with the files. No reference photograph is used as a game texture or billboard.

## Rendered city and atmosphere

[SkylineLayout](../src/world/generation/SkylineLayout.ts) establishes common blocks, visual streets and exclusions before choosing parcels. Commercial height clusters lie around the western and northeastern arterials, with smaller residential/mixed-use lots toward the south/east. Building identities come from a separate seed derived from the unchanged city seed 8412; this does not consume the simulation's random stream.

Seven families distinguish postwar offices, tiled apartments, curtain-wall offices, mixed-use buildings, stepped residential buildings, commercial towers and utility offices. They vary floor heights, bay widths, materials, setbacks, balcony partitions, glazing, roof plants, water tanks, service cores and antennas. Window occupancy follows floor/suite groups, with separate office/residential evening schedules. All four elevations are modeled. Actual instanced glass/window planes replace thick boxes for distant facade detail.

The existing near-field architecture is untouched. Background detail uses three fixed spatial bands: finer facades and utilities closest to the district, simpler middle-distance blocks, then grouped window/roof silhouettes beyond 650 m. Instancing and frustum culling apply; there is no camera-facing facade or camera-dependent landmark transform. This is spatial detail reduction, not continuous camera-distance mesh swapping.

The existing straight railway receives a simplified visual continuation from its rendered ends to x = ±360 m in the reserved corridor. This follows the current train alignment and adds no route, platform, line or operating logic. Surrounding lots and visual streets respect the railway, existing playable envelope and landmark precinct. The roads beyond the playable area remain scenery only.

[CityBackdrop](../src/world/generation/CityBackdrop.ts) supplies painted red/orange steel, pale upper bands, open cross-bracing, two separate glazed decks, central service core, antenna and restrained beacons. Warm nighttime emission follows simulation hour and is reduced after midnight; no new point/spot lights or glow postprocess were added. This is an emissive approximation of [structural floodlighting](https://www.tokyotower.co.jp/lightup/), rather than a reproduction of individual real-world fixtures or special illumination events.

The street's existing fog, weather, exposure and lighting remain unchanged. Backdrop materials use a separate kilometre-scale exponential aerial-perspective response; otherwise the old street fog would erase a physically distant tower. The camera far plane increases from 650 to 2,200 m and the sky sphere from radius 600 to 2,100 m. Position, orientation and FOV remain fixed. Facade depth bias prevents kilometre-distance overlays from fighting their backing walls.

## Before/after WebGL evidence

Open the [paired comparison viewer](./SKYLINE_REVIEW.html) through the local development server to switch between the eight views. It displays the original PNG files side by side without retouching or compositing them.

All pairs use seed **8412**, simulation clock **300 s**, **1920 × 1080** output, pixel ratio **1**, After Rain wetness **0.64**, reflections and contact shading enabled. Night is **20:30**, day is **13:00**. Exposure, existing near fog, decorative grain/atmosphere time, camera position, quaternion and FOV match per pair. The city actors also replay to identical positions.

| View | Before | After |
| --- | --- | --- |
| Hero Street, night | [Before](./captures/skyline-hero-night-before.png) | [After](./captures/skyline-hero-night-after.png) |
| Hero Street, day | [Before](./captures/skyline-hero-day-before.png) | [After](./captures/skyline-hero-day-after.png) |
| Tower Avenue, night | [Before](./captures/skyline-tower-night-before.png) | [After](./captures/skyline-tower-night-after.png) |
| Tower Avenue, day | [Before](./captures/skyline-tower-day-before.png) | [After](./captures/skyline-tower-day-after.png) |
| Railway approach, night | [Before](./captures/skyline-railway-night-before.png) | [After](./captures/skyline-railway-night-after.png) |
| District overview, night | [Before](./captures/skyline-overview-night-before.png) | [After](./captures/skyline-overview-night-after.png) |
| District overview, day | [Before](./captures/skyline-overview-day-before.png) | [After](./captures/skyline-overview-day-after.png) |
| West sidewalk, natural occlusion | [Before](./captures/skyline-occlusion-night-before.png) | [After](./captures/skyline-occlusion-night-after.png) |

The original presets are preserved, including Tower Avenue's pre-existing target; it was not retargeted to compensate for the new landmark. Hero eye **[4.7, 1.82, 43]**, target **[-1, 5, -25]**, FOV **60°**. Additional west-side eye **[-4.6, 1.82, -16]**, target **[-10, 12, -200]**, FOV **58°**. Each image has adjacent JSON metadata. The west-side comparison includes the same nearby pedestrian, as well as the architectural occlusion; no actors were removed to stage a clean view.

The first implementation is retained in `skyline-*-first` captures. Inspection led to a westward/farther tower position because the shop sign hid too much of the first trial, biased facade overlays to remove depth flicker, better balcony partitions/material differentiation, visual rail continuity, and smaller lots near the railway so rejected oversized parcels no longer created an empty strip. Parcel-overlap tests also caught rotated lots that fitted the outer block but overlapped their neighbors; generation now rejects those overlaps with clearance.

Reproduce using [skyline browser checks](../tools/skyline-browser-checks.mjs): load `http://127.0.0.1:5173/?view=8&seed=8412&review=1`, import the helper, then call `captureSet('after')` and `validate()`. The helper replays the actual city to clock 300; source edits and builds reload Vite, so finish those before capturing. Resume live simulation afterward with `window.__shinmachi.setReviewPaused(false)`.

## Validation and measured cost

`npm.cmd run check`, `npm.cmd test` and `npm.cmd run build` pass. **71/71 tests** include three new skyline tests covering five seeds, parcel overlap/exclusions, actual rendered instance bounds, finite positive transforms, geometry budgets, fixed landmark dimensions and time-driven illumination. The earlier visual-layout test now validates the relocated tower's shared precinct and seven families instead of its obsolete foundation coordinates. All existing pedestrian, business, vehicle, audio, station, door, passenger capacity, obstruction recovery and deterministic replay tests remain passing. The existing Three.js bundle-size advisory remains non-fatal.

The [browser spatial/replay audit](./skyline-validation.json) found:

| Measurement | Final result |
| --- | ---: |
| Background buildings | 376: 119 closest, 168 middle, 89 far |
| Visual street segments / building families | 25 / 7 |
| Total instanced scenery parts | 85,009 |
| Building parts tested against actual district colliders | 81,449 |
| Background triangles / instanced batches | 250,664 / 25 |
| Building intersections with existing district colliders | 0 |
| Shader link errors / missing assets | 0 / 0 |
| Matched before/after camera/render condition sets | 8/8 |
| Unchanged collider, player collider, door, shopfront, lamp, station and district-stat contracts | 7/7 |
| Identical pedestrian/vehicle position snapshots at clock 300 | Yes |

The [original baseline](./skyline-before-measurements.json) and [final scene measurement](./skyline-after-measurements.json) contain complete raw capture/contract data. Matching 1323 × 804 composite renders at pixel ratio 1 report **1,110 → 1,121 draw calls** and **5,002,933 → 4,726,705 triangles**, including the existing reflection/contact/postprocessing passes. This is approximately **5.5% fewer submitted triangles**, despite much broader visible city coverage. The count is for the complete compositor, not just unique world geometry.

Timing varied substantially during the host session: the initial separate synchronous samples were median **6.2 ms before** and **9.8 ms after**. To check this, the exact former backdrop and layout were loaded temporarily from commit `37d8733`, then alternated with the new backdrop in the **same paused live city**, same actors, same framing and same rendering target. The old far plane and sky radius were restored for its runs; temporary source snapshots were removed afterward. [All four controlled rounds](./skyline-ab-performance.json) are retained:

| Same-session sample | Before | After |
| --- | ---: | ---: |
| Synchronous composite median, 30 measured renders after 8 warmups | 9.1–9.4 ms | 9.1–9.5 ms |
| Paused-render frame rate, two 2-second windows at 1323 × 777 | 58.2–59.9 FPS | 56.8–60.2 FPS |
| Frame interval p95 | 29.2 ms | 29.2–29.3 ms |
| Worst observed frame interval in those windows | 29.3 ms | 41.7 ms |

These samples show comparable rendering cost on this host, not a demonstrated speedup or a guarantee of stable 60 FPS. The `gl.finish` measurements include CPU submission and GPU completion and are **not isolated GPU timings**. The separately saved [five-second running-city sample](./skyline-frame-timing.json) measured **56.3 aggregate FPS**, median **20.8 ms**, p95 **29.2 ms**, worst **33.4 ms**, at 1323 × 777 on the reviewed RTX 5070 Ti/Electron host. [Twelve actual whole-composer GPU timer queries](./skyline-gpu-cost.json), using `EXT_disjoint_timer_query_webgl2`, reported median **10.36 ms**, range **1.84–18.39 ms**, with no disjoint samples. That variability is retained rather than presenting the fastest sample as the frame budget.

No new runtime textures, texture downloads, point/spot lights, simulation actors, audio sources or postprocessing passes are introduced. Geometry is instanced, distant windows use flat planes and fewer samples, and scenery never casts into the playable district's cached shadow map. Further performance work should target better spatial chunk culling and profile the existing compositor on quieter and lower-tier hosts before raising background density again.

## Remaining weaknesses and next improvements

The added city is scenery, with no functional secondary-road traffic, shops, interiors or navigation. Distant window groups and simplified rooflines still reveal procedural construction at zoomed-in or aerial inspection distances. The preserved playable-district perimeter remains more regular than a fully authored Tokyo block; small visual setbacks and railway service areas remain visible in the overview.

The tower is intentionally less exposed from some presets. Street furniture can still overlap the decks, and the fixed overview crops its upper structure because its original framing is unchanged. Fine distant lattice members can shimmer at low resolution. The landmark lighting approximates illuminated structure with emission, rather than lighting every girder physically. The selected warm 17:30-to-midnight programme is fictional; it does not fetch a live lighting calendar.

Useful next steps are authored mid-distance facade sets for the most exposed parcels, small grounded service-yard/vegetation details, and a dedicated antialiasing/LOD study for distant lattice and windows. These should retain the protected spatial contracts and avoid expanding the playable district.
