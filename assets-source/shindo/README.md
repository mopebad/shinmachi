# Shindo editable sources

Original Innerscene GLBs, Poly Haven glTF plus textures, and packed Blender 4.5 editing scenes. See [runtime credits](../../public/assets/shindo/CREDITS.md) for sources, CC0 licenses, modifications and visual references.

From the repository root: `blender --background --python tools/build-shindo-assets.py`. This imports the untouched source models, corrects the turntable mechanism, consolidates materials, authors small barware and exports local runtime GLBs. Original packed Blender scenes retain full source texture detail; runtime exports reduce microtexture maps to 512px and preserve 1K labels. Sources are not copied into the production build.
