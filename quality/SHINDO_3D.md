# Shindo 3D

Replaced the two-deck DJ setup with a front-operated single-deck selector, integrated amplifier, headphones and correctly sized LP storage. The oversized booth billboard is replaced by a 50 × 16 cm identity plaque and a small framed print. Smaller session posters, subdued print emission, warmer practical lighting and three distinct drinks refine the room without changing its footprint or circulation.

At the rear cabinet, look at Previous / Play-Pause / Next and press **E**, or click the actual buttons with the pointer released. Controls require a clear rendered sightline within 1.85 m and an open venue. They work with the HUD hidden using **H**. The existing music panel remains available for arbitrary track selection and folder refresh. [Music folder instructions](../public/assets/audio/nightlife/shindo/README.md). Personal files remain ignored by Git.

Validation: TypeScript check, all **92 tests**, and production build passed. Browser checks exercised real keyboard and mouse transport with the HUD hidden; obstruction, distance, closed hours, repeated keys and input focus correctly prevented unintended actions. Ten local tracks loaded; pause stopped the platter and meters, next/previous worked, and the existing stereo speaker/room mix remained functional. Actual movement down the stairs, across the room and back outside passed 66 rendered floor/headroom samples. City colliders, doors and station contracts match the baseline; no shader or asset errors.

[Gallery](./SHINDO_3D_REVIEW.html): four matched before/after pairs and eleven final WebGL views, plus the actual interaction screenshot and silent playback recording. Comparison conditions match: 21:00, seed 8412, damp pavement, reflections, simulation second 300, camera and FOV. Music playback remains live. The overview measured 522 draw calls / 2.753 million triangles at 1323 × 804, DPR 1; median composite render 1.6 ms, p95 2.0 ms (30 synchronous renders with `gl.finish`, CPU + GPU wall time, not GPU-only).

Remaining limits: stylized procedural fittings, simple room acoustics, and folder refresh remains in the compact fallback panel. The existing Three.js chunk-size warning remains.
