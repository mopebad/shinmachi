# Shindo asset quality 1B

[Three matching comparisons and two close-up pairs](./SHINDO_ASSET_1B_REVIEW.html). Actual game captures, 1920 × 1080, seed 8412, 21:00, simulation clock 300 s. Camera position, quaternion, lens, weather, reflections, contact shading and rendering conditions match in all five pairs.

Replaced the turntable, amplifier, both monitors, 25 shelf bottles, three served drinks, clean glassware and two bar-tool sets. Blender source edits correct stylus contact and add mechanical fittings. The original record rotation and meters still follow the actual audio. Walnut and leather now use local albedo/normal/roughness sets. Two small warm speaker accents reveal the recessed drivers. Room structure, furniture layout, controls, music library and collision contracts remain intact.

Assets: Innerscene CC0 hi-fi; Poly Haven CC0 bottles, walnut and leather; original Blender barware. [Full sources, licenses and visual references](../public/assets/shindo/CREDITS.md), [source provenance and hashes](../assets-source/shindo/provenance.json), [editable sources](../assets-source/shindo/README.md). Runtime models and textures total about **6.1 MB**. No new dependencies or runtime network services. Models are consolidated by material and repeated bottles/gear are instanced; microtexture maps use 512px and labels/surface sets use 1K.

Validation:

- `npm.cmd run check`, **94 tests**, and `npm.cmd run build` pass. Existing Three.js chunk-size advisory remains.
- Actual walking controller descends, reaches the rear/lounge and returns to the street: **66 rendered support/headroom samples**, unchanged colliders, doors and station. No shader or WebGL errors.
- All **12 GLB types / 37 placements** loaded; finite geometry, support gaps within 3 mm and clearance from room bounds passed. The playing record sits 1 mm above the mat to prevent z-fighting.
- Ten-track local library: next, previous, refresh, pause, mute recovery, playback-driven animation/meters, stereo speaker output, room reflections and street/room attenuation pass. Actual **E** play/next and mouse previous pass. User recordings are not included in captures or new asset commits.
- Final speaker-view composite at 1323 × 804 DPR 1: **372 calls, 2.699 M submitted triangles; median 1.6 ms / p95 2.1 ms** over 30 synchronized renders. Baseline: 369 calls, 2.674 M triangles; median 2.0 ms / p95 2.6 ms. Timing varies; this is no performance-speedup claim.
- Listening-station frame intervals: **239.75 fps**, p95 **4.3 ms**, 1259 × 801 DPR 1 on RTX 5070 Ti over four seconds. Desktop measurement only; mobile performance is unverified.

Remaining limits: real-time screen-space glass refraction and cloudy ice cores approximate optical depth; no caustics or liquid physics. Cabinet and room geometry remain the existing kit. Equipment controls remain the established game transport, with static decorative source/volume knobs.

Git checkpoint before replacement: `86d5b76` (preserves the pre-existing working tree).
