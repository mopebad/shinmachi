# Signage and 青空マート continuation — 3 November 2026

## Handoff audit and preserved work

This continues the unfinished task after checkpoint `4e7afa3` (signage checkpoint), following `f9cf672` (people/contact shading/urban depth). The six project handoff documents, recent commits, full working diff, existing store and signage generators were inspected first.

The incoming working tree already contained the new sign catalog, measured layout/atlas modules, lower emission, identity corrections in the building kit, four store reference previews and eight paired `konbini-*-before` captures. Those were retained and completed. The committed signage tests still imported the removed square-slot helpers, and there was no authored convenience-store implementation yet. No reset, checkout, new project, dependency update or broader roadmap pass was performed.

## Delivered

- District signs are drawn and packed at their actual physical aspect ratios. Measured glyph ink bounds determine a uniform font size; text is never squeezed using canvas `maxWidth`. Vertical prolonged-vowel marks rotate appropriately. Square brand signs break as 青空 / マート, and paired food categories break at the separator.
- Two guttered, mipmapped sign pages share the existing business uniforms. Reusing earlier shelf gaps reduces the allocation from the unfinished refactor's two 4096-square pages to 4096×4096 plus 4096×2048. Ink contrast remains when a business closes; its backlighting follows the existing schedule. Night emission is bounded at 0.4.
- Ordinary storefront fascia, blade, interior and easel identities now agree. Narrow nightlife signs no longer pass through a 0.25 aspect clamp or canvas text compression. Flat sign faces replace textured six-sided boxes there; existing borders and mounting geometry remain.
- One existing main-street store is authored as **青空マート / AOZORA MART**, with a single amber rule and dark teal identity. The default-seed branch is at approximately **(6.51, 39.31)**, facing west; it is on the right side of the commercial street near the key-1 starting location. The original eight presets are retained.
- The branch has a 6.80 m frontage and a 6.1 m room within its original parcel: shallow fascia, slim separate glass panes, 1.55 m sliding-door framing/sensor/track, tiled threshold, party-wall service enclosure, ceiling panels/vent, restrained fluorescent fixtures, transparent drinks-case doors/handles/ventilation, capped bottles, stocked low gondolas, triangular wrapped onigiri, printed food/drink packs and shelf tickets.
- Checkout, POS/payment terminal, hot-food display, coffee machine/cups, parcel shelving, compact ATM, prepared-meal case, basket stack, sorting bins, entry mat and Japanese door/service notices make the interior identifiable from the pavement. The entrance approach stays at the existing doorway position. A first-floor condenser that crossed the fascia is omitted at this branch.
- No new real lights, runtime downloads, fonts, package dependencies or simulation rules were added. Geometry, packages and notices are original procedural content. Other convenience branches retain the existing simpler kit.

## Actual browser evidence

All images are actual 1920×1080 WebGL canvas captures with metadata. Before images belong to the previous session and are unchanged. The matching after views reconstruct their exact eye/quaternion/FOV and clock; moving agents differ.

| Subject | Before | After |
| --- | --- | --- |
| Store exterior, 20:30 | [Original](./captures/konbini-store-before.png) | [Completed](./captures/konbini-store-after.png) |
| Fascia close-up | [Original](./captures/konbini-sign-before.png) | [Measured lettering](./captures/konbini-sign-after.png) |
| Visible interior | [Original](./captures/konbini-interior-before.png) | [Stock, checkout and ATM](./captures/konbini-interior-after.png) |
| Vertical commercial signs | [Original](./captures/konbini-vertical-before.png) | [Identity and vertical typesetting](./captures/konbini-vertical-after.png) |
| Nightlife | [Original](./captures/konbini-nightlife-before.png) | [Actual-ratio signs](./captures/konbini-nightlife-after.png) |

Also reviewed: [store at noon](./captures/konbini-store-day-after.png), [store at 03:00](./captures/konbini-store-overnight-after.png), [commercial street](./captures/konbini-commercial-after.png), [station](./captures/konbini-station-after.png), [residential lane](./captures/konbini-residential-after.png) and [daylight district](./captures/konbini-day-after.png). [The first exterior trial](./captures/konbini-store-first.png) records the review before the side enclosure, proper square branding, service typography and varied stock were refined.

The final close-up shows distinct Japanese strokes and round letter proportions instead of the original faint, flattened ink. The interior has an open sightline to the refrigerator bank and a distinct checkout area; the former generic shelf and produce crates no longer define the branch. Existing street poles can occlude a sign from particular positions, and the close camera can crop physical window posters at the edge of the frame; these are scene occlusion/framing rather than clipped source text.

## Verification

- `npm.cmd run check`, `npm.cmd test` and `npm.cmd run build` pass; **24 tests**. Four signage regressions now exercise real layout/catalog functions, physical ratios, deduplication, gutter separation/UVs, bounds, vertical marks, identity and 24-hour scheduling. The prior simulation/audio/asset/visual tests remain.
- The real browser additionally checks **293 text runs** using actual system-font metrics, sign business attributes, finite instance matrices, all eight safe presets and zero failed shader links. All three original GLB families load without errors.
- A fresh generated-world run covers **600 simulated seconds, 18:30 → 23:00**: **0 wall hits, 0 unmarked-road samples, 0 sampled pedestrian/vehicle overlaps**, **114 vehicle exits**, maximum crossing duration **11.77 s**, still 57 buildings. Pedestrian overlap uses a 0.25 m radius; wall checks use 0.16 m. This is a sampled regression, not a general physics guarantee.
- At 03:00 the store's business state is 1, cafe state is 0.025 and the passing train is hidden. Dry and explicit reflection-off controls pass. Schedule checks explicitly refresh actor presentation at the chosen hour before inspection.
- [Raw results](./konbini-measurements.json) record the browser/GPU, texture allocations, exact frame sample and capture list. The browser is local headless Chrome 156 using ANGLE/D3D11 on the RTX 5070 Ti, at 1920×1080, ratio 1, damp reflections and contact shading on. See the raw file for the final frame numbers; these are local observations, not a low-end guarantee.

The final five-second sample contained 876 frames over 5001 ms: **175.16 aggregate FPS**, **4.2 ms median**, **8.4 ms p95**, **12.5 ms p99**, **12.6 ms worst**, with 504 sampled calls and 4,563,781 submitted triangles. The raw result, rather than the smoothed HUD, is the timing evidence.

### Texture allocation

- The two district sign pages require approximately **128 MiB RGBA including mipmaps**, up from approximately 42.7 MiB for the committed square atlas. In compensation, the same nightlife sign keys now use **9.28 million source pixels** versus an estimated **47.67 million** under the committed 768px/clamped-ratio policy. Combined sign source allocation is therefore lower by about 21.6 million pixels. This is an allocation estimate, not measured total GPU memory or isolated GPU timing. New product maps add four 256×320 sources.

The previous `konbini-perf-before` JSON is a screenshot/HUD snapshot, not a timed comparable Chrome benchmark. It cannot establish a frame-rate regression or improvement. The existing Vite advisory for the 556.7 kB Three.js chunk remains non-fatal.

## References, remaining work and blockers

[Reference notes and provenance](../references/stores/README.md) document the four inherited previews and the additional downloaded Lawson image. All five were visually inspected. They informed glazing proportions, shallow fascia, visible lighting/shelves and near-entry services; no photograph, real chain logo or third-party raster enters the runtime scene.

The requested signage/store pass is implemented and verified. Remaining fidelity limits are stylized/repeated packaging, clean surfaces, simplified glass reflections and static equipment. Door panels do not animate, purchases and ATM/parcel/coffee interactions are not simulated, and neither the player nor NPCs gain room access; existing visits still stop at thresholds. Other stores remain simpler. Very distant type remains limited by its on-screen pixel size. A dedicated bundled Japanese font and cross-platform typography testing are still absent; system Japanese fonts remain the project policy.

The integrated browser client reported unavailable, so review used a dedicated local headless Chrome profile and CDP. One additional 7-Eleven image host could not be reached even after the authorized network retry; the inherited 7-Eleven preview supplied that reference. These did not block implementation or actual screenshot inspection. No remaining implementation blocker was found. Broader characters, vehicles, railway, weather and roadmap work was intentionally left outside this task.

## Repeatability

Start the existing development task at `http://127.0.0.1:5173/`. With a dedicated Chrome page using `--headless=new --remote-debugging-port=9333`, a temporary profile **outside the project folder**, and this development URL, run:

```powershell
node tools/konbini-review.mjs --review
```

[The CDP helper](../tools/konbini-review.mjs) uses Node's built-in WebSocket; [the browser checks](../tools/konbini-browser-checks.mjs) run through Vite against the actual world. They refresh only the `*-after` images and measurement JSON. Keep the `*-before` images as the inherited comparison baseline. The browser tools and development capture endpoint are excluded from the production bundle.
