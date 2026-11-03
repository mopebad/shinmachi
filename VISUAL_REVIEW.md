# Visual review — ranked discrepancies and corrective pass

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

Implementation, before/after observations, measurements and outstanding validation will be recorded here after the running application has been checked.
