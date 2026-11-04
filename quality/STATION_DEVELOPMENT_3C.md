# Station Development 3C — functional passenger boarding and alighting

Station visitors now make actual rail journeys. Outbound city pedestrians enter through the existing fare gates and stairs, wait for a train, walk through a real open doorway, occupy a standing position and travel away. Inbound riders arrive inside the train, alight first, descend through the existing station network, exit through the wide gate and resume city activity. Timed platform round trips have been replaced. All movement, capacity allocation, queues, door sensors and departure permission run in the existing deterministic **30 Hz** simulation.

## Inspection and preserved geometry

Reviewed [Station Development 2](./STATION_DEVELOPMENT_2.md), [3A](./STATION_DEVELOPMENT_3A.md), [3B](./STATION_DEVELOPMENT_3B.md) and the [3B.5 platform-access correction](./STATION_DEVELOPMENT_3B_5.md), plus the station navigation/traffic/layout, train operation/doors/presentation, city simulation/activity and human presentation implementations.

The three-car train remains **39.125 m** long, centered at x = **34.75**, z = **−57** when stopped. Its six south-side doorway centers remain x = **18.05, 25.25, 31.15, 38.35, 44.25, 51.45**. Every opening is **1.06 × 1.85 m**, platform and train sill y = **7.455**, with the normal **55 mm** gap between platform z = **−55.5** and train sill z = **−55.555**. All six approaches were checked again against actual uploaded station/train meshes and the navigation contract: **216 real rays, zero blocked rays**, at least **260 mm** clearance beyond the tested body radius, and matching sill elevations. All guards retained by 3B.5 remain in place.

The yellow warning strip and pale safe-waiting line retain their footprint and appearance. Their old raised box tops intersected shoes crossing the boarding approach. They now sit flush with the deck, with at most **1 mm** render separation, instead of presenting a 16 mm obstacle unrepresented by the walking surface. No station layout, railway, stair, canopy or city geometry was redesigned.

## Authoritative journeys and responsibilities

[RailPassengers.ts](../src/world/simulation/RailPassengers.ts) coordinates passenger exchange with [StationTraffic.ts](../src/world/simulation/StationTraffic.ts), [TrainOperation.ts](../src/world/simulation/TrainOperation.ts) and [TrainDoors.ts](../src/world/simulation/TrainDoors.ts). It uses the existing pedestrian pool; these are the same people rendered by [HumanPresentation.ts](../src/world/simulation/HumanPresentation.ts). No decorative passenger instances or separate visual timers are used.

```text
Outbound:
city → approaching → entering → gate-in → paid → ascending → platform
→ waiting → boarding → riding → off-map rail destination

Inbound:
off-map rail origin → riding → alighting → returning → descending
→ paid → gate-out → exiting → city / ordinary destination
```

The old random 15–35 second platform-return timer is removed. Waiting outbound passengers remain at their reserved supported destinations until train exchange can admit them. At service closure, unboarded visitors take the existing connected exit route; admitted transfers finish safely. No new station trips or inbound train loads are admitted outside **05:00–01:00**. An already committed train finishes its stop and withdraws as before.

Inbound people are created inside closed carriages only when the complete train is outside the abstract x = **−90…90** district boundary. Each service leg is loaded once. Outbound people remain real moving occupants until the train reaches an off-map turnback hold; only there are their journeys completed and their pool slots made reusable. This avoids appearance/disappearance on platforms or inside visible open doorways. Normal city population retirement/replacement continues at its existing destination boundaries.

Rail journey state carries a stable berth/door ID, trip direction, local carriage coordinates, physical waypoint path and path index. While riding, world X is **train X + berth local X** every fixed tick; world Y/Z remain on the carriage floor. Rendering copies those world coordinates and the existing walking/standing articulation. The normal street-height update cannot overwrite train-floor Y. Fresh passenger snapshots and bounded journey/event histories support inspection without exposing mutable path authority through snapshots.

## Capacity, approaches and queues

[RailPassengerGeometry.ts](../src/world/simulation/RailPassengerGeometry.ts) defines **12 standing positions**: two per platform doorway, four per car. They are intentionally a small observation capacity, rather than a claim about full-size commuter loading. Each is offset ±0.70 m along X from its doorway and z = track center −0.55 m. They remain within the real floor and clear of the doorway path. Berths are reserved before boarding starts and retained until the off-map destination. Duplicate occupancy and capacity excess are rejected by allocation.

Transfers use the existing world-space platform, edge, sill and interior anchors. The approach runs via the existing circulation lane at z = **−52.6**, avoiding other people's waiting positions. The two west doorways use the supported front strip at z = **−53.85** to bypass the stairwell and canopy posts. The path then crosses the **specific doorway's** short sill gap and enters its own carriage. It never adds ordinary navigation links across the track or through train walls. Every one of the twelve standing-position paths is validated in both directions.

There are six door-specific queues. Candidates are ordered by journey start time/ID and assigned an available doorway using walking distance and queue/occupancy load. Only the front candidate at a doorway can start. **All alighting completes before boarding starts.** Conflicting transfer paths acquire their complete geometric reservation atomically; disjoint paths can run concurrently. Regular station walkers yield before entering these reserved corridors, while existing local separation remains active. Admission requires a clear complete path, so waiting people are never pushed or teleported aside.

Transfer speed is **95%** of the pedestrian's normal speed (about **1 m/s**). Reservations use **0.62 m** clearance, with the existing **0.56 m** local following limit. Supported platform, exact door column/gap and real carriage floor are the only valid transfer surfaces. Ordinary pedestrians still exclude the track-edge hazard zone; its exception is limited to an admitted, protected door traversal.

To handle higher alighting throughput, the existing compact circulation reservations gained two focused corrections:

- Ascenders acquire the east turn and first waiting junction together and retain clearance through that junction.
- The shared unpaid gate approach is reserved through gate entry. Multi-resource fairness gives priority to the oldest **acquirable** request, allowing an exit flow to release a resource needed by an older blocked request.

These changes retain exclusive fare gates, the paid junction, opposing stair lanes and continuous graph movement. They remove stress-test gridlocks without relocating people, changing stair geometry or bypassing gates.

## Door and departure safety

New admission requires `DWELLING`, in-service admission hours, exactly zero velocity, accepted platform alignment, a clear platform approach, a fully open platform-side door, available standing capacity and a reserved clear path. North-side and closed/partial doorways never admit passengers. Admission ends at the boarding cutoff; an unfinished admitted traversal retains its reservation and train hold until its endpoint.

The existing **24 second** full-open dwell remains the minimum. If alighting consumes that interval, boarding gets a configurable grace window, default **12 seconds**, after the final alighter reaches the station network. Admission windows are measured in authoritative simulation seconds. A pending alighter or an admitted boarding/alighting traversal holds the train open; extensions are passenger-dependent, rather than an independent animation delay.

`TrainOperation.setPassengerHold(id, held)` records individual traversal and batch holds. Departure requires zero holds as well as all existing alignment, preparation and closed-door interlocks. A late hold during closing/preparation invokes safe reopening from the current leaf positions. The batch hold survives the tick when its final alighter completes, ensuring the train cannot skip boarding admission because of update order.

Doorway occupancy is submitted through the existing obstruction API under the **`passenger`** source. **`external`** sensor inputs remain separate and cannot be cleared by passenger updates. A person already crossing may clear their own occupied doorway; atomic path reservations prevent another person entering it. External obstructions pause admission/movement and keep the train held; clearing the input resumes continuous motion. Before and after each fixed tick, doorway sensors and unfinished-traversal holds are synchronized. Closing never runs through an active traversal, and motion cannot begin before every doorway is confirmed closed.

The boarding interface now exposes enabled conditional NPC access. Physical access flags remain tied to the authoritative door/stop geometry; the exchange controller additionally checks its admission phase, hours, queue, capacity and path reservation. [TrainDoorPresentation.ts](../src/world/simulation/TrainDoorPresentation.ts) retains its existing state-driven leaf animation. No announcements, audio, character models or HUD controls were added.

Constructor controls under `CitySimulation({ railPassengers: { … } })`:

| Setting | Default | Purpose |
| --- | --- | --- |
| `capacityPerDoor` | 2 | One or two supported standing positions per doorway; total 6 or 12. |
| `arrivingPassengers` | Time-of-day demand, 2–6 | Optional fixed inbound load for validation; must fit capacity. |
| `stationDemand` | 0.34 | Existing seeded station-choice probability; existing time-of-day waiting admission limit remains 2–8. |
| `boardingGraceSeconds` | 12 | Admission opportunity after alighting when minimum dwell has elapsed. |

The 30 Hz accumulator uses a **10 ns** arithmetic tolerance to consume the same tick count when equal elapsed time is partitioned into 144 Hz, 30 Hz, 2 Hz or irregular frames. No simulation ticks are discarded and no camera-dependent train clock is introduced.

## Actual browser evidence

[station3c-browser-checks.mjs](../tools/station3c-browser-checks.mjs) advances the actual live simulation and uses the existing 1920 × 1080 capture endpoint. It changes camera framing and advances normal updates; it never assigns passenger positions, train positions, door fractions or scene visibility. All ten captures were inspected. [Measurements](./station3c-measurements.json) and paired capture JSON include train/door state, positions, speed, stopping error, passenger/queue/hold state, simulation clock and actual camera.

| Live capture | Simulation clock (s) | Train state | What it demonstrates |
| --- | ---: | --- | --- |
| [Approaching and waiting](./captures/station3c-approaching-and-waiting.png) | 373.900 | APPROACHING, 4 m/s | People remain behind the edge while the train approaches. |
| [Alighting threshold](./captures/station3c-alighting-threshold.png) | 395.333 | DWELLING, 0 m/s | Inbound pedestrian 4, visit 24, passes through door car-1-south-1. |
| [Alighting platform](./captures/station3c-alighting-platform.png) | 395.933 | DWELLING | The same person continues onto the platform. |
| [Boarding approach](./captures/station3c-boarding-approach.png) | 423.200 | DWELLING | Outbound pedestrian 33, visit 10, begins a protected approach after alighting. |
| [Boarding threshold](./captures/station3c-boarding-threshold.png) | 432.300 | DWELLING | The same outbound person physically enters door car-2-south-2. |
| [Standing inside](./captures/station3c-boarded-interior.png) | 435.000 | DWELLING | Occupied standing position at (37.65, 7.455, −57.55). |
| [Doorways clear](./captures/station3c-clear-doorways.png) | 438.700 | DEPARTURE WARNING | Zero transfers and zero passenger holds; riders stand clear inside. |
| [Doors secured](./captures/station3c-doors-secured.png) | 444.067 | PREPARING DEPARTURE | Every door closed; rider remains visible through real door glazing. |
| [Riding away](./captures/station3c-riding-away.png) | 449.700 | ACCELERATING, 1.0149 m/s | Rider world X = 38.603456, train X = 35.703456: retained local offset 2.9 m. |
| [Alighter resumes city](./captures/station3c-alighter-resumes-city.png) | 480.800 | RUNNING | Pedestrian 4 has descended, exited the wide gate and rejoined the forecourt at (14.2, 0.115, −45). |

Stationary exchange occurs at train x = **34.75**, stopping error **0**. The inbound tracked journey completes its real station/city route; the outbound tracked journey completes only after travelling to the off-map rail destination. Their full histories are in the measurements.

The independent generated-world run uses actual building/prop bounds and doors, **1,200 open seconds plus 600 closure-drain seconds** at seed 8412:

| Measured result | Value |
| --- | ---: |
| Arrivals / secured departures | **8 / 8** |
| Outbound boardings / off-map deliveries | **24 / 24** |
| Inbound origins / completed alightings | **48 / 48**, eight through each operating doorway |
| Station journeys started / completed after closure | **80 / 80** |
| Physical boarding / alighting threshold crossings | **24 / 48** |
| Maximum simultaneous physical transfers | **5** |
| Moving-rider samples | **106,350** |
| Maximum rider-to-train offset error | **1.43 × 10⁻¹⁴ m** |
| Minimum passenger center separation | **0.5601 m** |
| Maximum transfer/ordinary station displacement per tick | **0.044990 m** |
| Invalid positions / unsafe crossings / overlaps | **0 / 0 / 0** |
| Unsafe departures / capacity violations / gate conflicts | **0 / 0 / 0** |
| Ground wall hits / pedestrian-vehicle overlaps | **0 / 0** |
| Remaining journeys / reservations after closure | **0 / 0** |
| Vehicle exits / longest continuous movement wait | **334 / 16.967 s** |
| Twelve rendered standing-position routes | **8,851 volume samples; zero intersections** |
| Actual human/solid checks near thresholds | **57 snapshots, 3,472 body-part instances; zero intersections**, 3 mm numerical tolerance |
| Page exceptions / failed shader links / asset errors | **0 / 0 / 0** |

## Automated tests and reproduction

[train-passengers.test.mjs](../tests/train-passengers.test.mjs) adds six focused regressions: all berth/door paths in both directions; repeated real journeys and traffic safety; empty and maximum-load services; a 60-second external obstruction during an actual crossing, including service closure; held dwell/late reopening/source separation; and exact full-state replay across frame partitions. Stress cases use seed 193 with **zero inbound / capacity 6 / maximum station demand** and **12 inbound / capacity 12 / high station demand**, each for **900 open + 900 closed seconds**, with complete drainage. Replay uses seed 42. Existing station tests retain the gate/stair/pose and city safety assertions and now verify the two real journey types rather than the obsolete timed round trip.

[station3c-validation.mjs](../tools/station3c-validation.mjs) independently checks continuous movement, crossing permissions, floor positions, pair separation, unique berths, rider offsets, departure safety, gate ownership, traffic safety, alighting priority and lifecycle completion.

Required checks pass:

```text
npm.cmd run check
npm.cmd test          # 55 passed
npm.cmd run build
```

TypeScript editor diagnostics are clean. The inherited nonfatal Three.js bundle-size advisory remains. No new FPS claim is made.

With the existing Vite task running, reload the shared browser and execute:

```js
const review = await (await import('/tools/station3c-browser-checks.mjs')).review();
// Writes quality/station3c-measurements.json and ten actual PNG/JSON capture pairs.
window.__shinmachi.setReviewPaused(false);
```

The review pauses automatic stepping while explicitly advancing the same live authoritative state. Earlier milestone reports/captures retain their historical boundaries; their old timed-visitor/disabled-boarding review assumptions are superseded by this harness.

## Limitations

- Exchange reservations are deliberately conservative and cover complete paths. Some people wait for another service when their route is occupied or admission closes; an admitted person is never removed to recover throughput. The verified maximum-load cases drain without permanent deadlocks.
- Capacity is a small standing-position abstraction, without detailed furnishing, seated poses, crowd packing or a full body dynamics solver. Existing opaque static window silhouettes remain; real passengers are visible through open doorways and transparent door glazing.
- Origins/destinations and turnbacks remain the existing off-map railway abstraction. No new line, station or district is modeled. The inherited building overlap beyond the platform frontage remains outside the station exchange area.
- This implements NPC rail journeys. Player walking remains governed by the existing station controller; player train-riding controls are not introduced.
