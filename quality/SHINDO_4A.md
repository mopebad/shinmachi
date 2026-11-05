# Shindo 4A — interior atmosphere

[Six interactive before/after pairs](SHINDO_4A_REVIEW.html), captured directly from WebGL.

The existing room, staircase and hi-fi arrangement are preserved. Licensed turntable,
amplifier, speakers, stools, bottles and thick-walled drink models remain in use.
The clearest improvement is the lounge: rounded, individually upholstered seat/back
pads with piping replace slab cushions. The counter gains eased edges and a recessed
brass nose; the staff side gains inset cabinet doors, returned pulls, refrigerator
vents and an actual basin beneath a curved mixer. A cutout in the lower work surface
exposes the basin, including its drain, rather than covering it with shelf geometry.

Paired timber battens, rounded cassette frames, mounting rails/caps, duct flanges
and access covers make the existing architectural fittings more legible. Subtle
plaster variation stays local to Shindo. Three bounded shelf washes replace the
single strong backbar hotspot; satin backing panels and quieter luminous strips
retain contrast with the listening corner. No exposure, bloom or renderer changes.

Purposeful activity details include an oshibori beside the highball, a small otsumami
serving, a folded service towel, a draining mat under the shaker/jigger, water service
on the lounge table and selected sleeves with a velvet record brush beside the deck.
The serving bowl was moved away from the jigger after actual WebGL inspection.

Twelve reusable original GLBs and editable Blender sources are registered in the
[existing catalog](../src/world/authoring/catalog.json) and placed through the
[existing scene](../src/world/authoring/scenes/shindo.json). No dependencies or
management systems were added. Fixed furniture fits the previous footprint; only
visual fittings are replaced after the complete authored scene loads. Legacy visual
fallbacks and their lighting remain available.

Validation:

- `npm.cmd run check`, `npm.cmd test` (**101/101**) and `npm.cmd run build` passed.
- [Six matched pairs](shindo4a-validation.json): 1920 × 1080, DPR 1, seed 8412,
  21:00, simulation second 300; identical camera/lens, weather, reflections, contact
  shading, exposure, fog and deterministic effect timing. Playback title can differ;
  live audio was tested separately. Every required view was visually inspected.
- [Actual walking](shindo4a-spatial-check.json): 66 rendered floor/headroom samples
  along street → stairs → rear room → lounge → street. City colliders, doors and
  station data equal baseline; no asset or shader errors. Additional vertex checks
  verify upholstery footprints, service-aisle clearance and duct headroom. A rendered
  downward ray confirms the basin aperture.
- [Live audio](shindo4a-audio-check.json): ten local tracks, next/previous, refresh,
  pause across mute/unmute, platter/meter motion, both speaker gains, room reflections
  and street isolation. [Physical E-key Next](shindo4a-interaction-check.json) passed.
- [Actual editor save/reload](shindo4a-editor-check.json): guest towel Z adjusted to
  −34.35 m through the inspector, saved with Save scene, reloaded from disk and
  verified after full page reload. New scene data continues to use existing guards.

Limits: no staff/NPC work was added; desktop WebGL was evaluated, mobile was not.
Additional geometry/material batches have a rendering cost; no controlled performance
speedup is claimed. The existing Three.js production chunk-size advisory remains.
