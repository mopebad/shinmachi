# Workflow 2 — verified handoff

Working pilots: representative Shindo equipment, speakers, three licensed stools, barware assemblies and four local lights; two Yoto facade modules, reused lanterns/fixtures, material variations and local lights. Existing generation/collisions remain authoritative. No new dependencies. [Use the workflow](../AUTHORING.md) · [View comparisons](WORKFLOW_2_REVIEW.html) · [Asset credits](../public/assets/workflow2/CREDITS.md).

Saved through the actual editor and confirmed after disk reload and full page reload: speaker X 16.455 m / yaw 22.5°, stool X 18.23 m, service assembly scale 1.02, music light 2.35; Yoto lantern X −1.467 m / yaw 1°, local light 0.15. Positions are deliberately small adjustments inside the existing physical envelopes. Speaker spatial audio follows the edited transform. [Persistence evidence](workflow2-full-reload.json).

Validation completed:

- `npm.cmd run check`, `npm.cmd test` (**99/99**) and `npm.cmd run build` passed. A final focused authoring run also passed after adding prefab-child parent ordering coverage. Build retains the existing Three.js chunk-size advisory.
- [Actual mouse gizmo drag](workflow2-gizmo-check.json) changed serialized position; Undo restored it with 27 Shindo material batches and no duplicates. Inspector rotation, scale and light edits saved to disk.
- [Write API guards](workflow2-api-guards.json) reject unknown files, stale revisions, fixed-object edits, out-of-bounds moves, foreign origins and non-JSON writes. Production omits the editor module and development middleware.
- [Runtime/walking check](workflow2-runtime.json): 66 support/headroom samples on the real street → stairs → rear room → lounge → street route. Collider, business-door and station data equal baseline. Eleven cached GLB sources; no loading/shader errors or visible fallback duplicates.
- [Yoto placement check](workflow2-placement-check.json): both generated parcel origins match, 27 rendered sidewalk/door-approach ray checks pass, all five Shindo furniture/speaker reservations pass precise vertex bounds.
- [Live audio](workflow2-audio-check.json): 10 tracks, next/previous, refresh continuity, pause across mute/unmute, moving record, level meters, both speaker gains, room reflections, street isolation and audible PCM. [E-key interaction](workflow2-interaction-check.json) passed.
- [Four matching pairs](workflow2-comparisons.json) retain exact camera/lens/seed/time/weather/render conditions and identical train, rail passenger, station passenger, pedestrian, vehicle and driver snapshots. Actual WebGL images were visually inspected.
- Blender 4.5.3 rebuilt all three runtime GLBs from packed editable sources, retaining measured bounds and byte budgets. Runtime exports total 2.29 MB.

Measured on RTX 5070 Ti / Electron Chrome 150, 1259 × 597 at pixel ratio 1, the authored Yoto detail view averaged **143.65 fps**, median **8.3 ms**, p95 **8.4 ms** over 3 s. [Raw sampling](workflow2-after-performance.json). The explicit legacy fallback measured 152.84 fps with the same median/p95; it includes isolated fallback batches, so it is not the original renderer baseline.

At the standardized 1323 × 804 synchronous render sample, the authored view uses **716 calls / 4.219 M triangles**, versus the original baseline **663 / 4.283 M**. The final warm sample measured **5.0 ms median / 5.8 ms p95** CPU+GPU composite wall time. Historical baseline timing was 8.3 / 11.5 ms, but browser foreground state and scheduling differed; this is not a controlled speedup claim. Draw calls increased 8%; further material consolidation is a useful follow-up. No new rendering effect was introduced.

Verified limits: facade doors/windows/signs remain inside the editable GLB modules; the editor does not separately manipulate those parts. Collision-bearing objects have tight edit bounds; changing room or parcel layout still requires authoritative geometry edits. Undo is local to the current editor scene; switching scenes reloads disk. Character fidelity, broad district conversion, mobile profiling and a full asset browser are outside this pilot. The retained legacy presentations and Git tag `checkpoint-workflow2` provide rollback paths.
