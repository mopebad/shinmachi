# Living city intelligence and behavioral realism

Implemented in stages A–E on the existing city, with the existing deterministic 30 Hz accumulator, map, tower, station, train doors, capacity model and safety interlocks retained. The preceding vehicle-family work is described in [Hero Street 2A](./HERO_STREET_2A_VEHICLES.md).

## Audit and changes

| Existing source of repetition | Implemented change |
| --- | --- |
| Clothing and accessories selected by reusable population slot | Immutable seeded birth identity, seven journey purposes, independent appearance palette, build, hair, footwear and personal preferences |
| Abrupt starts and direction changes | Personal walking acceleration/deceleration and turn rates; stop intent follows remaining distance; safety can always restrict movement |
| Similar gait and idle poses | Independent initial phases and cadence, distance-driven gait, actual velocity blending, planted world-space feet and connected two-bone legs; stopped feet lift and settle into a narrow stance |
| Generic threshold visits | Purpose/time-weighted business destinations; commuters and station-bound people consider real rail trips at public waypoints |
| No optional frontage behavior | Reserved, collision-checked frontage pockets with approaching → acting → returning states; original route and next waypoint remain intact |
| Crowds blocking shared corners | Keep-left passing, hard body separation, yielding to crossing occupants and a validated graph detour when a corner makes no progress |
| Independent walkers | Lightweight companion pairs with independent gait, loose following and separation when routes diverge; short two-person conversations in reserved pockets |
| Uniform driving | Persistent profiles for all fourteen families, different preferred speed, acceleration, braking, following gap/headway, turn speed and steering response |
| Render-timed indicators | Authoritative pre-turn indication, per-driver blink phase, cancellation after the rear clears the bend; brake lamps read actual deceleration or stopped foot brake |
| Generic traffic hiss | Six original synthesized engine characters, actual acceleration/coasting load, wet-tire response, spatial footsteps, quiet indicator clicks and chatter positioned at people/open restaurants |

Core code: [identities](../src/world/simulation/AgentIdentity.ts), [locomotion](../src/world/simulation/Locomotion.ts), [walking pose](../src/world/simulation/WalkingPose.ts), [street activities/social state](../src/world/simulation/StreetLife.ts), [driving/lights](../src/world/simulation/Driving.ts), [simulation integration](../src/world/simulation/CitySimulation.ts), [human presentation](../src/world/simulation/HumanPresentation.ts), [vehicle presentation](../src/world/simulation/VehiclePresentation.ts), [audio mix](../src/world/audio/AudioMix.ts), [soundscape](../src/world/audio/CitySoundscape.ts).

## Behavioral and safety contracts

Birth traits use separate seeded streams, so a reusable render slot does not become a person's identity. Preferences never override signals, collisions, reservations, door sensors or train interlocks. Street gait uses actual travelled distance, and riding passengers do not generate walking cycles. Existing station tread placement and stair reservations remain authoritative. Character detail is reduced beyond 35 m using the existing bounded instanced pools.

Street activities are phone use, browsing, restaurant waiting, looking around and conversation. Twelve frontage pockets pass collision-volume and approach-segment checks in the reviewed seed. Each provides one or two reserved standing places at |x| = 5.55 m, outside the through-walking lane. No optional zone is created in a crossing, gate, stair, platform or train doorway. Closure/retirement cancels an activity into its return phase; a blocked approach also returns safely. Activities have bounded duration, a cooldown and a retained route; they do not teleport agents or invent shop interiors.

Companions form from nearby compatible routes. The leader can slow briefly for a lagging partner, using that person's preferred personal spacing as its following tolerance. Crossing and station reservations retain priority, and pairs split when routes or circumstances diverge. Conversations face the other reserved position, use independent gestures, then return to each person's route. These are lightweight social interactions, not persistent relationships or dialogue generation.

Vehicle speed is capped at 6.1 m/s (about 22 km/h), with family-specific lower turning speeds. A discrete stopping envelope accounts for the next integration step. Drivers either stop before the line or commit on green when braking safely before amber would no longer be possible. Occupancy interlocks protect committed vehicles. Wheels follow authoritative route distance, and steering is rate-limited. This city still supports straight and left-turn routes only.

Head/tail lamps respond to darkness and the actual damp/dry setting, including paused time changes. Brake lamps follow actual deceleration or a stopped foot brake. Turn indicators begin at least 14 m or approximately three seconds before the bend and cancel once the rear clears it. There are no arbitrary hazard flashes.

The road graph has four approaches and no connected curb bay, taxi rank or loading route. The existing parking court is not connected to vehicle routing. Delivery/taxi pull-ins and hazard-stop scenarios are therefore **not implemented**, using the task's explicit allowance for unsupported geometry. Normal signal stops are not described as delivery completions. Adding such stops safely needs a separately validated bay and entry/exit route.

## Audio

All audio is original local synthesis; there are no recorded engines, Tokyo field recordings, speech assets or generated dialogue. It starts only after the existing sound gesture and fades when the page is hidden. Four stable vehicle birth IDs own traffic voices; each combines class harmonics, acceleration-dependent engine load, coasting and movement/wetness-dependent tire noise. Eight reusable spatial impact channels read actual footfall counters, footwear, stair context and surface wetness. Chatter is attached to nearby real people/conversations and the two nearest open restaurant thresholds. Station/train sound continues to read service and movement state; vending/vent and distant city ambience are retained.

The pool contains 23 logical voice channels, including eight short impact channels. Each traffic voice retains the 0.045 engine+tire gain budget and fades to silence at 32 m; tiny indicator clicks use the same car position. Gains are smoothed. The capture stream branches from the application's own mixed output and never requests a microphone. The compatibility WAV is a mono downmix; live application output retains its spatial HRTF processing. Browser rAF observes sound events; it cannot change simulation state. Audio waveform phase follows the Web Audio sample clock; deterministic simulation replay does not imply bit-identical recordings at different render frame rates. This is a functional procedural soundscape, not a mastered recording-quality sound library.

## Automated validation

`npm.cmd run check`, `npm.cmd test` and `npm.cmd run build` passed. **68 tests passed**, including eight new behavior tests and an additional audio test. Coverage includes immutable bounded traits, actual-distance gait and stationary foot placement, deterministic 30/144 Hz replay with shop activities, acceleration/braking bounds, pre/during/post-turn lights, wet/day/night lamps, safe optional locations, route retention, separation, completion and engine/load/tire mixing. Existing traffic footprint/signal tests and station boarding, capacity, obstruction recovery, closure and frame-partition replay tests remain passing. Vite retains its existing Three.js chunk-size advisory.

The [generated-world audit](./behavior-generated-audit.json) ran 600 s at 20:30 followed by 600 s at 03:00, at 30 Hz, with the actual generated collision volumes, storefronts and station:

| Measurement | Result |
| --- | ---: |
| Fixed steps | 36,000 |
| Vehicle exits | 147 |
| Pedestrian overlaps / wall hits / road excursions | 0 / 0 / 0 |
| Minimum horizontal body separation | 0.515000 m |
| Maximum non-rider horizontal speed | 1.471421 m/s |
| Maximum braking excess over personal comfort bound | < 2×10⁻¹⁴ m/s² (floating-point noise) |
| Optional activities returned/completed | 77/77, including two safely cancelled early |
| Conversations | 7 |
| Maximum concurrent optional activities | 7 |
| Invalid optional locations | 0 |
| Station journeys completed | 37/37 |
| Boarded / alighted / delivered off-map | 11 / 20 / 11 |
| Arrival/departure cycles | 4 |
| Unsafe departures, transfers, capacity violations or gate conflicts | 0 |
| Remaining rail/station passengers or reservations after closure drain | 0 |

The focused rail suite separately tests higher demand, empty/full services, all six doors, delayed transfers, interrupted closing, closure and multiple seeds. The generated audit is a bounded sample, not a proof for every possible seed or unlimited runtime.

A separate [600-second generated-traffic audit](./behavior-traffic-audit.json) recorded 109 vehicle exits, zero oriented-footprint overlaps, zero red-light commitments and zero lane errors. It also observed all five optional action kinds: 17 phone, 8 browse, 23 restaurant-wait, 6 look-around and 6 conversation participants. Driver braking remained within its personal bound apart from floating-point noise.

During development, strict separation initially caused corner deadlocks, and changed destination weighting reduced rail demand enough to fail the previous exchange-count regression. Both failures were investigated and corrected without weakening those tests: crossing occupants receive priority, blocked routes can take a physical detour, and commuter/station purposes consider rail trips at public waypoints. Close-up inspection also caught the frozen-stride idle stance, which now settles by lifting each foot.

## Browser evidence

Open the [recording player](./BEHAVIOR_REVIEW.html) through the running development server (`http://127.0.0.1:5173/quality/BEHAVIOR_REVIEW.html`). It pairs the actual MP4 video with its synchronized PCM WAV track. This host can encode Opus but cannot decode Opus inside MP4; the separate uncompressed audio preserves the actual application mix and avoids claiming a silent embedded playback as audio validation. The player mutes the embedded track and synchronizes the WAV to play, pause, seek and playback rate.

The locked reference is preset **Shinmachi Hero Street**, seed 8412, eye [4.7, 1.82, 43], target [-1, 5, -25], vertical FOV 60°, time 20:30, After Rain, wetness 0.64, reflections and contact shading enabled. The matching before/after captures replay to simulation clock 300 and use actual 1920×1080 WebGL output. Population and traffic locations legitimately differ because behavioral decisions changed; camera, architecture and rendering conditions match.

- [Before](./captures/behavior-hero-before.png) / [after](./captures/behavior-hero-after.png), with adjacent capture metadata.
- [Hero live sequence](./captures/behavior-hero-sequence.mp4): actual motion from the locked camera, with the application's own spatial audio.
- [Phone sequence](./captures/behavior-phone-sequence.mp4): approach, stationary use, return and resumption of the saved route.
- [Conversation sequence](./captures/behavior-conversation-sequence.mp4): two real agents reserve clear positions, face/gesture, then leave independently.
- [Braking sequence](./captures/behavior-traffic-braking-sequence.mp4) and [complete indicated turn](./captures/behavior-traffic-turn-sequence.mp4): actual deceleration and foot brake, then green-light acceleration, turning, indicator cancellation and normal running.
- [Daytime companions](./captures/behavior-companions-day-sequence.mp4), [station circulation](./captures/behavior-station-sequence.mp4) and [residential time/surface comparison](./captures/behavior-residential-time-sequence.mp4).

Every recording has an adjacent WAV and a JSON trace sampled approximately twice per second, including persistent IDs, XYZ positions, actual speeds, activities, companions, vehicle acceleration/lights/steering, train state and measured audio RMS/event counters. These are real-time canvas recordings of the running city, not image animations. Capture uses the browser's supported MP4 video codec and a temporary bounded PCM tap; the dev endpoint remains bounded to 16 MB per request. Navigation input is suppressed only during each short recording and restored in a finally block. Supplementary close-ups follow an actor; the hero and residential cameras are locked. The dev-only PCM compatibility tap uses ScriptProcessorNode and produces a browser deprecation warning; it is not part of normal gameplay audio.

Reproduction uses [browser checks](../tools/behavior-browser-checks.mjs) and [focused audits](../tools/behavior-validation.mjs). Load `http://127.0.0.1:5173/?view=8&seed=8412&review=1`, enable sound, import the browser helper and run `generatedAudit(window.__shinmachi)` or `record(window.__shinmachi, 'review-name', 20)`. Set the framing/clock first; `record` uses live simulation time and pauses afterward. Resume normal operation with `window.__shinmachi.setReviewPaused(false)`. Source edits reload the application, so finish editing before recording.

The [media validation](./behavior-media-validation.json) independently decoded and sought all eight MP4 files and decoded all eight WAV files. Every WAV contains nonzero, unclipped audio. Hero and residential camera drift is exactly zero in their state traces. The final turn clip follows van birth 59 from a stopped brake at clock 347 through green, the indicated bend and cancellation, ending at clock 362.967 at 5.584 m/s with brake and indicator off. Individual capture clocks are retained in the [recording index](./behavior-recording-index.json); actor-following cameras deliberately move. A few earlier takes were discarded for hidden-tab pauses or invalid playback. The final clips expose both wall/media duration and actual simulation time; the application still pauses simulation whenever the host hides the view.

## Performance sample

The [matching-resolution render sample](./behavior-after-measurements.json), at clock 300 and 1521×889, used the same eight warmups and 30 synchronous `gl.finish` composite renders as the [baseline](./behavior-before-measurements.json): median **7.2 ms** versus **7.5 ms**, with p95 **8.2 ms** versus **8.8 ms**. The new snapshot has 1,111 draw calls and 5,004,653 triangles (baseline 1,160 and 5,078,297). Populations differ by two people, so this small change should be read as comparable rendering cost, not a proven speedup.

The separate [five-second live frame sample](./behavior-frame-timing.json), with simulation running, measured **118.7 aggregate FPS**, median **8.3 ms**, p95 **12.5 ms**, and worst **16.7 ms**, at 1323×889, pixel ratio 1 on the reviewed RTX 5070 Ti/Electron host. These are measured browser frame intervals, not isolated GPU timings or a guarantee for other machines. Optional decisions run on fixed simulation ticks, social matching is throttled to two seconds, event/history arrays are capped, and sound/render pools remain bounded.

## Limits and follow-up

The map and route architecture are unchanged. Optional activities use exterior pockets, companions have simple local compatibility, and no full-day personal schedules or persistent relationships are claimed. Dense corners can still cause visible hesitation and detours; the tested population drains safely. The existing small pavement/road elevation changes remain, with authoritative ground-height sampling and existing station stair IK. Not every decorative prop has a city-wide collision volume, so reviewed activity pockets are deliberately conservative.

Safe loading/taxi bays, richer recorded audio and further gait/turn polish are useful follow-ups. Any new curb stop must first provide a physically connected bay, pedestrian clearance and a tested re-entry maneuver. Audio quality needs a separate headphone listening/mastering pass before being presented as finished sound design.
