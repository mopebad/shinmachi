# Visual review — ranked discrepancies and corrective pass

> Latest scoped delivery: [Station Development 1](./quality/STATION_DEVELOPMENT_1.md) replaces disconnected station decoration with a continuous street-to-platform layout. Actual entrance, concourse, gates, stairs/rests, platform and structural exterior captures were inspected; the [plan/section](./quality/station1-layout.svg) documents connectivity. Review corrections included a ticket-area tree conflict, intermediate stair rests and low hanging platform signs. Passenger AI and boarding remain pending. Historical visual rankings below are preserved.

> Subsequent scoped work: [Japanese signage and the 青空マート branch](./quality/KONBINI_REVIEW.md) continues the unfinished `4e7afa3` working state. It addresses sign distortion/contrast and one store, with actual before/after close-ups, day/overnight views, 24 passing tests and new measurements. The historical ranking and earlier pass evidence below remain intact.

## Evidence and ranking method

This review starts from fresh actual 1920 × 1080 browser renders at seed 8412 and 21:00: [street](./quality/captures/review2-street-before.png), [tower](./quality/captures/review2-tower-before.png), [railway](./quality/captures/review2-rail-before.png), [overview](./quality/captures/review2-overview-before.png) and [commercial street](./quality/captures/review2-commercial-before.png). The actual [nightlife](./references/01-neon-street.png), [tower](./references/02-tokyo-tower.png) and [crossing](./references/03-rail-crossing.png) reference photographs were inspected again. This is an assessment of visible gaps, not a list of earlier completed features.

Scores are 1–5. Higher immersion impact (I), street-level visibility (V), feasibility in this pass (F) and affordability (A) raise priority. Priority = 0.4I + 0.3V + 0.2F + 0.1A. Cost descriptions are estimates until measured; affordability 4 means low cost, 3 moderate, 1 high. Ties favor street visibility. This deliberately distinguishes a large reference mismatch from a feasible visual improvement.

| Rank | Remaining discrepancy and screenshot evidence | I | V | F | Estimated cost / A | Priority |
| ---: | --- | ---: | ---: | ---: | --- | ---: |
| 1 | **Pedestrian anatomy, clothing and joint presentation.** In the street and commercial captures, oversized round heads, egg torsos, mitten hands and separated-looking limb forms dominate the foreground. Reference A/C show ordinary clothed adults and stronger individual silhouettes. | 5 | 5 | 4 | Low–moderate / 4 | 4.7 |
| 2 | **Weak contact lighting and material depth.** Broad pale trim, awning undersides, wall-mounted services and feet lack local occlusion. Surfaces read evenly lit even where geometry overlaps. A/C contain much stronger grounding and recessed shadows. | 5 | 5 | 4 | Moderate / 3 | 4.6 |
| 3 | **Wall-like skyline, sparse middle distance and repeated window occupancy.** The railway/overview captures expose repeated rectangular slabs, isolated white-square windows and a wide empty tower approach. B has varied massing, layered occupied buildings and a landmark embedded in a metropolis. | 5 | 4 | 4 | Low–moderate / 4 | 4.4 |
| 4 | **Primitive vehicle bodies and glazing.** Street traffic visibly consists of upright box cabins, flat opaque glass and simplified wheel/body junctions. A/B/C use recognisable urban vehicles whose proportions and reflected surroundings give scale. | 4 | 5 | 3 | Low–moderate / 4 | 4.1 |
| 5 | **Repeated nearby architecture and frontage rhythm.** The improved alley still repeats regular wood/glass bays and shelf-like trims; the ordinary commercial buildings repeat floor bands and window modules. A's different construction eras, setbacks and service alterations are less orderly. | 4 | 5 | 3 | Moderate / 3 | 4.0 |
| 6 | **Insufficient material wear and wet-surface variation.** Pavement, trim, awnings and paint are too clean and uniformly colored. Reflections remain one planar approximation; the photographs show dirty edge zones, scuffed markings and roughness-dependent broken highlights. | 4 | 4 | 4 | Low / 4 | 4.0 |
| 7 | **Sign and light hierarchy still too uniform.** Several ordinary signs remain low-resolution or distorted, and the hero blades repeat immaculate rectangular borders. A has accumulated sign formats, mounting depths and selective bright focal points. | 3 | 5 | 4 | Low / 4 | 3.9 |
| 8 | **Reference C's ground-level crossing is absent.** The latest railway image looks up at a viaduct. It cannot reproduce the train across the viewer's eye line, foreground gates, red warnings and waiting people in C. This is a major spatial/operational gap, even though its implementation feasibility is low in a bounded visual pass. | 5 | 5 | 1 | High / 1 | 3.8 |
| 9 | **Atmosphere and environmental complexity lack intermediate layers.** The street has a small exhaust plume and neat cable bundles, but less lit haze, varied wall services, foliage/urban edge detail and depth through the middle distance than A/B. Blanket fog or random clutter would not solve it. | 4 | 4 | 3 | Moderate / 3 | 3.7 |
| 10 | **Train glazing/interiors and stainless body transitions.** The rail capture exposes nearly identical flat passenger illustrations and simple bright window panels. C's silver body, green stripe, dark bogies, dimensional openings, glass reflections and varied interior occlusion remain stronger. The elevated structure also hides much of the body from the available preset. | 4 | 3 | 3 | Moderate / 3 | 3.4 |

## Selected corrections

1. Replace the visible pedestrian presentation with anatomically proportioned heads and tailored, tapered clothing forms; retain the deterministic agents, routes and schedules. Verify close/middle-distance silhouettes, joint connections, foot placement and the GPU batch budget.
2. Trial restrained half-resolution contact occlusion with transparent surfaces, sky and the reflection plane excluded from the depth pass. Compare exact on/off captures; reject broad halos, darkened lights or excessive frame cost. This does not replace true shadowed local lighting.
3. Replace the distant repeated slab pattern with varied middle/distant building families, organized room/floor occupancy, roof/setback variation and multiple urban layers. Extend detail into the nightlife sightline, not only the tower skyline, and preserve roads, navigation and all camera transforms.

The missing crossing will remain clearly documented. No warning hardware will be placed beneath the unrelated elevated line and presented as a functional crossing.

## Verification results

### 1 — People: visible improvement, not photoreal character production

[Before](./quality/captures/review2-street-before.png) → [after](./quality/captures/review2-people-after.png).

The old head was approximately 0.24 m wide × 0.33 m high before actor scaling. The new jaw/cheek/nose mesh is 0.16 × 0.23 m, with a fitted irregular hairline and ears. Tailored shoulders/waist, tapered trousers and sleeves, palms, shoes, skirts, collars and bags replace the egg-and-capsule outline. Cloth uses shared weave/bump material; skin and hair have separate roughness. Joints use yaw-before-pitch transforms and connected positions. Feet now follow asphalt/raised pavement, with a planted stance and continuous marked-curb approaches.

The actual browser captures show smaller heads and recognisable garment silhouettes at street scale; the previous round-headed toy outline is substantially reduced. They still look like authored low-detail characters, especially close to the camera. Faces, hair diversity and fully rigged animation remain below the photographs. No photoreal character claim is made.

Validation: metre/proportion and finite-geometry tests, exact walking-segment tests, curb-height continuity, an 88-person render-pool stress check with zero capacity/NaN errors, and actual moving/standing people in the running street. The existing simulation, routes and schedules remain authoritative.

### 2 — Contact depth: restrained, measurable and switchable

[Disabled](./quality/captures/review2-fixture-off.png) → [enabled](./quality/captures/review2-fixture-on.png). This close study looks across the alley at a condenser, wall services and ledges. Both images use the same framing and lighting; a separate synchronous GPU-buffer comparison held geometry/pose and grain timing fixed.

The first trial was too subtle. The accepted half-resolution GTAO uses a 0.8 m radius, 0.9 m depth thickness, twelve samples, denoising and a 0.55 blend. The comparison shows darker recesses behind the condenser and brackets, under ledges and between wall services. The controlled region's mean RGB brightness (arithmetic channel mean) changed from 28.83 to 26.98 on an 8-bit scale, with about 21.3% of pixels darkening by more than three levels. This measures local occlusion, not a change in exposure.

Transparent glazing, steam, sky, ground-contact sprites and the planar reflector are excluded from its depth render; their prior visibility is restored afterward. Unit tests cover that restoration. The effect improves contact but does not implement shadowed point lights, ray-traced rough reflections or volumetric light transport. `?ao=0` disables it, and development inspection can call `setContactShading(false)`.

Inspection also exposed condensers mounted through a balcony slab; those mounts now sit above the slab instead. The current asset placements remain outside pedestrian circulation.

### 3 — Urban layers and massing: more convincing depth, still procedural

[Tower before](./quality/captures/review2-tower-before.png) → [tower after](./quality/captures/review2-tower-after.png); [overview before](./quality/captures/review2-overview-before.png) → [overview after](./quality/captures/review2-overview-after.png).

The repeated slab background is replaced by 77 protected background parcels across four depth layers and five massing families: stepped towers, framed glass shafts, offset volumes, slabs and crowned buildings. Occupancy groups rooms/floors instead of independent bright squares, with warm/neutral/cool channels, blinds, side elevations and rooftop equipment. A cross-street layer now appears beyond the nightlife lane. Ordinary taller office buildings also gain two-floor setbacks inside their existing footprints, preserving the number of layout RNG draws. The existing tower gains finer intermediate lattice members within its original silhouette.

The tower is now framed by taller/differently occupied buildings instead of isolated white checkerboards, and the overview reveals multiple roof/height profiles. The nearby camera and street layout are retained. This is still a compact fictional district: buildings remain less individually authored than Reference B, the landmark is not a surveyed Tokyo Tower reconstruction, and skyline detail remains procedural.

Validation: deterministic parcel tests, five-family/height variation, exclusion of playable space, the road corridor and tower foundations, unchanged safe camera starts, and actual tower/overview/nightlife captures. The background adds no navigation or collision obstacles.

## Preservation and performance checks

- All **20 tests** pass; TypeScript and production build pass. Vite retains the existing non-fatal vendor chunk-size advisory.
- A fresh generated-world run covered 600 simulated seconds, 18:30 → 23:00: zero pedestrian wall hits, zero unmarked-road steps, zero sampled pedestrian/vehicle overlaps using a 0.25 m pedestrian radius, and 117 vehicle exits.
- All eight presets start outside collision envelopes. Render pools support 88 people without overflow or non-finite matrices. All three GLB families load and all reviewed shader programs link.
- Daylight local practicals switch off; overnight steam closes and the train hides at 03:00. Dry/damp and explicit reflection controls still work. Existing audio logic and its four mix regressions are retained.
- Actual regression captures include [commercial](./quality/captures/review2-commercial-after.png), [station](./quality/captures/review2-station-after.png), [residential](./quality/captures/review2-residential-after.png), [daylight](./quality/captures/review2-day-after.png) and [passing elevated train](./quality/captures/review2-rail-after.png). The unchanged illustrated train windows and missing ground crossing remain visible limitations.

At 1920 × 1080, pixel ratio 1, wet reflections on and 21:00 with active agents, the available RTX 5070 Ti / Electron browser produced these five-second samples after warm-up:

| State | Aggregate FPS | Median / p95 / p99 interval | Sampled calls / triangles |
| --- | ---: | --- | --- |
| Before this correction | 239.55 | 4.2 / 4.3 / 4.3 ms | 318 / 1,935,857 |
| New people/massing, contact off | 239.35 | 4.2 / 4.3 / 4.3 ms | 316 / 2,974,917 |
| All corrections, contact on | 236.75 | 4.2 / 4.3 / 8.3 ms | 461 / 4,453,819 |

The browser is largely refresh-capped here. Similar median FPS does **not** mean free GPU work. Contact shading added approximately 145 draw calls and 1.48 million submitted triangles in the on/off samples. GPU timer-query trials (eight samples/state, no disjoint result) measured median full-composer GPU time of 2.89 ms off and 3.14 ms on; the small samples ranged 2.30–4.37 ms and 2.87–3.58 ms respectively. These are local observations, not universal cost guarantees. The actor count/culling can vary slightly between live samples, and clock changes can trigger an extra cached-shadow refresh in screenshot metadata.

Raw observations are retained in [the review measurements](./quality/review2-measurements.json). The off switch preserves a cheaper rendering path for machines where the added pass is unsuitable.

## Validation limits and remaining discrepancies

- Other GPUs, mobile browsers, Firefox/Safari and long-duration GPU thermal behavior were not tested. The GPU timing trial is small, and individual people-versus-massing GPU costs were not isolated.
- ANGLE emitted a non-fatal potentially-uninitialized-variable warning while compiling the upstream GTAO shader. The program linked and rendered; zero failed shader links were found. Cross-driver behavior remains unverified.
- The Reference C ground crossing cannot be validated because it is still not implemented. The elevated route was checked as an elevated route, including passing/service behavior.
- Ambient occlusion is a screen-space approximation: off-screen occluders, true area-light shadowing and fine transparent-object shadows are not represented. The before/after images show local grounding, not physically complete lighting.
- Dynamic crowd poses differ between general street captures; only the dedicated synchronous contact-shading pixel check held pose and timing identical. No image was painted over or substituted with a reference photograph.
- The first three ranked gaps are mitigated, not eliminated. Character realism, nearby facade variety, vehicles, material wear, signage/atmosphere, train interiors and the ground crossing still need further production work. The review has not reclassified those as completed systems.
