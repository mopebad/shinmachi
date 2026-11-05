# Shindo asset sources

Shindo 4C adds six project-original fitted assemblies: `entry-portal`,
`acoustic-entry`, `landing-return`, `stair-dado`, `stair-downlight` and
`entry-threshold`. Their packed editable Blender sources are retained alongside
the 4A fittings. Export with `blender --background --python tools/build-shindo-entry.py`;
existing sources remain authoritative unless `-- --from-design` is supplied.
The existing CC0 walnut finish is assigned through the local catalog. No additional
third-party models, textures or dependencies were introduced.

Shindo 4A adds twelve **project-original** Blender models: solid counter, service worktop,
service cabinet fronts, inset basin/mixer, piped banquette cushions, folded oshibori,
rubber draining mat, otsumami bowl, ceramic water carafe, selected records/brush,
framed acoustic cassette and duct joint/access cover. No third-party geometry was
used for these additions. Their named walnut/leather slots reuse the existing CC0
Poly Haven finishes below through the local asset catalog.

Packed editable sources: `assets-source/shindo/*-editable.blend`. Re-export with
`blender --background --python tools/build-shindo-atmosphere.py`; existing Blender
sources remain authoritative. `-- --from-design` deliberately recreates those twelve
sources from their original design recipes. Dimensions and byte counts are in
[atmosphere-geometry.json](atmosphere-geometry.json).

Licenses checked against the linked publisher pages on 2026-11-05. All imported models and textures below are **CC0 1.0**; modification, commercial use and redistribution are permitted. Runtime files are local. Powered by Poly Haven (asset discovery/download API).

| Runtime asset | Creator and original source | Changes |
|---|---|---|
| turntable.glb | Innerscene, [Direct Spin](https://www.innerscene.com/tools/library/3d-parts/direct-spin-dj-turntable-ae143e16) | Blender material consolidation; corrected S arm and stylus contact; added counterweight, bearing, cartridge, cue lever; original silkscreen added in game. 454 mm wide, 365 mm deep. |
| amplifier.glb | Innerscene, [Two Channel](https://www.innerscene.com/tools/library/3d-parts/two-channel-stereo-amplifier-251d0295) | Blender consolidation; satin finish; original control legends; actual playback meters fitted to display. 434 mm wide. |
| speaker.glb | Innerscene, [Studio Two](https://www.innerscene.com/tools/library/3d-parts/studio-two-bookshelf-speaker-41658b0e) | Blender paper-cone finish; adapted into 451 × 737 × 391 mm monitors to fit existing stands; Poly Haven walnut. |
| bottle-0.glb through bottle-3.glb | Poly Haven, [Wine Bottles 01](https://polyhaven.com/a/wine_bottles_01) | Four individual bottle exports; ground-centred origins; 512px surface maps, 1K labels, JPEG quality 82. Existing shelf arrangement retained. |
| black_walnut_veneer_01-*.jpg | Jenelle van Heerden / Poly Haven, [Black Walnut Veneer 01](https://polyhaven.com/a/black_walnut_veneer_01) | Local 1K albedo, OpenGL normal and roughness; JPEG quality 85; metre-scaled grain and restrained tint. |
| brown_leather-*.jpg | Rob Tuytel / Poly Haven, [Brown Leather](https://polyhaven.com/a/brown_leather) | Local 1K albedo, OpenGL normal and roughness; JPEG quality 85; retained burgundy upholstery tint. |
| rocks.glb, highball.glb, water-glass.glb, empty-glass.glb, bar-tools.glb | Original Shinmachi work | Blender-authored thick glass walls, rolled rims, cut rocks-glass heel, meniscus, softened ice, three-piece cobbler shaker and hollow double jigger. No third-party geometry. |

[Poly Haven license](https://polyhaven.com/license) · [Innerscene library terms](https://www.innerscene.com/tools/library/terms) · [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

Visual references only: [Technics SL-1200GR2](https://us.technics.com/products/direct-drive-turntable-system-ii-sl-1200gr2), [Luxman L-505Z](https://www.luxman.com/product/detail.php?id=49), [JBL L82 Classic](https://global.jbl.com/JBLL82CLASSICORGAM.html). No manufacturer photographs, trademarks or product models are redistributed.

Editable Blender scenes and original downloaded GLBs/glTF are retained in [assets-source/shindo](../../../assets-source/shindo/). Rebuild using Blender 4.5 with `blender --background --python tools/build-shindo-assets.py` from the repository root. The existing unrelated street-prop pipeline remains `npm run assets:build`.
