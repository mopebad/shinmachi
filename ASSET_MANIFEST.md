# Asset manifest

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
