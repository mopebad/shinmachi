# Shinmachi: photographic realism plan

## Reference and intent

The supplied photographs establish a contemporary Tokyo night: ordinary grey buildings, a stainless commuter train with a green stripe and bright interiors, overlapping overhead infrastructure, red signal accents, an orange lattice tower beyond a deep commercial street, and people at pedestrian scale. The district remains fictional. Realism comes from consistent scale, material response, believable construction and light, and coherent simulation.

## Execution order

1. **Composition and depth.** Add a distant layered skyline and an original orange lattice broadcast tower. Author a railway approach and a compressed tower avenue view, retain the five exploration locations, and default to evening. Keep skyline geometry outside the playable district.
2. **Railway construction.** Replace the simple passing train with a detailed, illuminated stainless commuter set: door seams, recessed windows, passengers, roof equipment, bogies, destination displays and pantographs. Add catenary insulators, tension wires, service walks and structural detail to the existing elevated line. Crossing barriers require an actual at-grade route and traffic interlocks, so they belong in a later dedicated milestone.
3. **Surfaces and architecture.** Use deterministic local colour, height and roughness maps for weathered concrete, grout, aggregate, wood and road repairs. Align all texture channels in world space. Improve facade depth, occupancy variation and sign typography without distributing external assets.
4. **Light and lens.** Balance cool night ambience against warm shops and neutral train interiors, keep bright whites and small red signals, reduce uniform facade emission, and add subtle photographic grain/vignette. Use a narrower camera for the distant avenue; keep normal exploration wide enough to navigate.
5. **Damp streets.** Offer dry and after-rain surfaces. Render bounded planar reflections with irregular broken highlights rather than a uniform mirror. Keep daylight, business hours, simulation and audio functional. Rainfall and weather audio are separate future work.
6. **Exploration interface.** Keep the scene dominant. Add scene/time presets, weather and reflection controls, adjustable field of view, and an unobstructed photo view. Keep existing keyboard movement, location shortcuts and accessible inputs.
7. **Review.** Run type checking, simulation regressions and production build; inspect night/day, both new compositions, dry/damp states and all existing locations in the browser. Check reflection behavior and local rendering cost. Document actual evidence and remaining limits.

## Acceptance criteria

- The distant orange landmark reads as a lattice structure and anchors a dense street perspective.
- The train reads as a green-striped silver commuter train even in a still image; lit windows have visible interior variation.
- Dark foregrounds, shop light and hazy background architecture form distinct layers.
- Damp surfaces produce selective, broken reflections with no reflective walls or sidewalks.
- Existing traffic and pedestrian safety regressions pass; added scenery does not enter navigation corridors.
- No runtime image/font/network dependencies are introduced. Repeated detail uses merged or instanced geometry; reflection resolution and real light counts are bounded.

## Limits and next production steps

This remains a real-time procedural WebGL scene. True photographic characters, scan-quality architectural assets, physically complete train interiors, natural recorded street sound, and an operational at-grade crossing require a larger authored asset and simulation phase. Do not describe the current implementation as a reconstruction or a finished photorealistic environment.

## Execution and review results

The seven implementation steps above are complete for this pass. Station improvements and the reported loud traffic sound were included during execution.

- Type checking, all 12 regression tests and the production build passed. Vite retains its existing non-fatal Three.js vendor-size advisory.
- Browser review covered the tower avenue, station, passing train, daylight and evening. All seven preset camera positions were checked against the generated collision envelopes; none started inside an obstacle.
- A fresh simulation using the actual generated district ran for 600 seconds through a morning/night density transition: zero pedestrian wall hits and 128 vehicle exits.
- Browser WebGL programs linked successfully. Dry mode and reflection-off hide the reflection surface; damp mode enables it. The train hides during the 03:00 service closure.
- Browser audio activation reached a running context with 15 voices. A short sample at default volume measured peak RMS about 0.00195; mute reduced the measured RMS to about 0.0000011. These are functional measurements, not subjective headphone/speaker mastering.
- The station remains exterior-only to the player. Visible stairs/platform details do not implement walkable elevations, stops or boarding. After-rain surfaces do not implement rainfall or weather sound.
