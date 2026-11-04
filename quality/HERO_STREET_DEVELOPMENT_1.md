# Shinmachi-dori hero street — Development 1

This pass improves the actual commercial-street geometry and materials. Twenty existing main-street frontages receive local treatments; parcels, city layout, tower placement, simulation and station operation remain intact. The primary comparison is the existing Commercial Street preset 01, confirmed by the user as the reference.

## Locked reference

| Setting | Before and after |
| --- | --- |
| Eye, metres | `(4.7, 1.82, 43)` |
| Target | `(-1, 5, -25)` |
| Quaternion, XYZW | `(0.023261337608258003, 0.04179049953395925, -0.0009732171516890708, 0.9988551031905241)` |
| Vertical FOV / aspect | `60° / 16:9` |
| Seed / local time | `8412 / 20:30` |
| Surface / wetness | After Rain / `0.64` |
| Reflections / contact shading | Enabled / enabled |
| Capture / simulation clock | `1920 × 1080`, pixel ratio 1 / `300.000000000023` seconds |
| Exposure / night fog density | Existing `1.05 / 0.0035`, unchanged |

Choose **09 / Shinmachi Hero Street** in the location selector, or open `http://127.0.0.1:5173/?view=8&seed=8412`. The preset restores the original commercial camera, 20:30, damp surfaces and reflections. The URL supplies the reviewed seed; selecting a camera in a different seeded city does not regenerate that city. Existing preset indices and keyboard shortcuts are retained.

The right foreground is the existing AOZORA MART branch at `(6.5107, 39.3144)`, facing west. Opposite are the yakitori frontage near `(-6.3689, 36.4864)` and salon near `(-6.4232, 30.1790)`. The view follows the existing north–south road toward the elevated railway and fictional Akane/Tokyo-inspired tower at **(-7, -214)**. Pole positions, road dimensions and the tower's dimensions, coordinates and lighting are unchanged.

## Ranked visual audit and response

| Rank | Visible deficiency | Local correction |
| --- | --- | --- |
| 1 | Neighboring upper floors share the same window grid | Five frontage families: rendered masonry, ceramic tile, renovated office, brick shop house and residential balconies; different bay counts and window proportions |
| 2 | Continuous cream floor bands make independent buildings look like one kit | Material-specific slab edges, tile joints, brick/plaster piers, office spandrels and individual roof coping |
| 3 | Windows sit on the exterior wall as flat panels | Actual openings in the frontage skin, deep reveals and separately built frames/sills; glass front is about **0.368 m** behind the outer masonry face |
| 4 | Fascias and projecting signs repeat at identical heights | Different fascia widths, offsets, blade heights, brackets and selected vertical signs, using the existing measured Japanese sign atlas and business identities |
| 5 | Repeated candy-striped awnings and spherical red lanterns dominate the shop row | Restrained fabric or metal canopies with support rods, seams, smaller ribbed paper lanterns, noren and timber joinery |
| 6 | Generic shop rooms do not match their businesses | The visible salon has mirrors, hydraulic chairs, folded towels, products and reception; restaurants gain kitchen extraction and menu details |
| 7 | Convenience-store interior is uniformly bright and regularly stocked | Less luminous walls/ceiling, panel joints and ventilation, smaller notices, magazine display, checkout goods, stock gaps and varied packages; different water bottles, tea, coffee cans and juice cartons |
| 8 | Service equipment and occupation are distributed mechanically | Staggered condensers, grille faces, risers, pipe clips, meter covers, drainage, restrained rust marks, varied balcony rails/partitions and selectively placed laundry |
| 9 | Damp road reads as a nearly continuous reflective sheet | A spatially bounded main-street mask breaks up puddles, dries wheel paths and retains gutter pools; subtle flush utility repairs and sealed cuts add local surface history |
| 10 | Middle distance repeats the same facade grammar and the tower reads like a staged backdrop | Frontage variation continues into the existing middle distance. The tower itself is preserved; further distant base occlusion and lighting hierarchy are recommendations below |

## Implementation and scope

[HeroStreet.ts](../src/world/generation/HeroStreet.ts) owns the local frontage families, camera reference and road details. [NeighborhoodGenerator.ts](../src/world/generation/NeighborhoodGenerator.ts) selects only existing main-street parcels within `-49 ≤ z ≤ 48`, with `6 < abs(x) < 7.1`. Other districts keep their original kit.

[BuildingKit.ts](../src/world/generation/BuildingKit.ts) retains the original RNG draws, side elevations, parcel dimensions and roof generation while replacing the selected front elevations. Backing mass ends behind the new openings. This avoids moving later parcels as a side effect of adding detail. [ConvenienceStore.ts](../src/world/generation/ConvenienceStore.ts) still authors the single previously selected store branch. [StreetReflections.ts](../src/world/effects/StreetReflections.ts) blends its new response only over the reviewed road corridor.

Low props stay next to the buildings and outside doorway approaches. Road repairs rise only about **2 mm** above the existing asphalt, without adding navigation obstacles. Repeated details remain instanced through [CityBatch.ts](../src/world/generation/CityBatch.ts); semantic instance labels support geometry checks. No additional real lights, external assets, dependencies, character models or simulation behavior were introduced.

## Actual browser evidence

| Subject | Baseline | Final |
| --- | --- | --- |
| Locked commercial street, 20:30 | [Before](./captures/hero-street-before.png) | [After](./captures/hero-street-after.png) |
| Matching shop exterior close-up | [Before](./captures/hero-store-before.png) | [After](./captures/hero-store-after.png) |

Also inspected: [store detail](./captures/hero-store-details-after.png) and [daylight geometry diagnostic](./captures/hero-street-day.png). These are supplementary viewpoints, not substitutes for the locked primary comparison. [First street trial](./captures/hero-street-first.png) records the initial review before further refinements.

Every PNG is an actual WebGL canvas capture with a paired JSON file. No image retouching or generated concept art was used. Camera transform, FOV, clock, seed, weather, reflection controls, contact shading and capture dimensions match exactly in the primary pair. Moving people and vehicles differ: the initial live frames before review pause contain player avoidance and spawning, so a matching simulation clock alone does not reconstruct the complete original actor state. The measurements explicitly record that difference; these images are not pixel-identical actor replays. New captures sample decorative motion and grain at the simulation clock for subsequent repeatability.

Visual inspection led to additional revisions: varied balcony rails, rebalanced puddles, lower and lighter utility patches, corrected coffee-notice wrapping, clearer ceiling joints and distinct drinks categories. The primary camera was never repositioned to hide poles, actors or other deficiencies.

## Validation

[The browser review](../tools/hero-street-browser-checks.mjs) saves [raw measurements](./hero-street-measurements.json). It checks actual generated geometry against navigation and pedestrian body volumes, rather than relying only on obstacle metadata.

- **55/55 existing regression tests**, `npm.cmd run check` and `npm.cmd run build` pass on the final source. Editor diagnostics are clean. The existing 556.7 kB Three.js chunk advisory remains non-fatal.
- Original colliders, shop thresholds/destinations, shopfront contracts and lamp positions compare exactly with [the pre-edit contracts](./hero-street-contract-before.json). Building count remains **57**.
- **4,675** attributed frontage/road components, including **669** components within pedestrian height; finite, positively scaled instance matrices.
- **5,301** route samples using a 0.44 m wide body envelope: **0** new geometry intersections.
- **1,140,800** actual active-pedestrian body samples over the generated-world run: **0** intersections with the new components.
- **900 seconds** at 20:30 plus **600 seconds** draining service at 03:00: **6 arrivals/departures**, **11 boarded and delivered**, **36 alighted**, **53/53 station journeys completed**, **204 vehicle exits**. No wall hits, pedestrian/vehicle overlaps, gate conflicts, invalid passenger moves, unsafe threshold crossings, capacity violations or unsafe departures; no remaining station reservations/passengers.
- Dry and explicit reflection-off controls hide the reflector. All three existing GLB families load; **0** failed shader links.
- Final five-second paused-simulation render sample: **175.22 aggregate FPS**, **4.2 ms median**, **8.4 ms p95**, on the local RTX 5070 Ti at **1521 × 889**, pixel ratio 1. This is a local frame-interval observation, not isolated GPU timing or a before/after performance claim. Capture dimensions are separately fixed at 1080p.

To repeat the final review, reload the URL above, then run this in the development browser:

```js
window.__shinmachi.setReviewPaused(true);
await (await import('/tools/hero-street-browser-checks.mjs')).review();
window.__shinmachi.setReviewPaused(false);
```

The review refreshes final captures and measurements, preserving the pre-edit PNGs/contracts. Normal simulation stepping is resumed after validation.

## Remaining limits and tower recommendations

This remains a procedural, stylized environment. The added families repeat more subtly, upper glass uses simplified reflection/lit-pane materials, weathering is restrained, merchandise is simplified, and existing characters/vehicles remain conspicuously basic at close range. The store is still viewed through its existing exterior interaction contract; no new interior navigation or shopping behavior is added. Small geometry and Japanese lettering still show some aliasing at oblique angles.

The tower remains very prominent, with a conspicuously visible base and comparatively uniform luminous lattice. A later focused backdrop pass could partially obscure its feet with staggered distant rooftops, provide stronger intervening building layers, and distinguish illuminated decks from dimmer structural members. Preserve the current camera and tower coordinates when assessing that work; do not disguise the issue by narrowing the lens, moving the landmark or changing the global exposure. None of those recommendations expands this pass into new playable city areas.
