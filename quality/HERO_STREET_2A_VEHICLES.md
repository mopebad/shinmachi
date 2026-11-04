# Hero Street 2A: original vehicle families

The five primitive vehicle bodies have been replaced by fourteen original traffic archetypes, including a taxi variant. Work vans, hatchbacks, commuter sedans, a hybrid and an MPV make up most traffic; executive saloons, an estate, a crossover and a low enthusiast coupe appear occasionally. All geometry, names, plates and delivery graphics are authored in the project. No manufacturer logos, downloaded vehicle models or reference photographs are shipped.

## Actual reference view and evidence

[Night before](./captures/vehicles-hero-before.png) / [night after](./captures/vehicles-hero-after.png), and [day before](./captures/vehicles-hero-day-before.png) / [day after](./captures/vehicles-hero-day-after.png), are actual 1920 × 1080 WebGL captures. The original baseline files are retained. Camera position `[4.7, 1.82, 43]`, target `[-1, 5, -25]`, FOV 60°, seed 8412 and simulation clock 300 seconds match. The principal comparison uses 20:30, After Rain, wetness 0.64, reflections and contact shading. Day diagnostics use 13:00. Exposure, fog, grain time and atmosphere time also match in the paired metadata.

The same street, convenience store and Tokyo Tower coordinates are retained. Vehicle selection deliberately changes the roster and its seeded random consumption, so the old and new actor arrangements are not pixel-identical. The new roster itself replays deterministically.

Every close-up follows an actual, naturally spawned vehicle. The review waits for a clear approach and chooses either side of the road to avoid foreground pedestrians; it never changes a vehicle's kind, position or speed to stage a capture. Day/night pairs share the same actor, camera and simulation tick. Each PNG has a JSON containing all active vehicle identities, spawn serials, positions, velocities, braking states and routes.

| Archetype | Day close-up | Night close-up |
| --- | --- | --- |
| Kei work van | [Day](./captures/vehicle-kei-day.png) | [Night](./captures/vehicle-kei-night.png) |
| Delivery van | [Day](./captures/vehicle-van-day.png) | [Night](./captures/vehicle-van-night.png) |
| Compact hatchback | [Day](./captures/vehicle-compact-day.png) | [Night](./captures/vehicle-compact-night.png) |
| Commuter sedan | [Day](./captures/vehicle-commuter-day.png) | [Night](./captures/vehicle-commuter-night.png) |
| Service taxi | [Day](./captures/vehicle-taxi-day.png) | [Night](./captures/vehicle-taxi-night.png) |
| Light delivery truck | [Day](./captures/vehicle-truck-day.png) | [Night](./captures/vehicle-truck-night.png) |
| Family MPV | [Day](./captures/vehicle-mpv-day.png) | [Night](./captures/vehicle-mpv-night.png) |
| Hybrid liftback | [Day](./captures/vehicle-hybrid-day.png) | [Night](./captures/vehicle-hybrid-night.png) |
| Sporting executive sedan | [Day](./captures/vehicle-executive-day.png) | [Night](./captures/vehicle-executive-night.png) |
| Modern executive sedan | [Day](./captures/vehicle-modern-day.png) | [Night](./captures/vehicle-modern-night.png) |
| Formal luxury sedan | [Day](./captures/vehicle-luxury-day.png) | [Night](./captures/vehicle-luxury-night.png) |
| Luxury estate | [Day](./captures/vehicle-wagon-day.png) | [Night](./captures/vehicle-wagon-night.png) |
| Urban crossover | [Day](./captures/vehicle-crossover-day.png) | [Night](./captures/vehicle-crossover-night.png) |
| Enthusiast coupe | [Day](./captures/vehicle-coupe-day.png) | [Night](./captures/vehicle-coupe-night.png) |

Additional actual traffic evidence: [mixed hero traffic](./captures/vehicles-hero-mixed.png), [red queues](./captures/vehicles-traffic-red-queue.png), [pedestrian phase](./captures/vehicles-traffic-crossing-clearance.png), [left-turn traffic](./captures/vehicles-traffic-turning.png).

## Reference research and design choices

Official design descriptions, dimension drawings and photographs informed class proportions and construction details. These are reference studies, not claims that the fictional vehicles are those products or scale reproductions of them.

- BMW [3 Series design history](https://www.bmwgroup.com/en/news/general/2025/50-years-BMW-3-series.html) and [5 Series dimensions](https://www.bmw.co.uk/en/all-models/5-series/saloon/bmw-5-series-saloon-technical-data.html): long bonnet, cabin behind the front axle, pronounced shoulders and a low sporting stance. Rhein uses its own grille apertures, segmented lamps and proportions.
- Audi [A4 dimensions](https://www.audi.com/en/publications/dimensions/dimensions-a4-1391), [A6 design](https://www.audi.com/en/the-audi-a6-until-2025-the-car-of-many-talents-in-the-business-class-10240/design-10256) and [A6 estate reference](https://www.audi-mediacenter.com/system/production/uploaded_files/12659/file/d1e4a709211d732b8a72ebf75291ce12e7d49b88/en_AMC_Presse-Info_A6_Avant.pdf?disposition=attachment): restrained surfaces, a flatter rear pillar, broad low grille and an extended estate roof. Elbe uses a chamfered opening and original lamp/bar arrangement; Feld adds clearance, arch trim and a taller cabin.
- Mercedes [E-Class design](https://www.mercedes-benz.com.my/passengercars/brand/news/the-new-e-class.html) and [dimensions](https://www.mercedes-benz.ie/services/manuals/e-class-saloon-2023-02-w214-mbux/vehicle-data/vehicle-dimensions/): formal three-box proportions and a long wheelbase. Linden has its own horizontal grille bars, three-element lamps and ten-spoke wheels. C/E classes informed the general executive-sedan category, not a copied body.
- Toyota [Crown sedan sketches](https://global.toyota/en/mobility/toyota-brand/toyota-design/crown/sedan/), [Prius](https://pressroom.toyota.com/vehicle/2023-toyota-prius/), [Alphard](https://global.toyota/en/newsroom/toyota/39287317.html) and [HiAce specifications](https://www.toyota.com.kw/static/pdfs/hiace_v4_2026.pdf): distinguish a conventional sedan, a low aerodynamic liftback, a tall passenger cabin and a narrow working cargo body. These informed Hikari, Nagi, Sora and Shiro respectively.
- Nissan [Skyline heritage](https://www.nissan-global.com/EN/HERITAGE_COLLECTION/skyline_gt-r_1999.html), [Serena design](https://www.nissan-global.com/EN/INNOVATION/DESIGN/DESIGNWORKS/NEW-SERENA/) and [NV200 design](https://www.nissan.com.sg/vehicles/new/nv200/design.html): low coupe stance, upright MPV glazing and utilitarian van packaging. Akebono has a short two-door cabin, a small wing, paired rear lamps and bronze wheels; no racing livery or badges were used.
- Honda [Fit](https://global.honda/en/newsroom/news/2020/4200213eng-fit.html) and [Stepwgn](https://global.honda/jp/news/2022/4220526-stepwgn.html): compact hatch packaging versus a long, high passenger compartment. Minato's short bonnet and Sora's sliding-door rail separate these categories.
- Suzuki [Every dimensional sheet](https://www.suzuki.co.jp/car/every/detail/pdf/detail.pdf) and Daihatsu [Hijet design reference](https://www.daihatsu.com/news/2021/20211220-2.html): narrow upright bodies, small steel wheels, short front overhangs and practical divided bumpers. Koma combines those class cues with its own body and face. The larger Shiro has opaque cargo panels; Machi has a separate corrugated aluminium box, door hinges and latch bars.

## Geometry and population

[VehicleCatalog](../src/world/simulation/VehicleCatalog.ts) supplies both presentation and authoritative collision dimensions. Measurements below are metres. Overall width includes mirrors; body width is separate. Taxi height includes the roof sign. None is a manufacturer specification.

| Kind / original name | Length | Body width | Overall width | Height | Wheelbase | Nominal weight |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| kei / Koma K | 3.38 | 1.47 | 1.69 | 1.87 | 2.43 | 18 |
| van / Shiro Cargo | 4.68 | 1.70 | 1.98 | 1.99 | 2.58 | 15 |
| compact / Minato H | 3.98 | 1.69 | 1.95 | 1.53 | 2.50 | 18 |
| commuter / Hikari S | 4.57 | 1.75 | 2.01 | 1.46 | 2.68 | 11 |
| taxi / Hikari Service | 4.57 | 1.75 | 2.01 | 1.63 | 2.68 | 8 |
| truck / Machi Box | 4.86 | 1.83 | 2.09 | 2.59 | 2.62 | 10 |
| mpv / Sora M | 4.77 | 1.77 | 2.03 | 1.88 | 2.86 | 6 |
| hybrid / Nagi E | 4.56 | 1.77 | 2.03 | 1.44 | 2.72 | 6 |
| executive / Rhein 48 | 4.82 | 1.83 | 2.09 | 1.45 | 2.85 | 2 |
| modern / Elbe A | 4.86 | 1.85 | 2.11 | 1.43 | 2.88 | 2 |
| luxury / Linden L | 4.94 | 1.87 | 2.13 | 1.48 | 2.95 | 1 |
| wagon / Elbe Touring | 4.83 | 1.85 | 2.11 | 1.53 | 2.83 | 1 |
| crossover / Feld C | 4.58 | 1.86 | 2.12 | 1.66 | 2.74 | 1 |
| coupe / Akebono R | 4.48 | 1.81 | 2.05 | 1.34 | 2.65 | 1 |

[VehicleGeometry](../src/world/simulation/VehicleGeometry.ts) builds curved shoulders and bonnets, actual wheel openings, swept fender lips, bowed windshields, window frames, recessed glazing, mirrors, door shut lines, handles, wipers, bumpers, grilles and lamp assemblies. Tires, barrels, steel wheel holes, alloy spokes and wheel bolts are separate from body geometry. The three work bodies have different lengths, cabin proportions, cargo treatment and wheelbases. The hatch, liftback, sedan, estate, crossover and coupe retain different roof lengths, rakes and heights.

Paint has clearcoat; glass, rubber, trim, cargo aluminium and chrome have separate roughness/metalness. Original local canvas graphics provide delivery markings and yellow/white/green plate variants. Three rim finishes accompany family paint palettes. Simple seats and a driver silhouette sit inside the glazing. Bodies sit at Y −0.018 over the existing base asphalt at Y −0.020.

[VehiclePresentation](../src/world/simulation/VehiclePresentation.ts) merges geometry by material/family and instances it. A lower-detail version is used beyond 45 metres, with the same dimensions and silhouette contracts. The complete near vehicle, including four wheels, is 15,850–20,636 triangles; far models are 8,558–10,880. Instance bounds are refitted for camera culling. Moving cars receive static scenery shadows and use live contact shading, GTAO and reflections; they do not cast into the city's cached sun-shadow map, which would leave stale shadows. Wheel rotation uses authoritative route distance; front steering reads route curvature. Braking controls rear lamp intensity, left turns control indicators, and indicator phase uses simulation clock. Headlight beam power was reduced to retain body detail in short night queues.

[CitySimulation](../src/world/simulation/CitySimulation.ts) retains its fixed 30 Hz movement, lane routes, left-hand traffic, signals, crossing interlocks, population targets and vehicle cap. One seeded appearance draw replaces uniform selection. Nominal weights total 100: work 43, commuter 41, service 8, premium 7, enthusiast 1. Premium occupancy is limited to one when fewer than fourteen vehicles are active, otherwise two. Selection avoids the nearest incoming leader's family and avoids an active identical kind/paint/rim combination. Actual proportions vary with these constraints and trip lifetimes.

## Validation and measured cost

[Browser measurements](./vehicle-measurements.json) record 34 final captures, both camera comparisons, all family observations, live body/wheel/brake-light consistency, model budgets and a generated-world regression. Street colliders, shop doors, shopfront contracts, lamp positions and building count match the pre-vehicle street contract.

The generated-world run advances 900 seconds at 20:30, then 600 seconds at 03:00 to exercise closure. Results:

- 45,000 fixed ticks, 351,471 vehicle samples and 110,385 nearby vehicle pair tests.
- 204 vehicle exits, 62 completed left turns and 207 observed spawn identities. Nine premium and three coupe spawns; everyday work/commuter traffic dominates.
- Zero footprint overlaps, red entries, stop-line violations, lane deviations, premium-cap violations or identical active appearances.
- Six train arrivals/departures, 10 actual boardings, 36 alightings, 10 delivered riders and 52/52 completed station journeys. No invalid passenger positions, unsafe crossings/departures, capacity or gate conflicts, pedestrian/vehicle overlaps, stranded passengers or retained reservations. Minimum elevated passenger separation was 0.5606 m.
- Zero reported browser errors, failed shader links or asset errors. Close-ups were visually inspected; refinements corrected rippled hull normals, bright glazing, flat fascia, floating tail lamps, sill trim crossing arches, cargo panel identity and obscured review cameras.

The [before timing](./vehicles-before-measurements.json) and final synchronous timing use thirty composite renders with explicit `gl.finish`, eight warmups, clock 300 and a 1521 × 889 viewport. Before: median 6.8 ms / p95 8.8 ms, 882 draw calls / 4.780 M triangles. After: median 8.5 ms / p95 11.5 ms, 1,160 calls / 5.078 M triangles. Detail therefore has a measurable rendering cost. These are synchronous composite timings, not FPS or isolated GPU execution. The baseline tab was hidden and the final tab visible, so this comparison is indicative rather than a controlled GPU benchmark.

A separate [visible-tab frame sample](./vehicle-frame-timing.json), at the same final clock and viewport, records 586 frames over 5.001 seconds: 117.2 aggregate fps, 8.3 ms median, 12.5 ms p95 and 12.6 ms worst interval. Hardware: NVIDIA GeForce RTX 5070 Ti through ANGLE/D3D11, Chromium 150 / Electron 43. No comparable pre-edit rAF sample exists. This desktop result does not establish mobile performance.

Validation commands completed successfully: `npm.cmd run check`, `npm.cmd test` (59/59), `npm.cmd run build`. Four focused automated tests cover every family's actual vertex bounds including steered wheels at both detail levels, real wheel cut-outs, 10,000 deterministic constrained selections, and complete roster replay at 144 Hz versus 30 Hz. Existing traffic, station, boarding, train, signage and audio tests remain in the suite.

## Reproduction and limits

Start the existing Vite development server and load `http://127.0.0.1:5173/?view=8&seed=8412&review=1`. The development-only `review=1` option pauses simulation before its first animation tick. In the browser console:

```js
const result = await (await import('/tools/vehicle-browser-checks.mjs')).review();
window.__shinmachi.setReviewPaused(false);
```

[The review helper](../tools/vehicle-browser-checks.mjs) preserves baseline files, checks paired conditions, advances the actual simulation until all families are photographed, validates generated-world traffic/station behavior and saves final measurements. Reload before replaying. The normal URL without `review=1` runs immediately. For frame timing, keep the tab visible and call `window.__shinmachi.measurePerformance(5)` separately after the capture run.

These remain stylized procedural vehicles, not photographic automotive assets. Curved shells and glazing improve their street silhouettes, but close-ups still have simplified pillar transitions, interiors and surface detailing. Glass uses alpha blending rather than refractive multilayer automotive glass; occupants are static silhouettes. Night readability depends on actual street lighting and paint colour. No suspension simulation, vehicle entry, right turns, additional routes or new city systems were added. More detailed authored meshes and textured panel wear would be a future quality step, with further performance measurements required.
