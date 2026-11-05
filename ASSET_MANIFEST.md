# Asset manifest

## Yoto After Dark / Nightlife 3A

The new venue, retaining/stair geometry, acoustic panels, fixtures, deck/speaker details, shaped bottle profile and tenant sign layouts are original project code, reusing existing shared materials and three GLB families. [Yoto research and rights](./quality/references/yoto/README.md) records reference-only photographs/maps and two newly redistributed recordings: “EDM Detection Mode” and “Backbay Lounge” by Kevin MacLeod (incompetech.com), CC BY 4.0. Original local MP3s, author-source URLs, hashes, byte sizes, licence and modifications are recorded in [provenance.json](./public/assets/music/provenance.json). [Music credits](./public/assets/music/CREDITS.html) are linked in the game. No external runtime service or new dependency is required. Historical no-recording statements below predate this milestone.

## Station Development 2

[StationNavigation.ts](./src/world/simulation/StationNavigation.ts), [StationTraffic.ts](./src/world/simulation/StationTraffic.ts) and [StationPose.ts](./src/world/simulation/StationPose.ts) add original traversal/reservation logic and procedural tread foot placement using the existing instanced character meshes. Station paving is represented by shared authored surfaces, including one small original apron joining the existing sidewalk. [The optional debug overlay](./src/world/simulation/StationNavigationDebug.ts) draws original lines, markers and state labels in development only. No downloaded asset, font, recording, new dependency or real light is introduced. [The handoff and actual scene evidence](./quality/STATION_DEVELOPMENT_2.md) record behavior and limits.

## Station Development 1

[StationLayout.ts](./src/world/generation/StationLayout.ts) and [StationDetails.ts](./src/world/generation/StationDetails.ts) add original station geometry, surfaces, supports, fixtures and local measured bilingual wayfinding using existing materials/system fonts and instanced batches. The [plan/section](./quality/station1-layout.svg) is generated from the same original spatial data. No downloaded station image, railway logo, font file, new real light or dependency is used at runtime.

[Station reference provenance](./references/station/README.md) records official Tokyu station maps/renewal material, entrance/platform photographs, source URLs, attribution, license status and inspection limits. Copyrighted local research copies stay outside production assets and carry no assumed redistribution license. An attempted Commons gate photograph was rate-limited and is not saved or represented as inspected.

## Signage/convenience-store continuation

[SignCatalog.ts](./src/world/generation/SignCatalog.ts), [SignLayout.ts](./src/world/generation/SignLayout.ts) and [SignTextures.ts](./src/world/generation/SignTextures.ts) replace the square sign atlas with original actual-aspect raster layouts and existing system Japanese fonts. [ConvenienceStore.ts](./src/world/generation/ConvenienceStore.ts) adds original instanced fixtures, rice-ball geometry, packaging illustrations/labels and fictional 青空マート branding. Four 256×320 product maps and two bounded sign pages are generated locally; no downloaded photograph, chain logo, font file or new dependency is used at runtime.

[Store reference provenance](./references/stores/README.md) distinguishes four inherited previews with unrecorded source rights from the newly downloaded Tokyu Livable Lawson reference. All are reference-only, with no claimed redistribution license. [The scoped handoff](./quality/KONBINI_REVIEW.md) records browser evidence and allocation limits.

## Original imported models

All three models below are authored from original project code. They contain no downloaded meshes, raster textures, redistributed font files, recordings or third-party branding. Units are metres, +Y is up. No separate third-party asset license is required; these are project-authored assets.

| Asset | Geometry and materials | Export size | Dimensions before runtime scale |
| --- | --- | ---: | --- |
| [Paper lantern](./public/assets/nightlife/paper-lantern.glb) | Ribbed lathed paper shell, bronze caps/handle, geometry-painted 山, tassel, inner diffuser; four materials. | 566,076 bytes | 0.462 × 0.980 × 0.462 m. |
| [AC condenser](./public/assets/nightlife/ac-condenser.glb) | Rounded enamel housing, curved fan blades, concentric grille/spokes, louver bank, feet, bolts and copper connections; four materials. | 234,988 bytes | 0.982 × 0.660 × 0.461 m. |
| [Twin wall lamp](./public/assets/nightlife/twin-street-lamp.glb) | Curved iron bracket, brass caps/cages, opal globes and warm diffusers; four materials. | 225,176 bytes | 1.096 × 0.968 × 0.778 m. |

The authored source is [build-nightlife-assets.mjs](./tools/build-nightlife-assets.mjs). Rebuild with `npm.cmd run assets:build`. The exporter reloads each GLB and validates finite geometry, material count and bounds. [metadata.json](./public/assets/nightlife/metadata.json) records actual export measurements and origin conventions. Standard GLB import in Blender supports later hand refinement; no Blender installation is required at runtime.

[NightlifeAssets.ts](./src/world/generation/NightlifeAssets.ts) loads these assets with GLTFLoader, merges their parts by material and instances their scene placements. Lanterns use a 0.66 runtime scale. Exported original models remain available separately from the runtime batching step.

## Original procedural content

- [NightlifeStreet.ts](./src/world/generation/NightlifeStreet.ts): authored facades, brackets, conduits, roof services, awnings, detailed interior furniture and fixtures, cables, threshold/collision data and practical lights.
- [NightlifeMaterials.ts](./src/world/generation/NightlifeMaterials.ts): original brick, plaster, tile, wood, metal, grille and cloth maps; Japanese theatre/business signs, menus, posters and notices. Textures use system Japanese fonts without distributing font files or fetching a font service.
- [SurfaceTextures.ts](./src/world/generation/SurfaceTextures.ts), [Materials.ts](./src/world/generation/Materials.ts): existing original district surface maps, glass and sign atlases.
- [StreetAtmosphere.ts](./src/world/effects/StreetAtmosphere.ts): locally drawn steam alpha texture and pooled shop silhouettes.
- Existing city, traffic, train, skyline and station geometry is original project source. [ASSETS.md](./ASSETS.md) retains the earlier provenance summary.
- [CitySoundscape.ts](./src/world/audio/CitySoundscape.ts): original procedural Web Audio. This pass adds no audio recording, commercial music or synthetic spoken announcement asset.

## References and dependencies

The three user-supplied files under [references/](./references/) are art-direction references and are not runtime assets. Their redistribution rights have not been independently established.

Three.js, including GLTFLoader, GLTFExporter and example geometry/utilities, is used under its MIT license. Dependency licenses remain in the installed packages. Vite and TypeScript are development dependencies. No new package dependency or external asset service is introduced by the model pipeline.

## Future asset intake

For a future imported third-party asset, record the exact source URL, author, license, attribution text, modifications, local file and runtime use before integration. Validate dimensions, normals, material count, animation and compressed texture support. Missing assets must be visible in load diagnostics and must not silently turn into a claimed completed system.

## Visual-review correction assets

[HumanGeometry.ts](./src/world/simulation/HumanGeometry.ts) adds original metre-scale lofted garment, head, hand, shoe and hair meshes; [HumanPresentation.ts](./src/world/simulation/HumanPresentation.ts) adds a local cloth weave/bump map and instanced clothing details. These are original procedural assets, not downloaded or scanned characters. They retain shared materials and geometry.

[SkylineLayout.ts](./src/world/generation/SkylineLayout.ts) and the backdrop add original background massing, facade/occupancy patterns and tower lattice detail. [ContactShading.ts](./src/world/effects/ContactShading.ts) uses Three.js GTAOPass under the existing Three.js MIT dependency license. No new external asset, recording, package dependency or font redistribution is introduced.
