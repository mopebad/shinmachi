# Shindo editable sources

The 4C street/stair/public-exit assemblies use `tools/build-shindo-entry.py` with
the same existing-source-first workflow. The acoustic leaf is held open against
the east wall; it is the public threshold back to the street, not a service door.

For the 4A fitted joinery, upholstery and service props, run
`blender --background --python tools/build-shindo-atmosphere.py`. This exports the
existing twelve editable Blender scenes without overwriting manual geometry edits.
Use `-- --from-design` only to regenerate those sources. Named material slots receive
the shared licensed walnut/leather finishes from the existing asset catalog at runtime.
All 4A geometry is project-original. Placements, assemblies, light settings and small
prop edit envelopes live in the existing Shindo scene/catalog; gameplay reservations
remain authoritative.

Original Innerscene GLBs, Poly Haven glTF plus textures, and packed Blender 4.5 editing scenes. See [runtime credits](../../public/assets/shindo/CREDITS.md) for sources, CC0 licenses, modifications and visual references.

From the repository root: `blender --background --python tools/build-shindo-assets.py`. This imports the untouched source models, corrects the turntable mechanism, consolidates materials, authors small barware and exports local runtime GLBs. Original packed Blender scenes retain full source texture detail; runtime exports reduce microtexture maps to 512px and preserve 1K labels. Sources are not copied into the production build.
