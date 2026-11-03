# Visual targets

## Signage and convenience-store target

The completed bounded continuation is reviewed in [KONBINI_REVIEW.md](./quality/KONBINI_REVIEW.md). [Five inspected reference images](./references/stores/README.md) inform a shallow fascia, slim glazing, a visible stocked room and near-entry services while retaining fictional 青空マート branding. [The store exterior](./quality/captures/konbini-store-after.png), [interior](./quality/captures/konbini-interior-after.png), [fascia](./quality/captures/konbini-sign-after.png) and [vertical signs](./quality/captures/konbini-vertical-after.png) are the acceptance evidence. Physical dimensions drive text texture ratios; measured glyph bounds fit inside safe margins without stretching. The branch remains exterior-only under the existing simulation contract.

## Reference analysis

All three actual supplied PNGs were inspected. Their filenames differ from the JPG names in the brief.

| Reference | Visual characteristics | Delivery boundary |
| --- | --- | --- |
| [A: nightlife](./references/01-neon-street.png) | Human-height narrow lane; irregular grey facades; dominant red/amber vertical theatre marquee; smaller overlapping signs; wall lamps; cables; source-lit steam; wet ground; people at several depths. | Primary production Pass 1 target. |
| [B: tower](./references/02-tokyo-tower.png) | Long metropolitan sightline; varied building heights; orange lattice landmark; luminous street-level detail; foreground railway; atmospheric depth. | Existing tower view retained; broader metropolitan improvement belongs to Pass 6. |
| [C: crossing](./references/03-rail-crossing.png) | Green-striped silver train; lit passengers; red warning lamps; black/yellow gates; overhead power; waiting pedestrians at ground level. | Pending a real at-grade route and coordinated crossing state machine in Pass 4. |

The references are artistic direction, not photographs bundled into the rendered environment. The scene should suggest accumulated construction, differing businesses and a working district rather than uniformly luminous modular boxes.

## Fixed review views

Source transforms and FOV are exported in [CityWorld.ts](./src/world/CityWorld.ts). A–G are review identifiers, not keyboard numbers.

| ID | Subject | Preset / key | Status |
| --- | --- | --- | --- |
| A | Yoto nightlife street | 7 / 8 | Primary acceptance view; eye (-18.8, 1.82, -25), target (16, 3.8, -25), FOV 58°. |
| B | Akane tower avenue | 5 / 6 | Existing composition and regression view. |
| C | Ground-level crossing | None | Not implemented; do not substitute the elevated line. |
| D | Lantern alley | 1 / 2 | Original viewpoint retained, now viewing the authored street layer. |
| E | Residential lane | 4 / 5 | Quiet-district regression view. |
| F | Station square | 2 / 3 | Existing station exterior and platform detail. |
| G | District overview | 3 / 4 | Spatial continuity, density and performance check. |

Commercial street (key 1) and the explicitly labelled elevated railway approach (key 7) remain additional review viewpoints.

## Pass 1 art direction

- Give the red/amber theatre blade the strongest warm focal role. Smaller signs should create a sequence into depth; darker upper floors should frame them.
- Distinguish plaster, brick, dark tile, weathered wood, metal and fabric. Avoid bright pale trim repeating on every floor.
- Give each selected interior a furniture plan: ramen counter/kitchen, izakaya/bar shelves, cafe tables/cups, theatre ticket foyer/posters, karaoke entrance stairs/directory.
- Use rich original lantern, condenser and wall-lamp models at human scale. Their brackets and service pipes should explain how they attach to the facade.
- Route bundled cables between plausible supports, with safe overhead clearance. Keep doors and circulation corridors free of cables and props.
- Confine steam to kitchen exhausts. It should rise, expand, drift and fade, with a restrained warm/cool tint matching nearby light.
- Keep asphalt rough and vary reflection opacity. Leave dry/damp gaps between highlights. Wetness should not produce a uniform mirror.
- Preserve readable sign lettering and lantern ribs under bloom. Keep background windows subordinate to local businesses.
- Keep the existing simulation functional. A beauty capture is insufficient if agent routes become obstructed.

## Review cycle

1. Capture the same 1920 × 1080 camera at seed 8412 and 21:00.
2. Compare full-resolution and reduced-size images against Reference A.
3. List the three to five strongest discrepancies.
4. Refine those specific problems, then recapture.
5. Run simulation and other-view checks; record measured cost and remaining gaps.

The baseline and delivered images are [before](./quality/captures/nightlife-before.png) and [after](./quality/captures/nightlife-pass1-final.png). [QUALITY_REPORT.md](./QUALITY_REPORT.md) records the actual review findings. [quality/README.md](./quality/README.md) documents repeatable capture and performance commands.

## Acceptance and remaining production bar

Pass 1 must make an obvious change in the rendered street: a coherent focal sign, more varied foreground architecture, richer mounted props and clearer shop depth. It should preserve eye-level scale, safe paths and lighting/time controls.

This first pass is not photographic character production or a completed metropolis. Character fidelity, empty/regular background facades, finer texture aging, sophisticated crowd avoidance and authored far-city transitions remain visible gaps to address in later passes.
